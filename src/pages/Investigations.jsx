import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getInvestigations, getDatasetIndex, getTests, getAnalytics, PILLARS } from '../lib/data.js'
import { structure } from '../lib/structure.js'
import { PageHead, PillarChip, useAsync, Loading } from '../components/ui.jsx'

const firstSentence = (t = '', n = 130) => { const s = (t.match(/^.*?[.!?](\s|$)/)?.[0] || t).trim(); return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s }
const KIND = { table: 'Table', series: 'Series', empty: 'No data file' }

export default function Investigations() {
  const st = useAsync(() => Promise.all([getInvestigations(), getDatasetIndex(), getTests(), getAnalytics()]))
  const [q, setQ] = useState('')
  const [pillar, setPillar] = useState('all')
  const [hw, setHw] = useState('all')
  const [sort, setSort] = useState('id')
  const nav = useNavigate()
  const S = useMemo(() => (st.data ? structure({ invs: st.data[0], idx: st.data[1], tests: st.data[2], analytics: st.data[3] }) : null), [st.data])
  const hws = useMemo(() => [...new Set((S?.items || []).map((i) => i.inv.hardware).filter(Boolean))], [S])
  const list = useMemo(() => {
    if (!S) return []
    const t = q.toLowerCase()
    const num = (i) => parseInt(i.inv.psi_id.slice(4))
    return S.items.filter((i) => (pillar === 'all' || i.inv.pillar === pillar) && (hw === 'all' || i.inv.hardware === hw) && (!t || JSON.stringify([i.inv.name, i.inv.full_name, i.inv.summary, i.inv.tags, i.inv.materials]).toLowerCase().includes(t)))
      .sort((a, b) => sort === 'rows' ? b.rows - a.rows : sort === 'varied' ? b.varied.length - a.varied.length : num(a) - num(b))
  }, [S, q, pillar, hw, sort])
  if (st.loading) return <Loading />
  if (!S) return <div className="callout bad">Could not load investigations.</div>
  return (
    <>
      <PageHead eyebrow="Catalogue" title="Investigations" lede={`All ${S.items.length} NASA PSI investigations on one page. Read across a row to see what an investigation studied, what data it has, which variables it changed, and how many of its tests state an outcome. Click a row for its datasheet.`} />
      <div className="row" style={{ margin: '0 0 14px' }}>
        <input type="search" placeholder="Search name, material, tag..." value={q} onChange={(e) => setQ(e.target.value)} style={{ maxWidth: 280 }} />
        <select value={pillar} onChange={(e) => setPillar(e.target.value)} style={{ width: 'auto' }}><option value="all">All pillars</option>{Object.entries(PILLARS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
        <select value={hw} onChange={(e) => setHw(e.target.value)} style={{ width: 'auto' }}><option value="all">All hardware</option>{hws.map((h) => <option key={h}>{h}</option>)}</select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} style={{ width: 'auto' }}><option value="id">PSI id</option><option value="rows">Most data</option><option value="varied">Most variables changed</option></select>
        <span className="small">{list.length} shown</span>
      </div>
      <div className="tbl-wrap catalogue"><table>
        <thead><tr><th>Investigation</th><th>What it studied</th><th>Data</th><th title="Variables that take more than one value in the table">Variables changed</th><th title="Share of harmonised rows that state an outcome">Outcome stated</th></tr></thead>
        <tbody>{list.map((i) => {
          const share = i.harmonised ? i.out / i.harmonised : null
          return (
            <tr key={i.inv.psi_id} onClick={() => nav(`/i/${i.inv.psi_id}`)} className="click">
              <td><Link to={`/i/${i.inv.psi_id}`} onClick={(e) => e.stopPropagation()}><b>{i.inv.name}</b></Link><div className="small mono">{i.inv.psi_id}</div><PillarChip pillar={i.inv.pillar} /></td>
              <td className="small">{firstSentence(i.inv.summary)}<div className="muted">{[i.inv.hardware, i.inv.fuel_type].filter(Boolean).join(' · ')}</div></td>
              <td className="small"><b>{KIND[i.kind]}</b><div className="num">{i.rows ? `${i.rows.toLocaleString()} ${i.kind === 'series' ? 'cells' : 'rows'}` : ''}</div></td>
              <td><span className="dots">{S.vars.map((v) => <i key={v} className={i.fp[v]?.status || 'empty'} title={`${v}: ${i.fp[v]?.status || 'not recorded'}`} />)}</span><div className="small muted">{i.varied.length ? i.varied.slice(0, 3).join(', ') + (i.varied.length > 3 ? ` +${i.varied.length - 3}` : '') : 'none'}</div></td>
              <td className="small">{share == null ? <span className="muted">not in harmonised table</span> : <><span className="fillbar wide"><i style={{ width: `${Math.round(share * 100)}%` }} /></span> {Math.round(share * 100)}%<div className="muted">{i.out} of {i.harmonised}</div></>}</td>
            </tr>
          )
        })}</tbody></table></div>
      <p className="small" style={{ marginTop: 10 }}>Dots follow the order {S.vars.join(', ')}. Green: varies. Amber: one value. Grey: not recorded.</p>
    </>
  )
}
