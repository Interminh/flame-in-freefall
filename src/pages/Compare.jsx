import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getTests, getLiterature, pillarColor } from '../lib/data.js'
import { scenariosFrom } from '../lib/scaling.js'
import { OKABE } from '../lib/theme.js'
import { useAtlas } from '../lib/useAtlas.js'
import { ChartCard, PageHead, PillarChip, useAsync, Loading } from '../components/ui.jsx'

const STATUS_GLYPH = { varies: 'varies', constant: 'const', empty: 'empty' }
const MAX = 3

export default function Compare() {
  const A = useAtlas()
  const T = useAsync(() => Promise.all([getTests(), getLiterature()]))
  if (A.loading || T.loading) return <Loading />
  if (A.error || T.error) return <div className="callout bad">Could not load data.</div>
  return <CompareView {...A} tests={T.data[0]} lit={T.data[1]} />
}

function CompareView({ meta, analytics, invs, tests, lit }) {
  const [sp, setSp] = useSearchParams()
  const ids = (sp.get('ids') || '').split(',').filter((i) => invs.some((v) => v.psi_id === i)).slice(0, MAX)
  const sorted = useMemo(() => [...invs].sort((a, b) => parseInt(a.psi_id.slice(4)) - parseInt(b.psi_id.slice(4))), [invs])
  const setIds = (n) => setSp(n.length ? { ids: n.join(',') } : {}, { replace: true })
  const toggle = (id) => setIds(ids.includes(id) ? ids.filter((i) => i !== id) : ids.length < MAX ? [...ids, id] : ids)
  const sel = ids.map((id) => invs.find((v) => v.psi_id === id))
  const vars = analytics.fingerprint.variables
  const scen = scenariosFrom(meta)

  const view = useMemo(() => {
    if (!sel.length) return null
    const rows = sel.map((v) => tests.filter((t) => t.psi_id === v.psi_id && t.o2_percent != null && t.pressure_kpa != null && t.pressure_kpa > 0))
    const mats = sel.map((v) => new Set((v.materials || []).map((m) => m.toLowerCase())))
    const shared = [...mats[0]].filter((m) => mats.every((s) => s.has(m)))
    const docs = sel.map((v) => lit.filter((l) => (l.investigations || []).includes(v.psi_id)))
    const sharedDocs = docs[0].filter((d) => docs.every((ds) => ds.some((x) => x.id === d.id)))
    return { rows, shared, docs, sharedDocs }
  }, [sel.map((s) => s.psi_id).join(','), tests, lit]) // eslint-disable-line react-hooks/exhaustive-deps

  const traces = view ? sel.map((v, i) => ({ type: 'scatter', mode: 'markers', name: `${v.psi_id} ${v.name} (${view.rows[i].length})`, x: view.rows[i].map((t) => t.o2_percent), y: view.rows[i].map((t) => t.pressure_kpa),
    hovertemplate: `${v.psi_id}<br>O₂ %{x}%  p %{y} kPa<extra></extra>`, marker: { color: OKABE[i], size: 8, opacity: 0.75, symbol: ['circle', 'square', 'diamond'][i] } })) : []
  const stars = { type: 'scatter', mode: 'markers+text', name: 'Scenarios', x: scen.map((s) => s.x), y: scen.map((s) => s.p), text: scen.map((s) => s.short), textposition: 'top right', textfont: { size: 10 }, marker: { symbol: 'star', size: 11, color: '#15181d' }, hovertemplate: '%{text}<extra></extra>' }

  return (
    <>
      <PageHead eyebrow="Compare" title="Compare investigations" lede="Choose up to three investigations to see what each varied, where their tested conditions overlap, and which materials and NASA reports they share." />
      <div className="chooser">
        {sorted.map((v) => <button key={v.psi_id} className={`pick ${ids.includes(v.psi_id) ? 'on' : ''}`} onClick={() => toggle(v.psi_id)} title={v.full_name}>{v.psi_id} <span>{v.name}</span></button>)}
      </div>
      {!view && <div className="card" style={{ marginTop: 14 }}>Select two or three investigations above. Example: <Link to={`/compare?ids=${sorted.filter((v) => v.pillar === 'prevention').slice(0, 2).map((v) => v.psi_id).join(',')}`}>the first two prevention investigations</Link>.</div>}
      {view && <>
        <div className="grid g3" style={{ margin: '16px 0' }}>
          {sel.map((v, i) => <div key={v.psi_id} className="card flat" style={{ borderTop: `3px solid ${OKABE[i]}` }}>
            <div className="row spread"><b>{v.psi_id}</b><PillarChip pillar={v.pillar} /></div>
            <h4 style={{ margin: '6px 0' }}><Link to={`/i/${v.psi_id}`}>{v.name}</Link></h4>
            <p className="small" style={{ marginBottom: 4 }}>{v.hardware || v.facility}. {v.period}.</p>
            <p className="small" style={{ margin: 0 }}>{view.rows[i].length} rows with O₂ and pressure; {view.docs[i].length} linked reports.</p>
          </div>)}
        </div>
        <div className="card flat" style={{ marginBottom: 16 }}>
          <h4>Variable fingerprint</h4>
          <div className="tbl-wrap flush"><table><thead><tr><th>Variable</th>{sel.map((v) => <th key={v.psi_id}>{v.psi_id}</th>)}</tr></thead>
            <tbody>{vars.map((k) => <tr key={k}><td>{k}</td>{sel.map((v) => { const f = analytics.fingerprint.by_investigation[v.psi_id]?.[k]; return <td key={v.psi_id}><span className={`chip ${f?.status === 'varies' ? 'ok' : f?.status === 'constant' ? 'warn' : 'bad'}`}>{STATUS_GLYPH[f?.status] || 'n/a'}{f?.n_unique ? ` · ${f.n_unique}` : ''}</span></td> })}</tr>)}</tbody></table></div>
          <p className="small" style={{ margin: '8px 0 0' }}>Count after the dot is the number of distinct values. A variable can only be compared across investigations where it varies.</p>
        </div>
        <ChartCard size="tall" title="Tested O₂ and pressure" sub="Each marker is a test row that reports both" data={[...traces, stars]} layout={{ xaxis: { title: 'O₂ mole fraction (%)' }, yaxis: { title: 'Total pressure (kPa)' }, margin: { l: 60, r: 10, t: 40, b: 50 } }} notes={sel.filter((_, i) => !view.rows[i].length).length ? `No plotted rows for ${sel.filter((_, i) => !view.rows[i].length).map((v) => v.psi_id).join(', ')}: those tables do not report both O₂ and pressure.` : undefined} source="public/data/tests.json" />
        <div className="grid g2" style={{ marginTop: 16 }}>
          <div className="card flat"><h4>Shared materials</h4>{view.shared.length ? <ul className="clean">{view.shared.map((m) => <li key={m}>{m}</li>)}</ul> : <p className="small">No material is listed in all selected investigations.</p>}</div>
          <div className="card flat"><h4>Shared NASA reports</h4>{view.sharedDocs.length ? <ul className="clean">{view.sharedDocs.map((d) => <li key={d.id}><a href={d.url} target="_blank" rel="noreferrer">{d.title}</a> <span className="small">{d.year}</span></li>)}</ul> : <p className="small">No report is linked to all selected investigations.</p>}</div>
        </div>
      </>}
    </>
  )
}
