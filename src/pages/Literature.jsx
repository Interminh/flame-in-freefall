import { Fragment, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getLiterature, getInvestigations } from '../lib/data.js'
import { useIndex } from '../lib/useIndex.js'
import { retrieve, highlight } from '../lib/rag.js'
import { PageHead, useAsync, Loading, ChartCard } from '../components/ui.jsx'
import { OKABE } from '../lib/theme.js'

export default function Literature() {
  const st = useAsync(() => Promise.all([getLiterature(), getInvestigations()]))
  const ix = useIndex()
  const [q, setQ] = useState('')
  const [topic, setTopic] = useState('all')
  const [inv, setInv] = useState('all')
  const [open, setOpen] = useState(null)
  const [lit, invs] = st.data || []
  const topics = useMemo(() => [...new Set((lit || []).flatMap((d) => d.topics || []))].sort(), [lit])
  const list = useMemo(() => (lit || []).filter((d) => (topic === 'all' || (d.topics || []).includes(topic)) && (inv === 'all' || (d.investigations || []).includes(inv))).sort((a, b) => b.year - a.year), [lit, topic, inv])
  const hits = useMemo(() => (ix && q.trim().length > 2 ? retrieve(ix, q, 12, { perDoc: 2 }).filter((h) => h.src === 'ntrs') : []), [ix, q])
  if (st.loading) return <Loading />
  const perInv = (invs || []).map((i) => ({ id: i.psi_id, n: lit.filter((d) => (d.investigations || []).includes(i.psi_id)).length })).filter((x) => x.n).sort((a, b) => b.n - a.n)
  return (
    <>
      <PageHead eyebrow="Corpus" title="Literature" lede={`${lit.length} NASA Technical Reports Server records on microgravity combustion and spacecraft fire safety, ${lit.filter((d) => d.in_corpus).length} with full text indexed page by page. Search passages directly or browse by topic and investigation.`} />
      <div className="row" style={{ marginBottom: 12 }}>
        <input type="search" style={{ maxWidth: 420 }} placeholder="Search passages: e.g. blowoff limit PMMA rod, smoke detector alarm threshold" value={q} onChange={(e) => setQ(e.target.value)} />
        <select value={topic} onChange={(e) => setTopic(e.target.value)} style={{ width: 'auto' }}><option value="all">All topics</option>{topics.map((t) => <option key={t}>{t}</option>)}</select>
        <select value={inv} onChange={(e) => setInv(e.target.value)} style={{ width: 'auto' }}><option value="all">All investigations</option>{invs.map((i) => <option key={i.psi_id} value={i.psi_id}>{i.psi_id} {i.name}</option>)}</select>
        <button className="btn primary sm" disabled={!q.trim()} onClick={() => window.faAsk(q)}>Ask this in the drawer</button>
      </div>
      {hits.length > 0 && <div className="card" style={{ marginBottom: 18 }}><h3>Passages matching &ldquo;{q}&rdquo;</h3>{hits.map((h, i) => <div className="src-card" key={h.id}><div className="t"><a href={h.meta.url} target="_blank" rel="noreferrer">{h.meta.title}</a> <span className="small">{h.meta.year}, {h.meta.where}</span></div>{h.snippet.map((s, j) => <div className="x" key={j}>&ldquo;{highlight(s, q).map((p, k) => (p.hit ? <mark key={k}>{p.w}</mark> : <span key={k}>{p.w}</span>))}&rdquo;</div>)}</div>)}</div>}
      <div className="split" style={{ gridTemplateColumns: 'minmax(0,1fr) 340px' }}>
        <div className="tbl-wrap" style={{ maxHeight: 'none' }}><table><thead><tr><th>Year</th><th>Title</th><th>Center</th><th>Topics</th></tr></thead><tbody>
          {list.map((d) => (<Fragment key={d.id}>
            <tr onClick={() => setOpen(open === d.id ? null : d.id)} style={{ cursor: 'pointer' }}><td className="n">{d.year}</td><td>{d.title}{d.in_corpus ? '' : <span className="chip warn" style={{ marginLeft: 6 }}>metadata only</span>}</td><td className="small">{d.center}</td><td className="small">{(d.topics || []).join(', ')}</td></tr>
            {open === d.id && <tr><td /><td colSpan={3}><p className="small">{d.abstract}</p><div className="row">{(d.investigations || []).map((i) => <Link className="chip" key={i} to={`/i/${i}`}>{i}</Link>)}<a className="btn sm" href={d.url} target="_blank" rel="noreferrer">Open on NTRS</a><button className="btn sm" onClick={() => window.faAsk(`Summarize the key findings of ${d.title}`)}>Ask about this report</button></div></td></tr>}
          </Fragment>))}</tbody></table></div>
        <div className="grid">
          <ChartCard size="short" title="Reports linked to each investigation" data={[{ type: 'bar', orientation: 'h', y: perInv.map((x) => x.id).reverse(), x: perInv.map((x) => x.n).reverse(), marker: { color: OKABE[0] } }]} layout={{ margin: { l: 70 } }} source="public/data/literature.json" />
          <div className="card flat"><h4>Scope</h4><p className="small">{lit.length} records after excluding workshop proceedings and off-topic items. Mapping to investigations is by report-number and title match and is not exhaustive. Full text comes from NTRS PDFs; reports without a downloadable PDF are searchable by abstract only.</p></div>
        </div>
      </div>
    </>
  )
}
