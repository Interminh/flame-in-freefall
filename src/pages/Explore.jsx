import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getTests, getDictionary } from '../lib/data.js'
import { Loading, PageHead, Tabs, ChartCard, useAsync } from '../components/ui.jsx'
import Plot from '../components/Plot.jsx'
import { OUTCOME_COLORS } from '../lib/theme.js'
import { fmt } from '../lib/stats.js'
import {
  COLS, COL, FACETS, RANGES, HAS, DEFAULT_COLS, NUM_COLS, OUTCOME_LABEL, colTitle, label, emptyState, isEmpty, fromParams, toParams, applyFilters, facetCounts, rangeBounds,
  describeState, buildVocab, parseQuery, resolvePsi, summarize, profile, corrMatrix, toCsv, download, countBy, explainEmpty,
} from '../lib/query.js'

const PAGE = 50
const OC = ['flame', 'no_flame', 'burned_out', 'unknown']
const ocShort = (k) => OUTCOME_LABEL[k].split(' (')[0]

// ---- sidebar ----------------------------------------------------------------------------------------------------
function FacetGroup({ f, items, sel, onToggle, open }) {
  const [all, setAll] = useState(false)
  const [find, setFind] = useState('')
  const shown = (find ? items.filter(([v]) => label(f.key, v).toLowerCase().includes(find.toLowerCase())) : items)
  const list = all || find ? shown : shown.slice(0, 8)
  return (
    <details className="fgroup" open={open || sel.length > 0}>
      <summary><span>{f.label}</span>{sel.length > 0 && <span className="sel">{sel.length} selected</span>}</summary>
      {items.length > 12 && <input type="search" placeholder={`Find ${f.label.toLowerCase()}`} value={find} onChange={(e) => setFind(e.target.value)} style={{ margin: '4px 0 6px', padding: '4px 9px', fontSize: '.84rem' }} />}
      {list.map(([v, n]) => (
        <label key={v} className={`fopt ${n === 0 ? 'zero' : ''}`}>
          <input type="checkbox" checked={sel.includes(v)} onChange={() => onToggle(f.key, v)} />
          <span className="t" title={label(f.key, v)}>{label(f.key, v)}</span><span className="c">{n.toLocaleString()}</span>
        </label>
      ))}
      {!find && shown.length > 8 && <button className="fmore" onClick={() => setAll(!all)}>{all ? 'Show fewer' : `Show all ${shown.length}`}</button>}
    </details>
  )
}

function Sidebar({ state, counts, bounds, setState }) {
  const toggle = (key, v) => {
    const cur = state.cat[key] || []
    setState({ ...state, cat: { ...state.cat, [key]: cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v] } })
  }
  const setRange = (key, i, val) => {
    const cur = state.range[key] || [null, null]
    const next = [...cur]; next[i] = val === '' ? null : Number(val)
    const rg = { ...state.range }
    if (next[0] == null && next[1] == null) delete rg[key]; else rg[key] = next
    setState({ ...state, range: rg })
  }
  const toggleHas = (id) => setState({ ...state, has: state.has.includes(id) ? state.has.filter((x) => x !== id) : [...state.has, id] })
  return (
    <aside className="facets" aria-label="Filters">
      {FACETS.map((f, i) => <FacetGroup key={f.key} f={f} items={counts[f.key] || []} sel={state.cat[f.key] || []} onToggle={toggle} open={['experiment', 'form', 'material', 'outcome_class'].includes(f.key)} />)}
      <details className="fgroup" open={Object.keys(state.range).length > 0}>
        <summary><span>Conditions</span>{Object.keys(state.range).length > 0 && <span className="sel">{Object.keys(state.range).length} set</span>}</summary>
        {RANGES.map((r) => {
          const b = bounds[r.key], v = state.range[r.key] || [null, null]
          return (
            <div key={r.key} style={{ marginBottom: 10 }}>
              <div className="small" style={{ color: 'var(--ink-2)' }}>{r.label} ({r.unit})</div>
              <div className="rng">
                <input type="number" step="any" placeholder={b ? `min ${fmt(b.lo, 2)}` : 'min'} value={v[0] ?? ''} onChange={(e) => setRange(r.key, 0, e.target.value)} aria-label={`${r.label} minimum`} />
                <input type="number" step="any" placeholder={b ? `max ${fmt(b.hi, 2)}` : 'max'} value={v[1] ?? ''} onChange={(e) => setRange(r.key, 1, e.target.value)} aria-label={`${r.label} maximum`} />
              </div>
              <div className="small">{b ? `${b.n.toLocaleString()} rows record this` : 'no rows record this'}. Setting a bound drops rows without a value.</div>
            </div>
          )
        })}
      </details>
      <details className="fgroup" open={state.has.length > 0}>
        <summary><span>Only tests that record</span>{state.has.length > 0 && <span className="sel">{state.has.length} set</span>}</summary>
        {HAS.map((h) => <label key={h.id} className="fopt"><input type="checkbox" checked={state.has.includes(h.id)} onChange={() => toggleHas(h.id)} /><span className="t">{h.label}</span></label>)}
      </details>
    </aside>
  )
}

// ---- table ------------------------------------------------------------------------------------------------------
function Cell({ k, v }) {
  if (v == null || v === '') return <td className="nul" title="Not stated in the source">&ndash;</td>
  if (k === 'outcome_class') return <td><span className="oc" style={{ background: OUTCOME_COLORS[v] }}>{ocShort(v)}</span></td>
  if (COL[k]?.kind === 'num') return <td className="n">{fmt(v, 3)}</td>
  return <td>{String(v)}</td>
}

function RowPanel({ row, dict, onClose }) {
  const defs = Object.fromEntries([...(dict?.unified || []), ...(dict?.derived || [])].map((d) => [d.key, d.meaning]))
  return (
    <aside className="rowpanel" aria-label="Test record">
      <header>
        <div><div className="small">{row.psi_id}</div><h3 style={{ margin: 0 }}>{row.experiment}, test {row.test_id}</h3>
          <div className="row" style={{ marginTop: 8 }}><Link className="btn sm" to={`/i/${row.psi_id}`}>Open investigation</Link></div></div>
        <button className="btn sm" onClick={onClose}>Close</button>
      </header>
      <div className="body">
        <dl>{COLS.map((c) => (
          <div key={c.key}><dt>{c.key}{c.unit ? ` (${c.unit})` : ''}</dt>
            <dd className={row[c.key] == null ? 'muted' : ''}>{row[c.key] == null ? 'Not stated in the source' : String(row[c.key])}</dd>
            {defs[c.key] && <dd className="def">{defs[c.key]}</dd>}</div>
        ))}</dl>
      </div>
    </aside>
  )
}

function TableView({ rows, cols, setCols, sort, dir, setSort, dict, state }) {
  const [page, setPage] = useState(0)
  const [pick, setPick] = useState(null)
  useEffect(() => { setPage(0) }, [rows, sort, dir])
  const sorted = useMemo(() => {
    if (!sort) return rows
    const k = sort, m = dir === 'desc' ? -1 : 1
    const num = COL[k]?.kind === 'num'
    return [...rows].sort((a, b) => {
      const x = a[k], y = b[k]
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      return m * (num ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true }))
    })
  }, [rows, sort, dir])
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE))
  const slice = sorted.slice(page * PAGE, page * PAGE + PAGE)
  const all = COLS.map((c) => c.key)
  return (
    <>
      <div className="row spread" style={{ marginBottom: 8 }}>
        <span className="small">Click a column to sort, a row for the full record. A dash means the source did not record the value.</span>
        <div className="row">
          <details className="colpick"><summary className="btn sm">Columns ({cols.length})</summary>
            <div className="pop">
              <div className="row" style={{ marginBottom: 6 }}><button className="btn sm" onClick={() => setCols(DEFAULT_COLS)}>Default</button><button className="btn sm" onClick={() => setCols(all)}>All</button></div>
              {COLS.map((c) => <label className="fopt" key={c.key}><input type="checkbox" checked={cols.includes(c.key)} onChange={() => setCols(cols.includes(c.key) ? cols.filter((x) => x !== c.key) : all.filter((x) => x === c.key || cols.includes(x)))} /><span className="t">{colTitle(c.key)}</span></label>)}
            </div></details>
          <button className="btn sm" disabled={!rows.length} onClick={() => download('flame-in-freefall-tests.csv', toCsv(sorted, cols))}>CSV, shown columns</button>
          <button className="btn sm" disabled={!rows.length} onClick={() => download('flame-in-freefall-tests-all-columns.csv', toCsv(sorted, all))}>CSV, all {all.length} columns</button>
        </div>
      </div>
      <div className="tbl-wrap tall">
        <table>
          <thead><tr>{cols.map((k) => <th key={k} onClick={() => setSort(k)} title={`Sort by ${colTitle(k)}`}>{colTitle(k)}{sort === k && <span className="sorter">{dir === 'desc' ? '▼' : '▲'}</span>}</th>)}</tr></thead>
          <tbody>
            {slice.map((r, i) => <tr key={`${r.psi_id}-${r.source_file}-${r.source_row_or_page}-${i}`} className={pick === r ? 'sel click' : 'click'} onClick={() => setPick(r)} style={{ cursor: 'pointer' }}>{cols.map((k) => <Cell key={k} k={k} v={r[k]} />)}</tr>)}
            {!slice.length && <tr><td colSpan={cols.length} className="muted" style={{ padding: 18 }}>No tests match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="pager">
        <span>{sorted.length ? `${page * PAGE + 1}–${Math.min(sorted.length, (page + 1) * PAGE + 0)} of ${sorted.length.toLocaleString()}` : '0 rows'}</span>
        <button className="btn sm" disabled={page === 0} onClick={() => setPage(0)}>First</button>
        <button className="btn sm" disabled={page === 0} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {page + 1} of {pages}</span>
        <button className="btn sm" disabled={page >= pages - 1} onClick={() => setPage(page + 1)}>Next</button>
      </div>
      {pick && <RowPanel row={pick} dict={dict} onClose={() => setPick(null)} />}
    </>
  )
}

// ---- charts -------------------------------------------------------------------------------------------------------
const hasBoth = (rows, a, b) => rows.filter((r) => r[a] != null && r[b] != null)
const axT = (k) => ({ title: { text: colTitle(k) } })

function OutcomeScatter({ rows, x, y, name }) {
  const d = hasBoth(rows, x, y)
  const traces = OC.map((k) => { const s = d.filter((r) => r.outcome_class === k); return { type: 'scattergl', mode: 'markers', name: ocShort(k), x: s.map((r) => r[x]), y: s.map((r) => r[y]), marker: { color: OUTCOME_COLORS[k], size: 7, opacity: k === 'unknown' ? 0.35 : 0.85 }, text: s.map((r) => `${r.experiment} test ${r.test_id}<br>${r.material}`), hovertemplate: '%{text}<br>%{x}, %{y}<extra></extra>' } }).filter((t) => t.x.length)
  if (!d.length) return { d, node: <section className="card"><h4 style={{ margin: 0 }}>{colTitle(y)} against {colTitle(x).toLowerCase()}</h4><p className="muted" style={{ margin: '8px 0 0' }}>None of the {rows.length.toLocaleString()} filtered tests record both {colTitle(x).toLowerCase()} and {colTitle(y).toLowerCase()}, so there is nothing to plot. Selecting more experiments or removing a filter may help.</p></section> }
  return { d, node: <ChartCard title={`${colTitle(y)} against ${colTitle(x).toLowerCase()}`} sub={`${d.length.toLocaleString()} of ${rows.length.toLocaleString()} filtered tests record both`} data={traces} layout={{ xaxis: axT(x), yaxis: axT(y) }} name={name} notes={d.length ? 'Colour is the recorded outcome class; grey is not stated.' : null} /> }
}

function BuilderChart({ rows }) {
  const [type, setType] = useState('scatter'), [x, setX] = useState('o2_percent'), [y, setY] = useState('pressure_kpa'), [color, setColor] = useState('outcome_class')
  const cats = COLS.filter((c) => c.kind === 'cat').map((c) => c.key)
  let data = [], layout = {}, note = ''
  const colorOf = (v) => (color === 'outcome_class' ? OUTCOME_COLORS[v] : undefined)
  if (type === 'scatter') {
    const d = hasBoth(rows, x, y)
    const groups = color === 'none' ? [['All', d]] : [...countBy(d, color).map(([v]) => [v, d.filter((r) => (r[color] == null ? 'Not stated' : String(r[color])) === v)])]
    data = groups.slice(0, 12).map(([v, s]) => ({ type: 'scattergl', mode: 'markers', name: color === 'outcome_class' ? ocShort(v) : v, x: s.map((r) => r[x]), y: s.map((r) => r[y]), marker: { size: 7, opacity: 0.8, color: colorOf(v) } }))
    layout = { xaxis: axT(x), yaxis: axT(y) }; note = `${d.length.toLocaleString()} of ${rows.length.toLocaleString()} rows have both values.`
  } else if (type === 'histogram') {
    const d = rows.filter((r) => r[x] != null)
    const groups = color === 'none' ? [['All', d]] : countBy(d, color).map(([v]) => [v, d.filter((r) => (r[color] == null ? 'Not stated' : String(r[color])) === v)])
    data = groups.slice(0, 12).map(([v, s]) => ({ type: 'histogram', name: color === 'outcome_class' ? ocShort(v) : v, x: s.map((r) => r[x]), marker: { color: colorOf(v) } }))
    layout = { barmode: 'stack', xaxis: axT(x), yaxis: { title: { text: 'Tests (count)' } } }; note = `${d.length.toLocaleString()} of ${rows.length.toLocaleString()} rows record ${colTitle(x)}.`
  } else {
    const c = countBy(rows, x).slice(0, 20)
    data = [{ type: 'bar', orientation: 'h', y: c.map(([v]) => label(x, v)).reverse(), x: c.map(([, n]) => n).reverse(), marker: { color: '#c2410c' } }]
    layout = { xaxis: { title: { text: 'Tests (count)' } }, yaxis: { title: { text: colTitle(x) }, automargin: true } }; note = c.length === 20 ? 'Top 20 values shown.' : ''
  }
  const numOpts = NUM_COLS, xOpts = type === 'bar' ? cats : numOpts
  useEffect(() => { if (type === 'bar' && !cats.includes(x)) setX('material'); if (type !== 'bar' && !numOpts.includes(x)) setX('o2_percent') }, [type]) // eslint-disable-line
  const sel = (v, set, opts) => <select value={v} onChange={(e) => set(e.target.value)}>{opts.map((k) => <option key={k} value={k}>{colTitle(k)}</option>)}</select>
  return (
    <section className="card" style={{ gridColumn: '1 / -1' }}>
      <div className="card-head"><h3>Chart builder</h3><span className="small">Any column against any other, for the filtered tests</span></div>
      <div className="builder">
        <div className="field"><label>Chart</label><select value={type} onChange={(e) => setType(e.target.value)}><option value="scatter">Scatter</option><option value="histogram">Histogram</option><option value="bar">Counts by category</option></select></div>
        <div className="field"><label>{type === 'bar' ? 'Category' : 'X axis'}</label>{sel(x, setX, xOpts)}</div>
        {type === 'scatter' && <div className="field"><label>Y axis</label>{sel(y, setY, numOpts)}</div>}
        {type !== 'bar' && <div className="field"><label>Colour by</label><select value={color} onChange={(e) => setColor(e.target.value)}><option value="none">None</option>{cats.map((k) => <option key={k} value={k}>{colTitle(k)}</option>)}</select></div>}
      </div>
      {data.length && data[0].x?.length ? <Plot data={data} layout={{ ...layout, height: 420 }} name="explore_builder" /> : <p className="muted">No filtered rows have the selected columns.</p>}
      {note && <p className="small" style={{ marginBottom: 0 }}>{note}</p>}
    </section>
  )
}

function ChartsView({ rows, total }) {
  if (!rows.length) return <p className="muted">No tests match these filters, so there is nothing to chart.</p>
  const byExp = countBy(rows, 'experiment')
  const exps = byExp.map(([e]) => e).reverse()
  const stack = OC.map((k) => ({ type: 'bar', orientation: 'h', name: ocShort(k), y: exps, x: exps.map((e) => rows.filter((r) => r.experiment === e && r.outcome_class === k).length), marker: { color: OUTCOME_COLORS[k] } }))
  const withO2 = rows.filter((r) => r.o2_percent != null)
  const hist = OC.map((k) => ({ type: 'histogram', name: ocShort(k), x: withO2.filter((r) => r.outcome_class === k).map((r) => r.o2_percent), xbins: { size: 1 }, marker: { color: OUTCOME_COLORS[k] } })).filter((t) => t.x.length)
  const mats = countBy(rows, 'material').slice(0, 15).reverse()
  const forms = countBy(rows, 'form').reverse()
  const s1 = OutcomeScatter({ rows, x: 'o2_percent', y: 'pressure_kpa', name: 'explore_o2_pressure' })
  const s2 = OutcomeScatter({ rows, x: 'o2_percent', y: 'flow_velocity_cm_s', name: 'explore_o2_flow' })
  return (
    <div className="grid g2">
      <ChartCard title="Outcome by experiment" sub={`${rows.length.toLocaleString()} filtered tests`} data={stack} layout={{ barmode: 'stack', xaxis: { title: { text: 'Tests (count)' } }, yaxis: { title: { text: 'Experiment' }, automargin: true } }} notes="Grey is not stated: most tests do not record an outcome." name="explore_outcome_by_experiment" />
      <ChartCard title="Oxygen concentration of the tests" sub={`${withO2.length.toLocaleString()} of ${rows.length.toLocaleString()} record oxygen`} data={hist} layout={{ barmode: 'stack', xaxis: axT('o2_percent'), yaxis: { title: { text: 'Tests (count)' } } }} name="explore_o2_hist" />
      {s1.node}
      {s2.node}
      <ChartCard title="Most common materials" sub="Canonical material names" data={[{ type: 'bar', orientation: 'h', y: mats.map(([v]) => v), x: mats.map(([, n]) => n), marker: { color: '#c2410c' } }]} layout={{ xaxis: { title: { text: 'Tests (count)' } }, yaxis: { title: { text: 'Material' }, automargin: true } }} name="explore_materials" />
      <ChartCard title="Test article form" data={[{ type: 'bar', orientation: 'h', y: forms.map(([v]) => v), x: forms.map(([, n]) => n), marker: { color: '#3f6e9c' } }]} layout={{ xaxis: { title: { text: 'Tests (count)' } }, yaxis: { title: { text: 'Form' }, automargin: true } }} name="explore_forms" />
      <BuilderChart rows={rows} />
    </div>
  )
}

// ---- summary ------------------------------------------------------------------------------------------------------
function SummaryView({ rows, all }) {
  const s = useMemo(() => summarize(rows), [rows])
  const prof = useMemo(() => profile(rows), [rows])
  const cm = useMemo(() => corrMatrix(rows), [rows])
  if (!rows.length) return <p className="muted">No tests match these filters.</p>
  const flags = []
  const zeroP = rows.filter((r) => r.pressure_kpa != null && r.pressure_kpa <= 1)
  if (zeroP.length) flags.push(`${zeroP.length} row${zeroP.length > 1 ? 's' : ''} record a total pressure of ${fmt(Math.min(...zeroP.map((r) => r.pressure_kpa)), 2)} kPa (${[...new Set(zeroP.map((r) => `${r.experiment} ${r.source_row_or_page}`))].join(', ')}), which is not a physical test atmosphere and is probably a missing value in the source table. It is kept, not corrected.`)
  const dupKeys = new Map(); for (const r of rows) { const k = `${r.psi_id}|${r.test_id}`; dupKeys.set(k, (dupKeys.get(k) || 0) + 1) }
  const dups = [...dupKeys.values()].filter((n) => n > 1).length
  if (dups) flags.push(`${dups} test ids appear on more than one row (repeat runs or sub-rows in the source). Test id is not a unique key.`)
  const z = cm.z.map((r) => r.map((c) => c.r)), txt = cm.z.map((r) => r.map((c) => (c.r == null ? 'n/a' : `${c.r.toFixed(2)}<br>n=${c.n}`)))
  const names = cm.keys.map(colTitle)
  return (
    <>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        {[['Tests', s.n.toLocaleString(), `of ${all.toLocaleString()}`], ['Experiments', s.experiments.length, 'contributing'], ['Oxygen and pressure', s.both.toLocaleString(), 'rows record both'], ['Outcome stated', s.stated.toLocaleString(), `${fmt((s.stated / s.n) * 100, 0)}% of the selection`]].map(([k, v, n]) => <div className="card stat" key={k}><div className="k">{k}</div><div className="v">{v}</div><div className="n">{n}</div></div>)}
      </div>
      {flags.length > 0 && <div className="callout neutral"><b>Data-quality notes (computed from this selection)</b><ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{flags.map((f) => <li key={f}>{f}</li>)}</ul></div>}
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <section className="card">
          <div className="card-head"><h3>Column profile</h3><span className="small">completeness and distribution</span></div>
          <div className="tbl-wrap" style={{ maxHeight: 520 }}>
            <table className="profile"><thead><tr><th>Column</th><th>Filled</th><th>Distinct</th><th>Range or top values</th></tr></thead>
              <tbody>{prof.filter((p) => p.kind !== 'id').map((p) => (
                <tr key={p.key}><td>{p.label}</td><td className="n"><span className="fillbar"><i style={{ width: `${p.fill * 100}%` }} /></span>{fmt(p.fill * 100, 0)}%</td><td className="n">{p.distinct}</td>
                  <td>{p.kind === 'num' && p.n ? <span className="num">{fmt(p.min, 2)} / {fmt(p.median, 2)} / {fmt(p.max, 2)}</span> : p.top?.length ? p.top.map(([v, n]) => `${label(p.key, v)} (${n})`).join(', ') : <span className="muted">none</span>}</td></tr>))}</tbody></table>
          </div>
          <p className="small" style={{ margin: '8px 0 0' }}>Numeric columns show min / median / max.</p>
        </section>
        <ChartCard title="Rank correlation between conditions" sub="Spearman, pairwise-complete rows" data={[{ type: 'heatmap', z, x: names, y: names, text: txt, texttemplate: '%{text}', textfont: { size: 11 }, zmin: -1, zmax: 1, colorscale: 'RdBu', reversescale: true, showscale: true, colorbar: { title: { text: 'Spearman ρ' } }, hoverongaps: false }]}
          layout={{ xaxis: { title: { text: 'Variable' }, automargin: true }, yaxis: { title: { text: 'Variable' }, autorange: 'reversed', automargin: true }, height: 460 }} notes="n/a where fewer than 5 rows share both values or a column is constant. Correlation is descriptive, not causal, and rows are not independent samples." name="explore_spearman" />
      </div>
    </>
  )
}

// ---- page ---------------------------------------------------------------------------------------------------------
export default function Explore() {
  const t = useAsync(getTests, [])
  const d = useAsync(getDictionary, [])
  const [sp, setSp] = useSearchParams()
  const [words, setWords] = useState('')
  const [interp, setInterp] = useState(null)
  const rows = t.data
  const state = useMemo(() => fromParams(sp), [sp])
  const view = sp.get('view') || 'table'
  const sort = sp.get('sort') || '', dir = sp.get('dir') || 'asc'
  const cols = useMemo(() => { const c = (sp.get('cols') || '').split(',').filter((k) => COL[k]); return c.length ? c : DEFAULT_COLS }, [sp])
  const vocab = useMemo(() => (rows ? buildVocab(rows) : null), [rows])
  const filtered = useMemo(() => (rows ? applyFilters(rows, state) : []), [rows, state])
  const counts = useMemo(() => (rows ? facetCounts(rows, state) : {}), [rows, state])
  const bounds = useMemo(() => (rows ? rangeBounds(rows) : {}), [rows])
  const sum = useMemo(() => summarize(filtered), [filtered])
  const relax = useMemo(() => (rows && !filtered.length && !isEmpty(state) ? explainEmpty(rows, state) : []), [rows, filtered, state])

  const push = (st, extra = {}) => setSp(toParams(st, { view: view === 'table' ? '' : view, sort, dir: sort ? dir : '', cols: sp.get('cols') || '', ...extra }), { replace: true })
  const setState = (st) => push(st)
  const setSort = (k) => (sort !== k ? push(state, { sort: k, dir: 'asc' }) : dir === 'asc' ? push(state, { dir: 'desc' }) : push(state, { sort: '', dir: '' }))
  const setCols = (c) => push(state, { cols: c.join(',') === DEFAULT_COLS.join(',') ? '' : c.join(',') })
  const setView = (v) => push(state, { view: v === 'table' ? '' : v })

  function submitWords(e) {
    e.preventDefault()
    if (!words.trim() || !rows) return
    const p = resolvePsi(parseQuery(words, vocab), rows)
    if (p.matched.length) { setInterp({ q: words, matched: p.matched }); push(p.state); setWords('') }
    else { setInterp({ q: words, matched: [] }); push({ ...emptyState(), text: words.trim() }); setWords('') }
  }
  if (t.loading || !rows) return <Loading />
  const chips = describeState(state)
  const clearOne = (i) => {
    // rebuild without the i-th described condition
    const desc = describeState(state); const target = desc[i]
    const st = { ...state, cat: { ...state.cat }, range: { ...state.range }, has: [...state.has] }
    if (target.startsWith('text')) st.text = ''
    for (const f of FACETS) if (target.startsWith(f.label.toLowerCase() + ' =')) st.cat[f.key] = []
    for (const r of RANGES) if (target.startsWith(r.label.toLowerCase() + ' ')) delete st.range[r.key]
    for (const h of HAS) if (target === `has ${h.label}`) st.has = st.has.filter((x) => x !== h.id)
    push(st)
  }

  return (
    <>
      <PageHead eyebrow="Database" title="Explore the tests" lede={`${rows.length.toLocaleString()} harmonised tests from ${vocab.experiments.length} NASA investigations in one table. Filter, chart and export without any preliminary cleaning; every column has the unit and source recorded in the dictionary.`} />
      <form className="ask-bar" onSubmit={submitWords}>
        <input type="text" value={words} onChange={(e) => setWords(e.target.value)} placeholder={'Filter in words, e.g. "FLEX droplets below 70 kPa" or "extinguished tests above 21% oxygen"'} aria-label="Filter in words" />
        <button className="btn primary sm" type="submit">Apply</button>
      </form>
      {interp && <p className="small" style={{ margin: '8px 4px 0' }}>{interp.matched.length ? <>Understood <b>&ldquo;{interp.q}&rdquo;</b> as: {interp.matched.join('; ')}. Previous filters were replaced.</> : <>No known material, experiment, outcome or number in <b>&ldquo;{interp.q}&rdquo;</b>, so it is used as a plain text search on experiment, material, fuel and test id.</>}</p>}
      <div className="ex-head">
        <span className="n">{filtered.length.toLocaleString()}</span><span className="muted">of {rows.length.toLocaleString()} tests</span>
        <span className="small">{sum.both.toLocaleString()} record oxygen and pressure &middot; {sum.stated.toLocaleString()} state an outcome &middot; {sum.experiments.length} experiment{sum.experiments.length === 1 ? '' : 's'}</span>
      </div>
      {chips.length > 0 && <div className="fchips" style={{ marginBottom: 12 }}>{chips.map((c, i) => <span className="fchip" key={c}>{c}<button onClick={() => clearOne(i)} aria-label={`Remove ${c}`}>&times;</button></span>)}<button className="btn sm" onClick={() => { setInterp(null); push(emptyState()) }}>Clear all</button></div>}
      {relax.length > 0 && <div className="callout neutral"><b>Nothing matches every condition.</b> <ul className="relax">{relax.slice(0, 4).map((c) => <li key={c.desc}>Dropping <strong>{c.desc}</strong> gives {c.rowsWithout.toLocaleString()} tests{c.unrecorded != null ? `; ${c.unrecorded.toLocaleString()} of them do not record ${c.quantity} at all` : ''}.</li>)}</ul></div>}
      <div className="explore">
        <Sidebar state={state} counts={counts} bounds={bounds} setState={setState} />
        <div>
          <Tabs tabs={[{ id: 'table', label: 'Table' }, { id: 'charts', label: 'Charts' }, { id: 'summary', label: 'Summary' }]} value={view} onChange={setView} />
          {view === 'table' && <TableView rows={filtered} cols={cols} setCols={setCols} sort={sort} dir={dir} setSort={setSort} dict={d.data} state={state} />}
          {view === 'charts' && <ChartsView rows={filtered} total={rows.length} />}
          {view === 'summary' && <SummaryView rows={filtered} all={rows.length} />}
        </div>
      </div>
    </>
  )
}
