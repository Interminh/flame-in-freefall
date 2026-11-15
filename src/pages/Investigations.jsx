import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getInvestigations, getDatasetIndex, PILLARS, pillarColor } from '../lib/data.js'
import { PageHead, PillarChip, useAsync, Loading, ChartCard } from '../components/ui.jsx'

export default function Investigations() {
  const st = useAsync(() => Promise.all([getInvestigations(), getDatasetIndex()]))
  const [q, setQ] = useState('')
  const [pillar, setPillar] = useState('all')
  const [hw, setHw] = useState('all')
  const [sort, setSort] = useState('rows')
  const [invs, idx] = st.data || []
  const rowsById = useMemo(() => Object.fromEntries((idx || []).map((d) => [d.id, d.rows])), [idx])
  const hws = useMemo(() => [...new Set((invs || []).map((i) => i.hardware).filter(Boolean))], [invs])
  const list = useMemo(() => {
    if (!invs) return []
    const t = q.toLowerCase()
    return invs.filter((i) => (pillar === 'all' || i.pillar === pillar) && (hw === 'all' || i.hardware === hw) && (!t || JSON.stringify([i.name, i.full_name, i.summary, i.tags, i.materials]).toLowerCase().includes(t)))
      .sort((a, b) => sort === 'rows' ? (rowsById[b.psi_id] || 0) - (rowsById[a.psi_id] || 0) : sort === 'year' ? (a.year_start || 9999) - (b.year_start || 9999) : a.psi_id.localeCompare(b.psi_id, undefined, { numeric: true }))
  }, [invs, q, pillar, hw, sort, rowsById])
  if (st.loading) return <Loading />
  const bar = [...invs].sort((a, b) => (rowsById[b.psi_id] || 0) - (rowsById[a.psi_id] || 0))
  return (
    <>
      <PageHead eyebrow="Catalogue" title="Investigations" lede="All 24 NASA PSI microgravity combustion investigations, organised by the three fire-safety pillars. Open one for its datasheet: every dataset has an auto-generated chart suite, the raw table, provenance, and the literature that cites it." />
      <ChartCard title="Rows of data per investigation" sub="Series datasets (PSI-47, PSI-117, PSI-142) count stored numeric cells" size="short"
        data={[{ type: 'bar', x: bar.map((i) => i.psi_id), y: bar.map((i) => rowsById[i.psi_id] || 0), text: bar.map((i) => i.name), hovertemplate: '%{text}<br>%{y} rows<extra></extra>', marker: { color: bar.map((i) => pillarColor(i.pillar)) } }]}
        layout={{ yaxis: { title: 'Rows', type: 'log' }, xaxis: { tickangle: -50 }, margin: { b: 70 } }} source="public/data/datasets/index.json" />
      <div className="row" style={{ margin: '18px 0' }}>
        <input type="search" placeholder="Search name, material, tag..." value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} />
        <select value={pillar} onChange={(e) => setPillar(e.target.value)} style={{ width: 'auto' }}><option value="all">All pillars</option>{Object.entries(PILLARS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <select value={hw} onChange={(e) => setHw(e.target.value)} style={{ width: 'auto' }}><option value="all">All hardware</option>{hws.map((h) => <option key={h}>{h}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 'auto' }}><option value="rows">Most rows</option><option value="id">PSI id</option><option value="year">Earliest</option></select>
        <span className="small">{list.length} shown</span>
      </div>
      <div className="grid g3">
        {list.map((i) => (
          <Link key={i.psi_id} to={`/i/${i.psi_id}`} className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
            <div className="card-head"><h3>{i.name}</h3><span className="mono small">{i.psi_id}</span></div>
            <div className="row" style={{ gap: 6, marginBottom: 8 }}><PillarChip pillar={i.pillar} />{i.hardware && <span className="chip">{i.hardware}</span>}{i.year_start && <span className="chip">{i.year_start}&ndash;{i.year_end || ''}</span>}</div>
            <p className="small" style={{ color: 'var(--ink-2)' }}>{(i.summary || '').slice(0, 190)}{(i.summary || '').length > 190 ? '...' : ''}</p>
            <div className="small num">{(rowsById[i.psi_id] || 0).toLocaleString()} rows</div>
          </Link>
        ))}
      </div>
    </>
  )
}
