#!/usr/bin/env python3
"""Build the static JSON the Atlas app reads, from the verified CSVs in data/.

Run from the repo root:  python3 scripts/pipeline/build_data.py

Outputs (all under public/data/):
  investigations.json   24 PSI records plus pillar, hardware family, dataset summary
  datasets/<psi>.json   one typed table (or downsampled series set) per investigation
  datasets/index.json   list of datasets with row counts
  tests.json            1,900-row unified table with canonical materials and ppO2
  analytics.json        precomputed statistics shown in the UI (every figure is reproducible here)
  material_map.json     raw fuel label -> canonical material, so the cleaning is auditable

Nothing here invents values. Missing stays null. Derived columns are labelled as such.
"""
import json
import math
import os
import re
import glob

import numpy as np
import pandas as pd

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA = os.path.join(ROOT, 'data')
OUT = os.path.join(ROOT, 'public', 'data')
os.makedirs(os.path.join(OUT, 'datasets'), exist_ok=True)
RNG = np.random.default_rng(20261114)

# Pillars and hardware families follow the challenge brief. Anything the brief does not
# place under prevention, detection or suppression is "context".
PILLAR = {
    'PSI-25': 'prevention', 'PSI-26': 'prevention', 'PSI-98': 'prevention', 'PSI-99': 'prevention',
    'PSI-100': 'prevention', 'PSI-20': 'prevention', 'PSI-62': 'prevention',
    'PSI-101': 'detection', 'PSI-102': 'detection', 'PSI-115': 'detection', 'PSI-47': 'detection',
    'PSI-69': 'suppression', 'PSI-68': 'suppression',
}
HARDWARE = {
    'PSI-10': 'ACME in CIR', 'PSI-20': 'ACME in CIR', 'PSI-21': 'ACME in CIR', 'PSI-22': 'ACME in CIR',
    'PSI-23': 'ACME in CIR', 'PSI-159': 'ACME in CIR',
    'PSI-69': 'MDCA in CIR', 'PSI-68': 'MDCA in CIR', 'PSI-39': 'MDCA in CIR',
    'PSI-25': 'MSG flow duct', 'PSI-26': 'MSG flow duct', 'PSI-107': 'MSG flow duct', 'PSI-106': 'MSG flow duct',
    'PSI-98': 'Saffire (Cygnus)', 'PSI-99': 'Saffire (Cygnus)', 'PSI-100': 'Saffire (Cygnus)',
    'PSI-101': 'Smoke instruments', 'PSI-102': 'Smoke instruments', 'PSI-47': 'Smoke instruments',
    'PSI-115': 'Smoke instruments',
    'PSI-117': 'Ground and modeling', 'PSI-142': 'Ground and modeling', 'PSI-62': 'Ground and modeling',
    'PSI-60': 'Ground and modeling',
}
META_DROP = {'experiment', 'platform', 'psi_id', 'record_kind', 'evidence_type', 'source_file',
             'source_row_or_page', 'secondary_source_file', 'secondary_source_location', 'burning_rate',
             'spread_rate_mm_s_unused'}
UNIT_HINTS = [
    (r'_mm_s$', 'mm/s'), (r'_mm2_s$', 'mm²/s'), (r'_cm_s$', 'cm/s'), (r'_mg_s$', 'mg/s'), (r'_sccm$', 'sccm'),
    (r'_kpa', 'kPa'), (r'_percent$', '%'), (r'_pct$', '%'), (r'_mm$', 'mm'), (r'_sec$', 's'), (r'_s$', 's'),
    (r'_k$', 'K'), (r'_c$', '°C'), (r'_atm$', 'atm'), (r'_mmhg$', 'mmHg'), (r'_ppm$', 'ppm'), (r'_w$', 'W'),
    (r'_g$', 'g'), (r'_min$', 'min'), (r'_bar$', 'bar'),
]


def sig(v, n=6):
    if v is None or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))):
        return None
    return float(f'{v:.{n}g}')


def unit_of(key):
    for pat, u in UNIT_HINTS:
        if re.search(pat, key):
            return u
    return ''


def label_of(key):
    raw = key.startswith('src_')
    k = key[4:] if raw else key
    k = re.sub(r'_(mm_s|mm2_s|cm_s|mg_s|sccm|kpa|percent|pct|mm|sec|s|k|c|atm|mmhg|ppm|w|g|min|bar)$', '', k)
    k = k.replace('_', ' ').strip()
    k = k[:1].upper() + k[1:]
    return k + (' (raw)' if raw else '')


def load_investigations():
    return json.load(open(os.path.join(DATA, 'investigations.json')))


def psi_files():
    out = {}
    for f in glob.glob(os.path.join(DATA, 'psi_*.csv')):
        b = os.path.basename(f)[:-4]
        m = re.match(r'psi_(\d+)(_series|_sessions)?$', b)
        if not m:
            continue
        out.setdefault('PSI-' + m.group(1), {})[(m.group(2) or '_main').strip('_')] = f
    return out


def type_columns(df):
    cols = []
    for c in df.columns:
        if c in META_DROP:
            continue
        s = df[c]
        n = int(s.notna().sum())
        if n == 0:
            continue
        num = pd.to_numeric(s, errors='coerce')
        if num.notna().sum() >= 0.8 * n and not c.endswith(('_id', 'test_id')):
            cols.append((c, 'num'))
        else:
            nun = s.dropna().astype(str).nunique()
            avg = s.dropna().astype(str).str.len().mean()
            cols.append((c, 'cat' if (nun <= 60 and avg <= 48) else 'text'))
    return cols


def decimate(y, cap=240):
    """Min/max decimation keeps peaks. Returns (x, y) with original 1-based indices."""
    n = len(y)
    x = np.arange(1, n + 1)
    if n <= cap:
        return x.tolist(), y.tolist()
    b = cap // 2
    edges = np.linspace(0, n, b + 1).astype(int)
    xs, ys = [], []
    for i in range(b):
        seg = y[edges[i]:edges[i + 1]]
        if len(seg) == 0:
            continue
        lo, hi = int(np.argmin(seg)), int(np.argmax(seg))
        for j in sorted({lo, hi}):
            xs.append(int(edges[i] + j + 1))
            ys.append(float(seg[j]))
    return xs, ys


def build_dataset(pid, files, inv):
    main = pd.read_csv(files['main'], low_memory=False)
    out = {'id': pid, 'name': inv['name'], 'source_file': os.path.basename(files['main'])}
    if set(main.columns) == {'series_id', 'source_row_or_page', 'value'}:
        meta = pd.read_csv(files['series'], low_memory=False) if 'series' in files else pd.DataFrame()
        meta_by = {r['series_id']: r for r in meta.to_dict('records')} if len(meta) else {}
        series = []
        for sid, g in main.groupby('series_id', sort=True):
            y = pd.to_numeric(g['value'], errors='coerce').dropna().to_numpy()
            if len(y) == 0:
                continue
            x, yy = decimate(y)
            m = {k: (None if (isinstance(v, float) and math.isnan(v)) else v) for k, v in meta_by.get(sid, {}).items()
                 if k not in ('series_id', 'outcome') and not str(k).startswith('source') and v == v}
            series.append({'id': sid, 'n': int(len(y)), 'x': x, 'y': [sig(v) for v in yy], 'meta': m,
                           'stats': {'min': sig(float(y.min())), 'max': sig(float(y.max())), 'mean': sig(float(y.mean()))}})
        out['kind'] = 'series'
        out['series'] = series
        out['rows'] = int(len(main))
        out['columns'] = []
        return out
    cols = type_columns(main)
    columns, data = [], []
    for c, t in cols:
        s = main[c]
        if t == 'num':
            v = pd.to_numeric(s, errors='coerce')
            col = {'key': c, 'label': label_of(c), 'type': 'num', 'unit': unit_of(c), 'raw': c.startswith('src_'),
                   'n': int(v.notna().sum()), 'nuniq': int(v.nunique()), 'min': sig(v.min()), 'max': sig(v.max()),
                   'mean': sig(v.mean()), 'median': sig(v.median())}
            data.append([sig(x) for x in v.tolist()])
        else:
            vv = s.where(s.notna(), None)
            st = vv.dropna().astype(str).str.strip()
            top = st.value_counts().head(12)
            col = {'key': c, 'label': label_of(c), 'type': t, 'raw': c.startswith('src_'), 'n': int(len(st)),
                   'nuniq': int(st.nunique()), 'top': [[k, int(v)] for k, v in top.items()]}
            lim = 400 if t == 'text' else 120
            data.append([None if (x is None or (isinstance(x, float) and math.isnan(x))) else str(x).strip()[:lim] for x in vv.tolist()])
        columns.append(col)
    out['kind'] = 'table'
    out['columns'] = columns
    out['cols'] = [c['key'] for c in columns]
    out['data'] = data  # column-major to keep JSON small
    out['rows'] = int(len(main))
    out['provenance'] = {
        'file': [str(x) for x in main['source_file'].dropna().unique()[:6]] if 'source_file' in main else [],
        'refs': [str(x) for x in main['source_row_or_page'].tolist()] if 'source_row_or_page' in main else [],
    }
    return out


# ---------------------------------------------------------------- canonical materials
ROD_MM = {'1/4': 6.35, '3/8': 9.525, '1/2': 12.7, '0.5': 12.7}


def canon(exp, fuel, geom):
    f = str(fuel).lower().strip() if isinstance(fuel, str) else ''
    g = geom if isinstance(geom, str) else ''
    if exp in ('BASS', 'BASS-II', 'SAFFIRE-I', 'SAFFIRE-II', 'SAFFIRE-III'):
        if re.search(r'wax|candle|parr?af', f):
            return 'Paraffin or Japan wax', ('candle' if 'candle' in f else 'slab'), None
        if 'rod' in f:
            m = re.search(r'(1/4|3/8|1/2|0\.5)', f)
            tone = 'black' if 'black' in f or 'blac ' in f else 'clear' if 'clear' in f else 'unspecified'
            return f'PMMA ({tone})' if tone != 'unspecified' else 'PMMA', 'rod', ROD_MM.get(m.group(1)) if m else None
        if 'film' in f or 'micron' in f:
            return 'PMMA', 'film', None
        if 'sphere' in f or 'spherical' in f:
            return 'Sphere (material not stated)', 'sphere', None
        if 'pmma' in f:
            return 'PMMA', g or 'unspecified', None
        if 'sibal' in f:
            return 'SIBAL fabric', 'fabric', None
        if 'nomex' in f:
            return 'Nomex', g or 'fabric', None
        if 'ultem' in f:
            return 'Ultem', 'sheet', None
        if 'silicone' in f:
            return 'Silicone', g or 'unspecified', None
        return (str(fuel) if f else 'Not stated'), g or 'unspecified', None
    if exp == 'FLEX':
        return f.capitalize(), 'droplet', None
    if exp == 'CFI':
        if 'iso-dodecane' in f:
            return 'n-dodecane / iso-dodecane blend', 'droplet', None
        if 'c12h26' in f:
            return 'n-dodecane', 'droplet', None
        return str(fuel).capitalize(), 'droplet', None
    if f:
        return str(fuel), g or 'gas burner', None
    return 'Not stated', g or 'unspecified', None


def build_tests():
    d = pd.read_csv(os.path.join(DATA, 'combined.csv'))
    d['psi_id'] = d['source_file'].str.extract(r'^(PSI-\d+)')[0]
    mats, forms, dias = [], [], []
    for r in d.itertuples():
        m, fm, dia = canon(r.experiment, r.fuel, r.fuel_geometry)
        mats.append(m); forms.append(fm); dias.append(dia)
    d['material'] = mats; d['form'] = forms; d['rod_diameter_mm'] = dias
    d['pillar'] = d['psi_id'].map(PILLAR).fillna('context')
    d['ppo2_kpa'] = d['o2_percent'] * d['pressure_kpa'] / 100.0
    cls = {'ignited': 'flame', 'extinguished': 'no_flame', 'no_ignition': 'no_flame', 'burned_out': 'burned_out'}
    d['outcome_class'] = d['outcome'].map(cls).fillna('unknown')
    keep = ['psi_id', 'experiment', 'test_id', 'platform', 'gravity_g', 'fuel', 'material', 'form', 'rod_diameter_mm',
            'fuel_thickness_mm', 'o2_percent', 'pressure_kpa', 'ppo2_kpa', 'flow_velocity_cm_s', 'flow_direction',
            'outcome', 'outcome_class', 'spread_rate_mm_s', 'extinction_reason', 'pillar', 'source_file', 'source_row_or_page']
    t = d[keep]
    out = {'cols': keep, 'data': [[sig(x) if isinstance(x, (int, float, np.floating, np.integer)) and not isinstance(x, bool) else (None if (isinstance(x, float) and math.isnan(x)) else x)
                                   for x in t[c].tolist()] for c in keep], 'n': int(len(t))}
    mm = d.groupby(['experiment', 'fuel', 'material', 'form'], dropna=False).size().reset_index(name='n')
    mm = [{'experiment': r.experiment, 'raw_label': None if pd.isna(r.fuel) else r.fuel, 'material': r.material,
           'form': r.form, 'n': int(r.n)} for r in mm.itertuples()]
    json.dump(mm, open(os.path.join(OUT, 'material_map.json'), 'w'), indent=1)
    return d, out


# ---------------------------------------------------------------- analytics
def ols(X, y):
    return np.linalg.lstsq(X, y, rcond=None)[0]


def loo_rmse(X, y):
    err = []
    for i in range(len(y)):
        m = np.ones(len(y), bool); m[i] = False
        b = ols(X[m], y[m]); err.append((y[i] - X[i] @ b) ** 2)
    return float(np.sqrt(np.mean(err))), np.array(err)


def boot_ci(X, y, fn, B=2000):
    vals = []
    n = len(y)
    for _ in range(B):
        idx = RNG.integers(0, n, n)
        try:
            vals.append(fn(ols(X[idx], y[idx])))
        except Exception:
            pass
    v = np.array(vals)
    return [sig(float(np.percentile(v, 2.5))), sig(float(np.percentile(v, 97.5)))]


def scaling_gate():
    """Can PSI separate ppO2 scaling from O2-mole-fraction scaling? Fit ln D_ext on ln xO2, ln p, ln d0."""
    res = {}
    f = pd.read_csv(os.path.join(DATA, 'psi_69.csv'), low_memory=False)
    pick = lambda pre: next(c for c in f.columns if c.startswith(pre))
    ren = {pick('src_o_initial_ambient'): 'xo2', pick('src_co_initial_ambient'): 'xco2', pick('src_he_initial_ambient'): 'xhe'}
    f = f.rename(columns=ren)
    for c in ['xo2', 'xco2', 'xhe', 'pressure_kpa', 'visible_flame_extinction_diameter_mm', 'initial_droplet_diameter_mm']:
        if c in f.columns:
            f[c] = pd.to_numeric(f[c], errors='coerce')
    e = f[(f.outcome == 'extinguished') & (f.visible_flame_extinction_diameter_mm > 0) & (f.pressure_kpa > 20)]
    e = e.dropna(subset=['xo2', 'pressure_kpa', 'visible_flame_extinction_diameter_mm', 'initial_droplet_diameter_mm'])
    out = {'dataset': 'PSI-69 FLEX', 'response': 'visible flame extinction diameter (mm)', 'fuels': {}}
    for fuel, g in e.groupby('fuel'):
        y = np.log(g.visible_flame_extinction_diameter_mm.to_numpy())
        lx = np.log(g.xo2.to_numpy()); lp = np.log(g.pressure_kpa.to_numpy()); ld = np.log(g.initial_droplet_diameter_mm.to_numpy())
        one = np.ones(len(y))
        models = {
            'O2 fraction only': np.column_stack([one, lx]),
            'ppO2 only': np.column_stack([one, lx + lp]),
            'O2 fraction + pressure': np.column_stack([one, lx, lp]),
            'O2 fraction + pressure + droplet size': np.column_stack([one, lx, lp, ld]),
        }
        r = {'n': int(len(y)), 'sd_lnD': sig(float(y.std())), 'loo_rmse': {}}
        for k, X in models.items():
            r['loo_rmse'][k] = sig(loo_rmse(X, y)[0], 4)
        X = models['O2 fraction + pressure + droplet size']
        b = ols(X, y)
        r['coef'] = {'ln_xO2': sig(float(b[1])), 'ln_p': sig(float(b[2])), 'ln_d0': sig(float(b[3]))}
        r['ci95'] = {'ln_xO2': boot_ci(X, y, lambda b: b[1]), 'ln_p': boot_ci(X, y, lambda b: b[2]),
                     'ln_p_minus_ln_xO2': boot_ci(X, y, lambda b: b[2] - b[1]), 'ln_d0': boot_ci(X, y, lambda b: b[3])}
        lo, hi = r['ci95']['ln_p'];  dlo, dhi = r['ci95']['ln_p_minus_ln_xO2']
        r['rejects_fraction_only'] = bool(lo > 0 or hi < 0)        # b_p = 0
        r['rejects_ppO2_only'] = bool(dlo > 0 or dhi < 0)          # b_p = b_x
        out['fuels'][fuel] = r
    cabin = f[(f.xo2 >= 0.28) & (f.pressure_kpa <= 80)]
    out['rows_total'] = int(len(f)); out['rows_extinction_usable'] = int(len(e))
    out['rows_in_cabin_box'] = int(len(cabin))
    out['cabin_box_with_extinction_diameter'] = int((cabin.visible_flame_extinction_diameter_mm > 0).sum())
    pure = e[(e.xco2.fillna(0) == 0) & (e.xhe.fillna(0) == 0)]
    out['pure_n2_rows'] = int(len(pure))
    out['pure_n2_pressure_levels_kpa'] = sorted({round(float(x), -1) for x in pure.pressure_kpa})
    return out


def pressure_gate_cfi():
    f = pd.read_csv(os.path.join(DATA, 'psi_39.csv'), low_memory=False)
    for c in ['o2_percent', 'pressure_kpa', 'hot_extinction_diameter_mm', 'initial_droplet_diameter_mm']:
        f[c] = pd.to_numeric(f[c], errors='coerce')
    e = f.dropna(subset=['o2_percent', 'pressure_kpa', 'hot_extinction_diameter_mm', 'initial_droplet_diameter_mm'])
    e = e[e.hot_extinction_diameter_mm > 0]
    y = np.log(e.hot_extinction_diameter_mm.to_numpy()); lp = np.log(e.pressure_kpa.to_numpy())
    ld = np.log(e.initial_droplet_diameter_mm.to_numpy()); o2 = e.o2_percent.to_numpy()
    X = np.column_stack([np.ones(len(y)), lp, ld, (o2 > o2.mean()).astype(float)])
    b = ols(X, y)
    return {'dataset': 'PSI-39 CFI', 'n': int(len(y)), 'o2_levels': sorted({float(x) for x in o2}),
            'pressure_levels_kpa': sorted({round(float(x), 1) for x in e.pressure_kpa}),
            'coef_ln_p': sig(float(b[1])), 'ci95_ln_p': boot_ci(X, y, lambda b: b[1]),
            'coef_ln_d0': sig(float(b[2])), 'ci95_ln_d0': boot_ci(X, y, lambda b: b[2]),
            'note': 'Hot-flame extinction diameter, pressure effect controlling for droplet size and an O2 level indicator.'}


def _theta_boot(X, y, ix, ip, B=4000, floor=0.05):
    """theta = b_p / b_x, the pressure exponent relative to the O2 exponent.
    theta=1 is ppO2 scaling, theta=0 is O2 mole-fraction scaling. Percentile bootstrap over rows."""
    b = ols(X, y)
    ts, n = [], len(y)
    for _ in range(B):
        i = RNG.integers(0, n, n)
        try:
            bb = ols(X[i], y[i])
            if abs(bb[ix]) > floor:
                ts.append(bb[ip] / bb[ix])
        except Exception:
            pass
    ts = np.array(ts)
    return {'b_x': sig(float(b[ix]), 4), 'b_p': sig(float(b[ip]), 4), 'theta': sig(float(b[ip] / b[ix]), 3),
            'ci95': [sig(float(np.percentile(ts, 2.5)), 3), sig(float(np.percentile(ts, 97.5)), 3)],
            'bootstrap_valid_fraction': sig(len(ts) / B, 3)}


def theta_estimates():
    """Pressure scaling of the O2 effect, estimated from the only PSI tables where O2 and pressure both vary
    and a response is measured. Responses are droplet extinction diameters, not solid-fuel limits."""
    f = pd.read_csv(os.path.join(DATA, 'psi_69.csv'), low_memory=False)
    pick = lambda pre: next(c for c in f.columns if c.startswith(pre))
    f = f.rename(columns={pick('src_o_initial_ambient'): 'xo2', pick('src_co_initial_ambient'): 'xco2',
                          pick('src_he_initial_ambient'): 'xhe'})
    for c in ['xo2', 'xco2', 'xhe', 'pressure_kpa', 'visible_flame_extinction_diameter_mm', 'initial_droplet_diameter_mm']:
        f[c] = pd.to_numeric(f[c], errors='coerce')
    e = f[(f.outcome == 'extinguished') & (f.visible_flame_extinction_diameter_mm > 0) & (f.pressure_kpa > 20)]
    e = e.dropna(subset=['xo2', 'pressure_kpa', 'visible_flame_extinction_diameter_mm', 'initial_droplet_diameter_mm']).copy()

    def design(g, dil):
        cols = [(g.fuel == 'Methanol').astype(float).to_numpy(), (g.fuel == 'Heptane').astype(float).to_numpy(),
                np.log(g.xo2.to_numpy()), np.log(g.pressure_kpa.to_numpy()), np.log(g.initial_droplet_diameter_mm.to_numpy())]
        if dil:
            cols += [(g.xco2.fillna(0) > 0).astype(float).to_numpy(), (g.xhe.fillna(0) > 0).astype(float).to_numpy()]
        return np.column_stack(cols), np.log(g.visible_flame_extinction_diameter_mm.to_numpy())

    lv = e.pressure_kpa.round(-1).value_counts().sort_index()
    out = {'flex': {
        'dataset': 'PSI-69 FLEX', 'response': 'visible flame extinction diameter', 'n': int(len(e)),
        'pressure_clusters_kpa': {str(int(k)): int(v) for k, v in lv.items()},
        'pooled_with_diluent_terms': _theta_boot(*design(e, True), 2, 3),
        'pure_n2_only': None,
    }}
    X, y = design(e, True)
    for fuel in ('Methanol', 'Heptane'):
        g = e[e.fuel == fuel]
        Xg, yg = design(g.assign(fuel='Methanol'), True)
        out['flex'][fuel.lower()] = dict(n=int(len(g)), **_theta_boot(Xg, yg, 2, 3))
    pn = e[(e.xco2.fillna(0) == 0) & (e.xhe.fillna(0) == 0)]
    Xp, yp = design(pn, False)
    out['flex']['pure_n2_only'] = dict(n=int(len(pn)), **_theta_boot(Xp, yp, 2, 3))

    c = pd.read_csv(os.path.join(DATA, 'psi_39.csv'), low_memory=False)
    for k in ['o2_percent', 'pressure_kpa', 'hot_extinction_diameter_mm', 'cool_extinction_diameter_mm',
              'initial_droplet_diameter_mm', 'src_helium']:
        c[k] = pd.to_numeric(c[k], errors='coerce')
    out['cfi'] = {'dataset': 'PSI-39 CFI', 'o2_levels_percent': [17, 21],
                  'pressure_levels_kpa': sorted({round(float(x), 1) for x in c.pressure_kpa.dropna()})}
    for key, resp in (('hot_flame', 'hot_extinction_diameter_mm'), ('cool_flame', 'cool_extinction_diameter_mm')):
        g = c.dropna(subset=['o2_percent', 'pressure_kpa', resp, 'initial_droplet_diameter_mm']); g = g[g[resp] > 0]
        X = np.column_stack([np.ones(len(g)), np.log(g.o2_percent.to_numpy()), np.log(g.pressure_kpa.to_numpy()),
                             np.log(g.initial_droplet_diameter_mm.to_numpy()), (g.src_helium.fillna(0) > 0).astype(float).to_numpy()])
        out['cfi'][key] = dict(n=int(len(g)), **_theta_boot(X, np.log(g[resp].to_numpy()), 1, 2))
    out['caveats'] = [
        'Both responses are liquid-droplet extinction diameters, not solid-fuel flammability limits.',
        'FLEX pressure leverage rests on two clusters near 70 and 100 kPa; the pure-N2 subset cannot identify theta.',
        'CFI has two O2 levels (17 and 21 percent) and a helium-diluted subset, so its O2 exponent rests on one contrast.',
        'Bootstrap resamples rows as independent; repeated tests on one apparatus are not independent in fact.',
        'Applying theta to solid fuels is an assumption, labelled as such wherever it is used.',
    ]
    return out


def fingerprint(invs, files):
    """For each investigation and variable: varies, constant, or empty, from the dataset itself."""
    VARS = [('Fuel', ['fuel']), ('Geometry', ['fuel_geometry']), ('Thickness', ['fuel_thickness_mm']),
            ('O₂', ['o2_percent', 'oxygen_conc_percent']), ('Pressure', ['pressure_kpa']),
            ('Flow speed', ['flow_velocity_cm_s']), ('Flow direction', ['flow_direction']),
            ('Gravity', ['gravity_g']), ('Outcome', ['outcome'])]
    res = {}
    for pid, fs in files.items():
        p = fs.get('series') if fs.get('series') is not None and 'main' in fs and pd.read_csv(fs['main'], nrows=1).shape[1] == 3 else fs['main']
        df = pd.read_csv(p, low_memory=False)
        row = {}
        for name, keys in VARS:
            status, nun = 'empty', 0
            for k in keys:
                if k in df.columns and df[k].notna().any():
                    if k == 'outcome':
                        u = df[k].dropna().astype(str)
                        u = u[u != 'unknown']
                        nun = u.nunique()
                        status = 'empty' if nun == 0 else ('varies' if nun > 1 else 'constant')
                    else:
                        nun = df[k].dropna().nunique()
                        status = 'varies' if nun > 1 else 'constant'
                    break
            row[name] = {'status': status, 'n_unique': int(nun)}
        res[pid] = row
    return {'variables': [v for v, _ in VARS], 'by_investigation': res}


def period_years(period):
    m = re.findall(r'(\d{4})-\d{2}-\d{2}', period or '')
    return [int(x) for x in m]


def main():
    invs = load_investigations()
    files = psi_files()
    by_id = {r['psi_id']: r for r in invs}
    index = []
    for pid, fs in sorted(files.items(), key=lambda kv: int(kv[0].split('-')[1])):
        if pid not in by_id:
            continue
        ds = build_dataset(pid, fs, by_id[pid])
        json.dump(ds, open(os.path.join(OUT, 'datasets', f'{pid}.json'), 'w'), separators=(',', ':'))
        index.append({'id': pid, 'name': by_id[pid]['name'], 'kind': ds['kind'], 'rows': ds['rows'],
                      'columns': len(ds['columns']), 'series': len(ds.get('series', []))})
    json.dump(index, open(os.path.join(OUT, 'datasets', 'index.json'), 'w'), indent=1)

    d, tests = build_tests()
    json.dump(tests, open(os.path.join(OUT, 'tests.json'), 'w'), separators=(',', ':'))

    out_inv = []
    for r in invs:
        r = dict(r)
        yrs = period_years(r.get('period'))
        r['pillar'] = PILLAR.get(r['psi_id'], 'context')
        r['hardware'] = HARDWARE.get(r['psi_id'], 'Other')
        r['year_start'] = yrs[0] if yrs else None
        r['year_end'] = yrs[1] if len(yrs) > 1 else None
        r['dataset_rows'] = next((x['rows'] for x in index if x['id'] == r['psi_id']), 0)
        out_inv.append(r)
    json.dump(out_inv, open(os.path.join(OUT, 'investigations.json'), 'w'), separators=(',', ':'))

    both = d.dropna(subset=['o2_percent', 'pressure_kpa'])
    cabin = both[(both.o2_percent >= 26) & (both.pressure_kpa <= 75)]
    solids = d[d.experiment.isin(['BASS', 'BASS-II', 'SAFFIRE-I', 'SAFFIRE-II', 'SAFFIRE-III'])]
    scen = {'earth_air': (20.9, 101.325), 'moon_cabin_10p2psi': (30.0, 70.33), 'moon_cabin_8p2psi': (34.0, 56.54),
            'suit_4p3psi': (100.0, 29.65)}
    analytics = {
        'facts': {
            'rows_total': int(len(d)), 'rows_with_o2_and_pressure': int(len(both)),
            'rows_with_o2_pressure_and_outcome': int((both.outcome_class != 'unknown').sum()),
            'cabin_box_rows': int(len(cabin)), 'cabin_box_experiments': sorted(cabin.experiment.unique().tolist()),
            'cabin_box_with_outcome': int((cabin.outcome_class != 'unknown').sum()),
            'solid_rows': int(len(solids)), 'solid_max_o2_percent': sig(float(solids.o2_percent.max())),
            'solid_pressure_min_kpa': sig(float(solids.pressure_kpa.min())),
            'solid_pressure_max_kpa': sig(float(solids.pressure_kpa.max())),
            'solid_rows_at_or_above_24pct_o2': int((solids.o2_percent >= 24).sum()),
            'cabin_box_definition': 'O2 >= 26% and total pressure <= 75 kPa',
            'distinct_raw_fuel_labels': int(d.fuel.nunique()),
        },
        'scenarios': {k: {'o2_percent': v[0], 'pressure_kpa': v[1], 'ppo2_kpa': sig(v[0] * v[1] / 100, 4)} for k, v in scen.items()},
        'scaling_gate': scaling_gate(),
        'theta': theta_estimates(),
        'cfi_pressure': pressure_gate_cfi(),
        'fingerprint': fingerprint(invs, files),
        'outcome_by_experiment': {e: g.outcome.value_counts().to_dict() for e, g in d.groupby('experiment')},
    }
    json.dump(analytics, open(os.path.join(OUT, 'analytics.json'), 'w'), indent=1)
    export_anchors()
    print('datasets', len(index), 'tests', tests['n'])
    print(json.dumps(analytics['facts'], indent=1))
    t = analytics['theta']
    print('theta FLEX pooled', t['flex']['pooled_with_diluent_terms'])
    print('theta FLEX pure N2', t['flex']['pure_n2_only'])
    print('theta CFI hot', t['cfi']['hot_flame'], '| cool', t['cfi']['cool_flame'])


def export_anchors():
    # Literature anchors (quote, page, source) used as benchmarks. Copied from data/derived/nasa_1g_anchors.csv.
    src = os.path.join(ROOT, 'data', 'derived', 'nasa_1g_anchors.csv')
    a = pd.read_csv(src).fillna('')
    json.dump(a.to_dict(orient='records'), open(os.path.join(OUT, 'anchors.json'), 'w'), indent=1)
    # Simulation parameters and validation written by scripts/sim/calibrate.mjs, served to the Models page.
    for name in ('sim-params.json', 'sim-validation.json'):
        with open(os.path.join(ROOT, 'data', 'derived', name)) as f, open(os.path.join(OUT, name), 'w') as g:
            g.write(f.read())


if __name__ == '__main__':
    main()
