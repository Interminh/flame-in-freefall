// Builds a standard chart suite for any PSI table from its column metadata. No numbers are typed in here:
// every plotted value is read from the dataset JSON written by scripts/pipeline/build_data.py.
import { OKABE, OUTCOME_COLORS } from './theme.js'
import { spearman } from './stats.js'

const isSrc = (k) => k.startsWith('src_')
const numCols = (ds) => ds.columns.filter((c) => c.type === 'num' && c.nuniq > 3 && c.n >= 8).sort((a, b) => isSrc(a.key) - isSrc(b.key) || b.n - a.n)
const catCols = (ds) => ds.columns.filter((c) => c.type === 'cat' && c.nuniq >= 2 && c.nuniq <= 24 && c.n >= 8).sort((a, b) => isSrc(a.key) - isSrc(b.key))
const label = (c) => `${c.label}${c.unit ? ` (${c.unit})` : ''}`
const has = (ds, k) => ds.columns.find((c) => c.key === k && c.n > 2)
const groupBy = (rows, f) => { const m = new Map(); for (const r of rows) { const k = f(r); if (!m.has(k)) m.set(k, []); m.get(k).push(r) } return m }
const colorFor = (name, i) => OUTCOME_COLORS[name] || OKABE[i % OKABE.length]

export function autoCharts(ds, rows) {
  if (ds.kind === 'series') return seriesCharts(ds)
  if (!rows.length) return []
  const out = []
  const nums = numCols(ds), cats = catCols(ds)
  const fuelCol = ['fuel', 'src_fuel', 'material'].find((k) => cats.some((c) => c.key === k))
  const outcome = has(ds, 'outcome') && ds.columns.find((c) => c.key === 'outcome').nuniq > 1 ? 'outcome' : null

  // 1. Outcome mix by fuel
  if (outcome && fuelCol) {
    const levels = [...new Set(rows.map((r) => r.outcome).filter(Boolean))]
    const fuels = [...groupBy(rows, (r) => r[fuelCol] ?? 'n/a').entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 14)
    out.push({ id: 'outcome-fuel', title: 'Outcome by fuel', sub: 'Counts of rows by reported outcome', notes: 'Outcome labels follow the conservative rules in data/DATA_DICTIONARY.md. "unknown" means the source did not state one.',
      data: levels.map((lv, i) => ({ type: 'bar', name: lv, x: fuels.map(([f]) => String(f).slice(0, 28)), y: fuels.map(([, rs]) => rs.filter((r) => r.outcome === lv).length), marker: { color: colorFor(lv, i) } })), layout: { barmode: 'stack', yaxis: { title: 'Rows' }, xaxis: { tickangle: -30 } } })
  }
  // 2. Condition maps coloured by outcome or fuel
  const mapPairs = [['o2_percent', 'pressure_kpa'], ['o2_percent', 'flow_velocity_cm_s'], ['flow_velocity_cm_s', 'fuel_thickness_mm'], ['o2_percent', 'fuel_thickness_mm']]
  for (const [a, b] of mapPairs) {
    if (!has(ds, a) || !has(ds, b)) continue
    const ca = ds.columns.find((c) => c.key === a), cb = ds.columns.find((c) => c.key === b)
    const pts = rows.filter((r) => r[a] != null && r[b] != null)
    if (pts.length < 6) continue
    const by = outcome ? 'outcome' : fuelCol
    const groups = by ? [...groupBy(pts, (r) => r[by] ?? 'n/a').entries()] : [['all', pts]]
    out.push({ id: `map-${a}-${b}`, title: `${ca.label} against ${cb.label}`, sub: by ? `Coloured by ${by}` : undefined,
      data: groups.map(([g, rs], i) => ({ type: 'scatter', mode: 'markers', name: `${String(g).slice(0, 26)} (${rs.length})`, x: rs.map((r) => r[a]), y: rs.map((r) => r[b]), text: rs.map((r) => r.test_id || ''), hovertemplate: `%{text}<br>${ca.label} %{x}<br>${cb.label} %{y}<extra>${String(g)}</extra>`, marker: { size: 8, opacity: 0.75, color: by === 'outcome' ? colorFor(g, i) : OKABE[i % OKABE.length] } })),
      layout: { xaxis: { title: label(ca) }, yaxis: { title: label(cb) } } })
    if (out.filter((o) => o.id.startsWith('map-')).length >= 2) break
  }
  // 3. Best monotone relationships among numeric columns
  const pairs = []
  const clean = nums.filter((c) => !isSrc(c.key))
  const pool = (clean.length >= 3 ? clean : nums).slice(0, 14)
  for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) {
    const xs = [], ys = []
    for (const r of rows) if (r[pool[i].key] != null && r[pool[j].key] != null) { xs.push(r[pool[i].key]); ys.push(r[pool[j].key]) }
    if (xs.length >= 15) { const rho = spearman(xs, ys); if (Number.isFinite(rho) && Math.abs(rho) < 0.999) pairs.push({ a: pool[i], b: pool[j], rho, n: xs.length }) }
  }
  pairs.sort((p, q) => Math.abs(q.rho) - Math.abs(p.rho))
  for (const pr of pairs.slice(0, 3)) {
    if (out.some((o) => o.id === `map-${pr.a.key}-${pr.b.key}` || o.id === `map-${pr.b.key}-${pr.a.key}`)) continue
    const pts = rows.filter((r) => r[pr.a.key] != null && r[pr.b.key] != null)
    const groups = fuelCol ? [...groupBy(pts, (r) => r[fuelCol] ?? 'n/a').entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 8) : [['all', pts]]
    out.push({ id: `pair-${pr.a.key}-${pr.b.key}`, title: `${pr.a.label} against ${pr.b.label}`, sub: `Spearman rho = ${pr.rho.toFixed(2)}, n = ${pr.n}`, notes: 'Pairs are ranked by absolute rank correlation. Correlation is descriptive, not causal.',
      data: groups.map(([g, rs], i) => ({ type: 'scatter', mode: 'markers', name: String(g).slice(0, 26), x: rs.map((r) => r[pr.a.key]), y: rs.map((r) => r[pr.b.key]), marker: { size: 7, opacity: 0.7, color: OKABE[i % OKABE.length] } })),
      layout: { xaxis: { title: label(pr.a) }, yaxis: { title: label(pr.b) } } })
  }
  // 4. Distributions
  for (const c of (clean.length ? clean.slice(0, 6) : nums.slice(0, 4))) {
    const vals = rows.map((r) => r[c.key]).filter((v) => v != null)
    out.push({ id: `hist-${c.key}`, title: `Distribution of ${c.label}`, sub: `n = ${vals.length}, median ${c.median}, range ${c.min} to ${c.max}${c.unit ? ' ' + c.unit : ''}`,
      data: [{ type: 'histogram', x: vals, marker: { color: OKABE[0] }, nbinsx: 24 }], layout: { xaxis: { title: label(c) }, yaxis: { title: 'Rows' }, bargap: 0.04 } })
  }
  // 5. Category composition
  for (const c of cats.slice(0, 3)) {
    const top = c.top.slice(0, 14)
    out.push({ id: `cat-${c.key}`, title: `${c.label}: most common values`, sub: `${c.nuniq} distinct values across ${c.n} rows`,
      data: [{ type: 'bar', orientation: 'h', y: top.map((t) => String(t[0]).slice(0, 34)).reverse(), x: top.map((t) => t[1]).reverse(), marker: { color: OKABE[2] } }], layout: { xaxis: { title: 'Rows' }, margin: { l: 190 } } })
  }
  // 6. Rank-correlation matrix
  if (pool.length >= 4) {
    const k = pool.slice(0, 12)
    const z = k.map((a) => k.map((b) => { const xs = [], ys = []; for (const r of rows) if (r[a.key] != null && r[b.key] != null) { xs.push(r[a.key]); ys.push(r[b.key]) } return xs.length >= 10 ? spearman(xs, ys) : null }))
    out.push({ id: 'corr', title: 'Rank-correlation matrix', sub: 'Spearman rho over pairwise-complete rows (blank if fewer than 10 pairs)',
      data: [{ type: 'heatmap', x: k.map((c) => c.label), y: k.map((c) => c.label), z, zmin: -1, zmax: 1, colorscale: [[0, '#0072B2'], [0.5, '#F7F6F2'], [1, '#D55E00']], hovertemplate: '%{x}<br>%{y}<br>rho %{z:.2f}<extra></extra>' }], layout: { margin: { l: 150, b: 130 }, xaxis: { tickangle: -40 } }, size: 'tall' })
  }
  // 7. Completeness
  const comp = [...ds.columns].filter((c) => !isSrc(c.key) || ds.columns.length < 18).sort((a, b) => b.n - a.n).slice(0, 26)
  out.push({ id: 'complete', title: 'Column completeness', sub: 'Share of rows with a value, per column', notes: 'Low completeness is why some analyses are impossible on this dataset.',
    data: [{ type: 'bar', orientation: 'h', y: comp.map((c) => c.label).reverse(), x: comp.map((c) => (100 * c.n) / ds.rows).reverse(), marker: { color: OKABE[5] } }], layout: { xaxis: { title: 'Rows with a value (%)', range: [0, 100] }, margin: { l: 190 } }, size: 'tall' })
  return out
}

function seriesCharts(ds) {
  const ser = (ds.series || []).filter((s) => s.n >= 5)
  const pick = [...ser].sort((a, b) => b.n - a.n).slice(0, 8)
  const out = []
  if (pick.length) out.push({ id: 'series', title: 'Largest series', sub: `${pick.length} of ${ds.series.length} series; large series are min-max decimated to at most 240 points`, notes: 'x is the stored index, y the first value column. Units are in each series meta record.',
    data: pick.map((s, i) => ({ type: 'scatter', mode: 'lines', name: `${s.id.split('-series-')[1]} (${s.meta?.quantity_original || 'y'})`, x: s.x, y: s.y, line: { color: OKABE[i % OKABE.length], width: 1.5 } })), layout: { xaxis: { title: 'Index' }, yaxis: { title: 'Value' } }, size: 'tall' })
  const sizes = ds.series.map((s) => s.n)
  out.push({ id: 'series-len', title: 'Series length distribution', sub: `${ds.series.length} series`, data: [{ type: 'histogram', x: sizes, marker: { color: OKABE[0] } }], layout: { xaxis: { title: 'Points per series', type: 'log' }, yaxis: { title: 'Series' } } })
  const meds = ds.series.filter((s) => s.stats).map((s) => s.stats.mean)
  if (meds.length > 5) out.push({ id: 'series-mean', title: 'Series mean values', sub: 'Mean of y per series', data: [{ type: 'histogram', x: meds, marker: { color: OKABE[2] } }], layout: { xaxis: { title: 'Mean y' }, yaxis: { title: 'Series' } } })
  return out
}
