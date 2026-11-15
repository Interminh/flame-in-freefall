import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { getTests, getInvestigations, getDatasetIndex, getAnalytics, getDictionary, PILLARS } from '../lib/data.js'
import { structure, exampleRow, hasOutcome, hasBoth } from '../lib/structure.js'
import { ChartCard, PageHead, Stat, useAsync, Loading } from '../components/ui.jsx'
import { OKABE } from '../lib/theme.js'
import { fmt } from '../lib/stats.js'

const N = (v) => v.toLocaleString()
const pct = (a, b) => `${Math.round((100 * a) / b)}%`

const GROUPS = [
  ['Identity', ['psi_id', 'experiment', 'test_id', 'platform']],
  ['Conditions', ['fuel', 'material', 'form', 'fuel_thickness_mm', 'rod_diameter_mm', 'o2_percent', 'pressure_kpa', 'ppo2_kpa', 'flow_velocity_cm_s', 'flow_direction', 'gravity_g']],
  ['Outcome', ['outcome', 'outcome_class', 'spread_rate_mm_s', 'extinction_reason']],
  ['Provenance', ['source_file', 'source_row_or_page']],
]

function Step({ n, title, count, sub, children }) {
  return (
    <div className="step">
      <div className="step-n">{n}</div>
      <h4>{title}</h4>
      <div className="step-count">{count}</div>
      <p className="small">{sub}</p>
      {children}
    </div>
  )
}

export default function Guide() {
  const st = useAsync(() => Promise.all([getTests(), getInvestigations(), getDatasetIndex(), getAnalytics(), getDictionary()]))
  const S = useMemo(() => (st.data ? structure({ tests: st.data[0], invs: st.data[1], idx: st.data[2], analytics: st.data[3] }) : null), [st.data])
  if (st.loading) return <Loading />
  if (st.error || !S) return <div className="callout bad">Could not load the data guide.</div>
  const [tests, , , , dict] = st.data
  const T = S.totals
  const meaning = Object.fromEntries([...dict.unified, ...dict.derived].map((c) => [c.key, c]))
  const ex = exampleRow(tests, Object.keys(tests[0]))
  const exInv = S.byId[ex.psi_id]
  const emptyFields = Object.keys(ex).filter((k) => ex[k] == null || ex[k] === '')
  const pillarCounts = Object.keys(PILLARS).map((k) => [k, S.items.filter((i) => i.inv.pillar === k).length])
  const hv = S.harmonised.slice().sort((a, b) => b.harmonised - a.harmonised)
  const cat = (name, f, color) => ({ type: 'bar', orientation: 'h', name, y: hv.map((i) => i.inv.name), x: hv.map((i) => tests.filter((t) => t.psi_id === i.inv.psi_id).filter(f).length), marker: { color } })
  const bars = [
    cat('O₂, pressure and outcome', (t) => hasBoth(t) && hasOutcome(t), OKABE[2]),
    cat('O₂ and pressure, no outcome', (t) => hasBoth(t) && !hasOutcome(t), OKABE[1]),
    cat('Outcome, but not O₂ with pressure', (t) => !hasBoth(t) && hasOutcome(t), OKABE[5]),
    cat('Neither', (t) => !hasBoth(t) && !hasOutcome(t), '#cfcabd'),
  ]
  const noPressure = hv.filter((i) => i.both === 0)

  return (
    <>
      <PageHead eyebrow="Start here" title="Dataset guide" lede="A plain-language map of the NASA data: how it is organised, what one row is, and what each investigation can and cannot tell you." />

      <div className="grid g4" style={{ marginBottom: 26 }}>
        <Stat k="Investigations" v={T.investigations} n={`${pillarCounts.map(([k, n]) => `${n} ${PILLARS[k].label.toLowerCase()}`).join(', ')}`} />
        <Stat k="Datasets with data" v={T.withData} n={`${T.tables} tables, ${T.series} numeric series; ${T.empty.length} have no data file`} />
        <Stat k="Harmonised test rows" v={N(T.harmonisedRows)} n={`from ${T.harmonisedInvs} investigations`} />
        <Stat k="Rows that state an outcome" v={pct(T.withOutcome, T.harmonisedRows)} n={`${N(T.withOutcome)} of ${N(T.harmonisedRows)}`} />
      </div>

      <h2>1. How the data is organised</h2>
      <p className="lede" style={{ maxWidth: '78ch' }}>Everything follows one chain. Each link narrows the one before it.</p>
      <div className="steps">
        <Step n="1" title="Pillar" count={pillarCounts.length} sub="The fire-safety question an investigation serves: three pillars plus a context group of supporting work.">
          <div className="mini">{pillarCounts.map(([k, n]) => <span key={k} className={`chip ${k}`}>{PILLARS[k].label} {n}</span>)}</div>
        </Step>
        <Step n="2" title="Investigation" count={T.investigations} sub="One NASA experiment, identified as PSI-nn, run on a rig such as ACME, FLEX or SAFFIRE." />
        <Step n="3" title="Dataset" count={T.withData} sub={`The data file behind an investigation: ${T.tables} tables and ${T.series} numeric series.`} />
        <Step n="4" title="Row" count={N(T.harmonisedRows)} sub={`Harmonised test rows: one test, run or sample each. The ${T.series} series add ${N(T.seriesPoints)} numeric cells.`} />
        <Step n="5" title="Column" count={Object.keys(tests[0]).length} sub="Harmonised columns: a condition, an outcome, or provenance. Each table also keeps its raw source columns." />
      </div>

      <h2 style={{ marginTop: 34 }}>2. What one row looks like</h2>
      <p className="lede" style={{ maxWidth: '78ch' }}>A real row from the harmonised table: test <b>{ex.test_id}</b> of <b>{ex.experiment}</b> ({ex.psi_id}). {emptyFields.length} of its {Object.keys(ex).length} fields are empty; an empty field means the source did not record it, never zero. Hover a field name for its meaning; the full dictionary is at the bottom.</p>
      <div className="anatomy">
        {GROUPS.map(([g, keys]) => (
          <div className="card flat" key={g}>
            <h4>{g}</h4>
            <dl>{keys.map((k) => {
              const v = ex[k], m = meaning[k]
              return <div key={k} className={v == null || v === '' ? 'empty' : ''} title={m ? `${m.meaning}${m.domain && m.domain !== 'text' ? ` (${m.domain})` : ''}` : ''}><dt>{k}</dt><dd>{v == null || v === '' ? 'not recorded' : String(v)}</dd></div>
            })}</dl>
          </div>
        ))}
      </div>

      <h2 style={{ marginTop: 34 }}>3. How complete the rows are</h2>
      <p className="lede" style={{ maxWidth: '78ch' }}>A flammability question needs the atmosphere (O₂ and pressure) and an outcome in the same row. Only <b>{N(T.withAll3)}</b> of {N(T.harmonisedRows)} rows have all three. {noPressure.length ? `${noPressure.map((i) => i.inv.name).join(', ')} never record${noPressure.length === 1 ? 's' : ''} pressure with O₂.` : ''}</p>
      <ChartCard title="What each experiment's rows contain" sub="Rows per experiment, split by which of the three are present" data={bars}
        layout={{ barmode: 'stack', xaxis: { title: 'Rows' }, yaxis: { autorange: 'reversed' }, margin: { l: 130 } }}
        notes={`Outcome means the source states ignited, extinguished, no ignition or burned out. The rest are unknown, which is ${pct(T.harmonisedRows - T.withOutcome, T.harmonisedRows)} of all rows.`} source="public/data/tests.json" />

      <h2 style={{ marginTop: 34 }}>4. What is not in the harmonised table</h2>
      <p className="lede" style={{ maxWidth: '78ch' }}>{S.items.length - T.harmonisedInvs} investigations do not contribute rows to the {N(T.harmonisedRows)}-row table. Their data are still available on each datasheet.</p>
      <div className="grid g3">
        {[
          ['Numeric series', 'Many x-y series, not individual tests', S.outside.series],
          ['Tables not merged', 'Test tables that were not mapped into the unified columns', S.outside.notMerged],
          ['No data file', 'The PSI record lists no downloadable table', S.outside.empty],
        ].map(([t, d, list]) => (
          <div className="card flat" key={t}><h4>{t} <span className="count">{list.length}</span></h4><p className="small">{d}</p>
            <ul className="clean">{list.map((i) => <li key={i.inv.psi_id}><Link to={`/i/${i.inv.psi_id}`}>{i.inv.psi_id} {i.inv.name}</Link>{i.rows ? <span className="small"> · {N(i.rows)} {i.kind === 'series' ? 'cells' : 'rows'}</span> : null}</li>)}</ul></div>
        ))}
      </div>

      <h2 style={{ marginTop: 34 }}>5. Column dictionary</h2>
      <details className="card flat">
        <summary>Column dictionary: {dict.unified.length + dict.derived.length} entries, {[...dict.unified, ...dict.derived].filter((c) => c.key in tests[0]).length} of them in the harmonised table</summary>
        <div className="tbl-wrap flush" style={{ marginTop: 10 }}><table><thead><tr><th>Column</th><th>Meaning</th><th>Units or values</th><th>Source or derivation</th></tr></thead>
          <tbody>{dict.unified.map((c) => <tr key={c.key}><td className="mono">{c.key}</td><td>{c.meaning}</td><td>{c.domain}</td><td className="small">{c.source}</td></tr>)}
            {dict.derived.map((c) => <tr key={c.key}><td className="mono">{c.key}</td><td>{c.meaning}</td><td>{c.domain}</td><td className="small">Derived by scripts/pipeline/build_data.py</td></tr>)}</tbody></table></div>
      </details>

      <div className="row" style={{ marginTop: 26 }}>
        <Link className="btn primary" to="/investigations">Browse all {T.investigations} investigations</Link>
        <Link className="btn" to="/atlas">Open the Flammability Atlas</Link>
        <Link className="btn" to="/compare">Compare investigations</Link>
      </div>
    </>
  )
}
