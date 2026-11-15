import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIndex } from '../lib/useIndex.js'
import { retrieve, highlight, relatedInvestigations, askLLM, llmStatus } from '../lib/rag.js'

const SUGGEST = [
  'What do we know about flame extinction at reduced pressure?',
  'How does oxygen fraction versus partial pressure affect flammability?',
  'Which investigations measured smoke particle size?',
  'What is the limiting oxygen concentration for PMMA in microgravity?',
  'What happens to fire suppression in a 30% oxygen cabin?',
]

function Snippet({ text, q }) {
  return <>{highlight(text, q).map((p, i) => (p.hit ? <mark key={i}>{p.w}</mark> : <span key={i}>{p.w}</span>))}</>
}

export function AskResult({ r }) {
  return (
    <div>
      {r.llm && (
        <div className="callout neutral">
          <b>Model synthesis ({r.llm.model})</b>
          <div style={{ whiteSpace: 'pre-wrap' }}>{r.llm.text}</div>
          {r.llm.unverified.length > 0 && <p className="small" style={{ marginTop: 6, color: 'var(--bad)' }}>Numbers not found in the retrieved text: {r.llm.unverified.join(', ')}. Treat them as unverified.</p>}
          {r.llm.unverified.length === 0 && <p className="small" style={{ marginTop: 6 }}>Every number in this synthesis appears in the retrieved passages.</p>}
        </div>
      )}
      {r.llmError && <div className="callout bad">{r.llmError}</div>}
      {r.inv.length > 0 && (
        <p className="row" style={{ gap: 6 }}><span className="small">Related investigations</span>{r.inv.map((h) => <Link key={h.id} className="chip" to={h.meta.route}>{h.meta.title}</Link>)}</p>
      )}
      {r.hits.length === 0 && <p className="muted">No passage in the corpus matches this question. The corpus holds {r.n} passages; rephrase with the fuel, hardware or quantity names.</p>}
      {r.hits.map((h, i) => (
        <div className="src-card" key={h.id}>
          <div className="t"><span className="cite">{i + 1}</span> {h.meta.route ? <Link to={h.meta.route}>{h.meta.title}</Link> : <a href={h.meta.url} target="_blank" rel="noreferrer">{h.meta.title}</a>} <span className="small">{h.meta.kind}{h.meta.year ? `, ${h.meta.year}` : ''}{h.meta.where ? `, ${h.meta.where}` : ''}</span></div>
          {h.snippet.map((s, j) => <div className="x" key={j}>&ldquo;<Snippet text={s} q={r.q} />&rdquo;</div>)}
        </div>
      ))}
    </div>
  )
}

export function AskPanel({ seed, nonce, autoFocus }) {
  const ix = useIndex()
  const [q, setQ] = useState('')
  const [log, setLog] = useState([])
  const [llm, setLlm] = useState({ configured: false })
  const [busy, setBusy] = useState(false)
  const end = useRef(null)
  useEffect(() => { llmStatus().then(setLlm) }, [])
  useEffect(() => { if (seed && ix) run(seed) }, [seed, nonce, ix]) // eslint-disable-line
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [log])

  async function run(text, synth = false) {
    if (!ix || !text.trim()) return
    const hits = retrieve(ix, text, 6)
    const entry = { q: text, hits, inv: relatedInvestigations(ix, text), n: ix.N }
    setLog((l) => [...l, entry]); setQ('')
    if (synth && hits.length) await synthesize(entry, hits)
  }
  async function synthesize(entry, hits = entry.hits) {
    setBusy(true)
    try { const out = await askLLM(entry.q, hits); setLog((l) => l.map((e) => (e === entry ? { ...e, llm: out, llmError: null } : e))) }
    catch (e) { setLog((l) => l.map((x) => (x === entry ? { ...x, llmError: e.message } : x))) }
    setBusy(false)
  }
  return (
    <>
      <div className="drawer-body">
        {!log.length && (
          <>
            <p className="muted">Ask a research question. Answers are built from passages in {ix ? ix.N.toLocaleString() : '...'} indexed pages of NASA reports, PSI records and Atlas analyses, each with a citation.</p>
            <ul className="clean">{SUGGEST.map((s) => <li key={s}><button className="btn sm" onClick={() => run(s)}>{s}</button></li>)}</ul>
          </>
        )}
        {log.map((e, i) => (
          <div className="msg" key={i}>
            <div className="msg user">{e.q}</div>
            <AskResult r={e} />
            <div className="row">
              {llm.configured ? <button className="btn sm" disabled={busy || !e.hits.length} onClick={() => synthesize(e)}>{busy ? 'Working...' : e.llm ? 'Re-synthesize' : 'Synthesize with LLM'}</button>
                : <span className="small">Extractive mode: no LLM key on the server. Add LLM_API_KEY to .env to enable synthesis.</span>}
            </div>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form className="drawer-foot" onSubmit={(e) => { e.preventDefault(); run(q) }}>
        <div className="row" style={{ flexWrap: 'nowrap' }}>
          <input type="text" autoFocus={autoFocus} value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. smoke detection at low pressure" aria-label="Research question" />
          <button className="btn dark" disabled={!ix}>Ask</button>
        </div>
      </form>
    </>
  )
}

export default function AskDrawer({ open, seed, nonce, onClose }) {
  return (
    <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="Ask the corpus">
      <div className="drawer-head"><div><h3 style={{ margin: 0 }}>Ask the corpus</h3><span className="small">Cited retrieval over NASA PSI and NTRS</span></div><button className="btn sm" onClick={onClose}>Close</button></div>
      {open && <AskPanel seed={seed} nonce={nonce} autoFocus />}
    </aside>
  )
}
