import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getAnalytics, getInvestigations } from '../lib/data.js'
import { loadIndex } from '../lib/useIndex.js'
import { retrieve, relatedInvestigations, llmStatus, buildPrompt, verifyNumbers } from '../lib/rag.js'
import { openalex, crossref, zenodo, arxiv, settle } from '../lib/ext.js'
import { PageHead, Interp } from '../components/ui.jsx'

const PRESETS = [
  'Does a 30% oxygen cabin at 10.2 psi change the response of optical smoke detectors?',
  'How does oxygen partial pressure versus mole fraction control flame extinction in microgravity?',
  'Can cool-flame behavior at reduced pressure be used to design a suppression test?',
  'What solid-fuel flammability tests are missing for lunar-gravity cabin atmospheres?',
]

function ExtList({ r }) {
  if (!r.ok) return <p className="small" style={{ color: 'var(--bad)' }}>{r.name}: {r.error}. The proxy may be rate limited or offline; the other sources still apply.</p>
  const d = r.data, items = d.items || [...(d.top || []).slice(0, 4), ...(d.recent || []).slice(0, 3)]
  return (
    <div className="card flat"><div className="card-head"><h4>{d.source}</h4>{d.total != null && <span className="chip">{d.total.toLocaleString()} matches</span>}</div>
      <ul className="clean">{items.slice(0, 7).map((w, i) => <li key={i}><a href={w.url} target="_blank" rel="noreferrer">{w.title || 'Untitled'}</a> <span className="small">{[w.year, w.venue, w.cites != null ? `${w.cites} citations` : null].filter(Boolean).join(', ')}</span></li>)}</ul></div>
  )
}

export default function Studio() {
  const [q, setQ] = useState(PRESETS[0])
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState(null)
  const [draft, setDraft] = useState(null)
  const [err, setErr] = useState('')

  async function run() {
    setBusy(true); setDraft(null); setErr('')
    const [ix, an, invs, llm] = await Promise.all([loadIndex(), getAnalytics(), getInvestigations(), llmStatus()])
    const hits = retrieve(ix, q, 8)
    const rel = relatedInvestigations(ix, q, 5)
    const gaps = rel.map((h) => ({ id: h.id, name: h.meta.title, fp: an.fingerprint.by_investigation[h.id] })).filter((g) => g.fp)
    const ext = await Promise.all([settle('OpenAlex', () => openalex(q)), settle('Crossref', () => crossref(q)), settle('Zenodo', () => zenodo(q)), settle('arXiv', () => arxiv(q))])
    setRes({ q, hits, gaps, ext, llm, n: ix.N, invs })
    setBusy(false)
  }
  async function propose() {
    setBusy(true); setErr('')
    try {
      const sources = [...res.hits, ...res.ext.filter((e) => e.ok).flatMap((e) => (e.data.top || e.data.items || []).slice(0, 3).filter((w) => w.abstract).map((w) => ({ t: `${w.title}. ${w.abstract}`, meta: { title: `${w.title} (${w.year || 'n.d.'}, ${e.data.source})`, where: '' } })))]
      const { system, messages } = buildPrompt(`Draft a one-page research proposal for this question: ${res.q}\nSections: Question; Why it is open (cite sources); Proposed experiment or analysis using conditions the data cannot yet cover; Hypotheses with the result that would refute each; Measurements; Risks. Use only the sources.`, sources)
      const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system, messages, maxTokens: 1500, temperature: 0.2 }) })
      const j = await r.json()
      if (!j.ok) throw new Error(j.error)
      setDraft({ text: j.text, model: j.model, unverified: verifyNumbers(j.text, sources), sources })
    } catch (e) { setErr(e.message) }
    setBusy(false)
  }
  const md = () => {
    const lines = [`# Research brief: ${res.q}`, '', '## Evidence in the NASA corpus', ...res.hits.map((h, i) => `${i + 1}. ${h.meta.title}${h.meta.where ? ` (${h.meta.where})` : ''}: "${h.snippet[0]}"`), '', '## What the related tables record', ...res.gaps.map((g) => `- ${g.name}: ` + Object.entries(g.fp).map(([k, v]) => `${k} ${v.status}`).join(', ')), draft ? `\n## Draft proposal (${draft.model})\n\n${draft.text}` : '']
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/markdown' })); a.download = 'research-brief.md'; a.click()
  }
  return (
    <>
      <PageHead eyebrow="Research Studio" title="From a question to a grounded proposal" lede="Type a research question. The Studio retrieves cited passages from the NASA corpus, shows what the related PSI tables actually recorded, scans OpenAlex, Crossref, Zenodo and arXiv for what exists outside NASA, and, with an LLM key on the server, drafts a proposal that cites only what it retrieved." />
      <div className="card">
        <div className="row" style={{ flexWrap: 'nowrap' }}><textarea rows={2} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Research question" /><button className="btn primary" disabled={busy || q.length < 8} onClick={run}>{busy && !res ? 'Searching...' : 'Build brief'}</button></div>
        <div className="row" style={{ marginTop: 8 }}>{PRESETS.map((p) => <button key={p} className="btn sm" onClick={() => setQ(p)}>{p.length > 62 ? p.slice(0, 60) + '...' : p}</button>)}</div>
      </div>
      {res && (
        <div className="grid" style={{ marginTop: 20 }}>
          <div className="grid g2">
            <div className="card"><h3>1. Evidence in the NASA corpus</h3>
              {res.hits.length === 0 && <p className="muted">Nothing in {res.n.toLocaleString()} indexed passages matches. That is itself informative, but check the wording.</p>}
              {res.hits.map((h, i) => <div className="src-card" key={h.id}><div className="t"><span className="cite">{i + 1}</span> {h.meta.route ? <Link to={h.meta.route}>{h.meta.title}</Link> : <a href={h.meta.url} target="_blank" rel="noreferrer">{h.meta.title}</a>} <span className="small">{h.meta.year} {h.meta.where}</span></div><div className="x">&ldquo;{h.snippet[0]}&rdquo;</div></div>)}</div>
            <div className="card"><h3>2. What the related tables record</h3>
              <p className="small">For each related investigation: which variables vary in its table. Empty or constant variables are what the data cannot answer.</p>
              {res.gaps.length === 0 && <p className="muted">No PSI record matched strongly.</p>}
              {res.gaps.map((g) => <div key={g.id} style={{ marginBottom: 10 }}><Link to={`/i/${g.id}`}><b>{g.name}</b></Link><div className="row" style={{ gap: 5, marginTop: 4 }}>{Object.entries(g.fp).map(([k, v]) => <span key={k} className={`chip ${v.status === 'varies' ? 'ok' : v.status === 'constant' ? 'warn' : 'bad'}`}>{k}</span>)}</div></div>)}
              <p className="small"><Interp /> Red and amber variables are candidate gaps for a new experiment or analysis. See the <Link to="/atlas">Atlas</Link> for the O₂ and pressure design ranking.</p></div>
          </div>
          <div className="card"><h3>3. What exists outside NASA</h3><p className="small">Live queries through the server proxy. Match counts are keyword matches, a coarse indicator of how crowded the topic is, not a novelty proof.</p>
            <div className="grid g2">{res.ext.map((e) => <ExtList key={e.name} r={e} />)}</div></div>
          <div className="card"><div className="card-head"><h3>4. Proposal</h3><span className="row"><button className="btn sm" onClick={md}>Download brief (.md)</button>{res.llm.configured && <button className="btn sm primary" disabled={busy} onClick={propose}>{busy ? 'Drafting...' : 'Draft proposal with LLM'}</button>}</span></div>
            {!res.llm.configured && <p className="muted">Parts 1 to 3 are the grounded, key-free brief. Add LLM_API_KEY to the server .env to draft the narrative proposal from them.</p>}
            {err && <div className="callout bad">{err}</div>}
            {draft && <div className="callout neutral"><b>Draft ({draft.model}), grounded in {draft.sources.length} sources</b><div style={{ whiteSpace: 'pre-wrap' }}>{draft.text}</div>{draft.unverified.length > 0 ? <p className="small" style={{ color: 'var(--bad)' }}>Numbers not found in the sources: {draft.unverified.join(', ')}. Verify before use.</p> : <p className="small">All numbers in the draft appear in the retrieved sources.</p>}</div>}
          </div>
        </div>
      )}
    </>
  )
}
