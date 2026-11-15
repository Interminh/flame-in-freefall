"""Builds data/inv/PSI-*.json (raw PSI tables, original headers kept) and data/publications.json.

Why: the harmonised atlas tables drop many columns that are useful on their own (burn time,
flame temperature, CO levels, test-day logs, modelled time series). The investigation page
reads these files so it can chart and show the raw tables.

Usage: python3 scripts/build_inv_data.py <raw-dir> <psi-publications.json>
  raw-dir: folder holding PSI-*/ subfolders with the files downloaded from PSI (see data/DOWNLOAD_PLAN.md)
  psi-publications.json: publication lists copied from each PSI investigation page
Needs pandas, openpyxl, xlrd (local tooling only, not part of the site).
"""
import csv, datetime, glob, json, os, re, sys, warnings
import openpyxl, xlrd

warnings.filterwarnings('ignore')
RAW = sys.argv[1]
PUBS = sys.argv[2]
OUT = os.path.join(os.path.dirname(__file__), '..', 'data')
ROW_CAP = 1300


def clean(v):
    if v is None:
        return None
    if isinstance(v, (datetime.datetime, datetime.date)):
        return v.strftime('%Y-%m-%d')
    if isinstance(v, datetime.time):
        return v.strftime('%H:%M:%S')
    if isinstance(v, bool):
        return v
    if isinstance(v, (int, float)):
        return round(v, 6) if isinstance(v, float) else v
    s = str(v).strip().replace('﻿', '')
    if s == '' or s.lower() in ('none', 'nan'):
        return None
    try:
        f = float(s)
        return int(f) if f.is_integer() and 'e' not in s.lower() and '.' not in s else round(f, 6)
    except ValueError:
        return s


def table(name, source, header, rows, note=None):
    cols = [str(clean(h) or '') for h in header]
    rows = [[clean(c) for c in r] for r in rows]
    rows = [r for r in rows if any(c is not None for c in r)]
    # drop columns that are empty in both header and body
    keep = [i for i in range(len(cols)) if cols[i] or any(i < len(r) and r[i] is not None for r in rows)]
    rows = [[r[i] if i < len(r) else None for i in keep] for r in rows][:ROW_CAP]
    t = {'name': name, 'source': source, 'cols': [cols[i] for i in keep], 'rows': rows}
    if note:
        t['note'] = note
    return t


def read_csv(path):
    for enc in ('utf-8-sig', 'latin1'):
        try:
            with open(path, newline='', encoding=enc) as f:
                return list(csv.reader(f))
        except UnicodeDecodeError:
            continue


def csv_table(path, name, note=None):
    g = read_csv(path)
    return table(name, os.path.basename(path), g[0], g[1:], note)


def sheet_rows(ws):
    return [list(r) for r in ws.iter_rows(values_only=True)]


def xlsx_table(path, sheet, name, header_row=0, note=None):
    wb = openpyxl.load_workbook(path, read_only=True, data_only=True)
    g = sheet_rows(wb[sheet])
    return table(name, os.path.basename(path) + ' / ' + sheet, g[header_row], g[header_row + 1:], note)


def find(psi, pat):
    hits = glob.glob(os.path.join(RAW, psi, f'*{pat}*'))
    return hits[0] if hits else None


def build(psi):
    tabs = []
    P = lambda pat: find(psi, pat)
    if psi == 'PSI-10':
        tabs += [csv_table(P('Normal Flame'), 'Normal flames'), csv_table(P('Inverse Flame'), 'Inverse flames')]
    elif psi in ('PSI-159',):
        tabs += [csv_table(P('Normal Flames'), 'Normal flames'), csv_table(P('Inverse Flames'), 'Inverse flames')]
    elif psi == 'PSI-39':
        tabs.append(xlsx_table(P('DataSummary'), 'DATA', 'Per-test results (CFI data summary)'))
        tabs.append(xlsx_table(P('DataSummary'), 'Master Sheet', 'Test conditions (CFI master sheet)'))
    elif psi == 'PSI-25':
        wb = openpyxl.load_workbook(P('Test.Matrices'), read_only=True, data_only=True)
        rows, header = [], None
        for ws in wb.worksheets:
            g = sheet_rows(ws)
            header = header or g[0]
            rows += [[ws.title] + r for r in g[1:]]
        tabs.append(table('Test matrix by investigator', 'BASS-II_Test.Matrices.xlsx', ['Investigator'] + header, rows))
        tabs.append(csv_table(P('Experimental table'), 'Experimental table (cabin gas readings)'))
    elif psi == 'PSI-26':
        wb = openpyxl.load_workbook(P('As Run'), read_only=True, data_only=True)
        g = sheet_rows(wb['as run matrix'])
        hdr = next(i for i, r in enumerate(g) if sum(c is not None for c in r) >= 6)
        tabs.append(table('As-run test matrix', 'As Run_Test Matrix.xlsx / as run matrix', g[hdr], g[hdr + 1:]))
    elif psi == 'PSI-47':
        wb = xlrd.open_workbook(P('Retrieved Data Summary'))
        s = next(x for x in wb.sheets() if 'vs' in x.name)
        g = [s.row_values(i) for i in range(s.nrows)]
        tabs.append(table('P-Trak against DustTrak readings, by sample bag', 'DAFT Retrieved Data Summary.xls', g[0], g[1:],
                          note='Columns come in pairs. The source does not label the units on this sheet.'))
        tabs.append(csv_table(P('Experimental table'), 'Sessions'))
    elif psi == 'PSI-115':
        def dat(f):
            return [l.split() for l in open(f) if l.strip()]
        nodes = [l.strip() for l in open(P('nodeDiameters'))][1:]
        nodes = [float(x) for x in nodes if x]
        rows = []
        for f in sorted(glob.glob(os.path.join(RAW, psi, '*PSD.dat'))):
            case = re.search(r'Analyzed Data_(.*)\.dat', f).group(1)
            for i, v in dat(f):
                rows.append([case, int(i), nodes[int(i) - 2] if 0 <= int(i) - 2 < len(nodes) else None, float(v)])
        tabs.append(table('Modelled particle size distribution', 'PSD .dat files', ['Case', 'Node', 'Diameter (m), if nodes align', 'Distribution value'], rows,
                          note='Diameter is paired with nodes by position (node 2 onward), which the source does not confirm. Treat as indicative.'))
    elif psi == 'PSI-117':
        for f in sorted(glob.glob(os.path.join(RAW, psi, '*Analyzed Data_*.csv'))):
            tabs.append(csv_table(f, re.search(r'Analyzed Data_(.*)\.csv', f).group(1).replace('_', ' ')))
        tabs.append(xlsx_table(P('ReadMe'), 'Sheet1', 'List of data files'))
    elif psi == 'PSI-142':
        wb = openpyxl.load_workbook(P('Princeton'), read_only=True, data_only=True)
        g = sheet_rows(wb['data summary'])
        h = next(i for i, r in enumerate(g) if r and r[1] == 'Data ID')
        tabs.append(table('Data summary', 'data summary', g[h][1:], [r[1:] for r in g[h + 1:]]))
        for ws in wb.worksheets[1:]:
            g = sheet_rows(ws)
            tabs.append(table(ws.title.replace('data ID', 'Data ID').title() if False else ws.title, ws.title, [''] * max(len(r) for r in g), g[1:], note='Raw sheet grid; blocks of columns are labelled in the first rows.'))
    else:
        for f in sorted(glob.glob(os.path.join(RAW, psi, '*Experimental table*.csv'))):
            tabs.append(csv_table(f, 'Experimental table'))
    return [t for t in tabs if t and t['rows']]


def main():
    os.makedirs(os.path.join(OUT, 'inv'), exist_ok=True)
    for d in sorted(glob.glob(os.path.join(RAW, 'PSI-*'))):
        psi = os.path.basename(d)
        tabs = build(psi)
        if tabs:
            json.dump({'psi_id': psi, 'tables': tabs}, open(os.path.join(OUT, 'inv', f'{psi}.json'), 'w'), separators=(',', ':'))
            print(psi, [(t['name'], len(t['rows'])) for t in tabs])

    # Publications as listed on each PSI page. Link: DOI, else the link PSI gives, else PubMed.
    raw = json.load(open(PUBS))
    lit = json.load(open(os.path.join(OUT, 'atlas', 'literature.json')))
    norm = lambda s: re.sub(r'[^a-z0-9]', '', (s or '').lower())
    ntrs = {norm(l['title']): l for l in lit}
    out = {}
    for psi, items in raw.items():
        rows = []
        for p in items:
            title = re.sub(r'\s+\(\d{4}\)\s*$', '', p['t']).strip()
            year = re.search(r'\((\d{4})\)\s*$', p['t'])
            doi = (p.get('doi') or '').replace('https://doi.org/', '').strip() or None
            url = f'https://doi.org/{doi}' if doi else (p.get('l') or None)
            if not url and p.get('pm'):
                url = f"https://pubmed.ncbi.nlm.nih.gov/{p['pm']}/"
            n = ntrs.get(norm(title))
            rows.append({'title': title, 'authors': p.get('au'), 'year': int(year.group(1)) if year else (n or {}).get('year'),
                         'url': url, 'doi': doi, 'pubmed': p.get('pm'), 'ntrs_id': str(n['id']) if n else None})
        out[psi] = rows
    json.dump(out, open(os.path.join(OUT, 'publications.json'), 'w'), indent=1, ensure_ascii=False)
    print('publications', sum(len(v) for v in out.values()), 'with link', sum(1 for v in out.values() for p in v if p['url']), 'ntrs', sum(1 for v in out.values() for p in v if p['ntrs_id']))


main()
