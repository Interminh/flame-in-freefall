import { useEffect, useRef, useState } from 'react'
import { useIgnis, Composer, Turn, suggestionsFrom } from './Ignis.jsx'
import { useAtlas } from '../lib/useAtlas.js'

// Slide-over version of Ignis AI for every page except the landing page (which has the full-size prompt).
export function AskPanel({ seed, nonce }) {
  const ig = useIgnis()
  const at = useAtlas()
  const [q, setQ] = useState('')
  const end = useRef(null)
  useEffect(() => { if (seed && ig.ready) ig.run(seed) }, [seed, nonce, ig.ready]) // eslint-disable-line
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [ig.log.length])
  const sug = suggestionsFrom({ rows: ig.rows, vocab: ig.vocab, meta: at.meta })
  return (
    <>
      <div className="drawer-body">
        {!ig.log.length && (
          <>
            <p className="muted">Ask in plain words. Ignis AI filters the harmonised test table for counts and ranges, and retrieves cited passages from {ig.ix ? ig.ix.N.toLocaleString() : '...'} indexed pages of NASA reports and PSI records.</p>
            <ul className="clean">{sug.map((s) => <li key={s.text}><button className="btn sm" onClick={() => ig.run(s.text)}>{s.text}{s.n ? ` (${s.n})` : ''}</button></li>)}</ul>
          </>
        )}
        <div className="ig-chat" style={{ padding: 0 }}>
          {ig.log.map((e, i) => <Turn key={i} e={e} llm={ig.llm} busy={ig.busy} onSynth={ig.synthesize} />)}
        </div>
        <div ref={end} />
      </div>
      <div className="drawer-foot">
        <Composer value={q} onChange={setQ} disabled={!ig.ready} placeholder="Ask about the data or the reports" onSubmit={() => { ig.run(q); setQ('') }} autoFocus />
      </div>
    </>
  )
}

export default function AskDrawer({ open, seed, nonce, onClose }) {
  return (
    <aside className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open} aria-label="Ignis AI" style={{ width: 'min(560px, 100vw)' }}>
      <div className="drawer-head"><div><h3 style={{ margin: 0 }}>Ignis AI</h3><span className="small">Data answers and cited NASA passages</span></div><button className="btn sm" onClick={onClose}>Close</button></div>
      {open && <AskPanel seed={seed} nonce={nonce} />}
    </aside>
  )
}
