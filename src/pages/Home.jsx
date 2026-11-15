import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAtlas } from '../lib/useAtlas.js'
import { useIgnis, Composer, Turn, suggestionsFrom } from '../components/Ignis.jsx'
import { Loading } from '../components/ui.jsx'

// Landing page: a prompt-first assistant over the whole database, then shortcuts to the tools.
export default function Home() {
  const at = useAtlas()
  const ig = useIgnis()
  const [q, setQ] = useState('')
  const [sp, setSp] = useSearchParams()
  const seeded = useRef(false)
  const end = useRef(null)
  useEffect(() => {
    const s = sp.get('ask')
    if (s && ig.ready && !seeded.current) { seeded.current = true; ig.run(s); setSp({}, { replace: true }) }
  }, [sp, ig.ready]) // eslint-disable-line
  useEffect(() => { if (ig.log.length) end.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }, [ig.log.length])
  if (at.loading || !at.meta) return <Loading />
  const c = at.meta.counts
  const send = (t) => { if (!ig.ready) return; ig.run(t ?? q); setQ('') }
  const sug = suggestionsFrom({ rows: ig.rows, vocab: ig.vocab, meta: at.meta })
  const chatting = ig.log.length > 0

  if (chatting) {
    return (
      <div className="ignis">
        <div className="ig-chat">
          <div className="row spread"><span className="ig-kicker" style={{ margin: 0 }}>Ignis AI</span><button className="btn sm" onClick={ig.reset}>New question</button></div>
          {ig.log.map((e, i) => <Turn key={i} e={e} llm={ig.llm} busy={ig.busy} onSynth={ig.synthesize} />)}
          <div ref={end} />
        </div>
        <div className="ig-dock"><Composer value={q} onChange={setQ} disabled={!ig.ready} onSubmit={() => send()} placeholder="Ask a follow-up, or describe another set of tests" autoFocus /></div>
      </div>
    )
  }
  return (
    <div className="ignis">
      <div className="ig-land">
        <div className="ig-kicker">Ignis AI &middot; NASA PSI microgravity combustion</div>
        <h1>Ask anything about fire in <em>freefall</em>.</h1>
        <p className="ig-sub">A database of {c.test_rows.toLocaleString()} harmonised tests from {c.investigations} NASA investigations, with the analysis already done. Ask in plain words and get exact counts, ranges and charts, plus cited passages from NASA reports.</p>
        <Composer value={q} onChange={setQ} disabled={!ig.ready} onSubmit={() => send()} autoFocus
          placeholder={'e.g. "Extinguished tests above 21% oxygen"'}
          hint={<><span>Enter to send</span><span>&middot;</span><span>{ig.ready ? 'Ready' : 'Loading the index...'}</span></>} />
        <div className="ig-chips">
          {sug.map((s) => <button key={s.text} className="ig-chip" disabled={!ig.ready} onClick={() => send(s.text)}>{s.text}{s.n ? <span className="n">{s.n}</span> : null}</button>)}
        </div>
      </div>
      <div className="ig-stats">
        <div><b>{c.test_rows.toLocaleString()}</b><span>harmonised tests, one row each</span></div>
        <div><b>{c.investigations}</b><span>investigations, from PSI</span></div>
        <div><b>{c.series_points.toLocaleString()}</b><span>time-series points in {c.series_datasets} datasets</span></div>
        <div><b>{c.corpus_chunks.toLocaleString()}</b><span>searchable passages from {c.literature_full_text} NASA reports</span></div>
      </div>
      <div className="ig-tiles">
        <Link className="ig-tile" to="/explore"><h3>Explore</h3><p>Filter all {c.test_rows.toLocaleString()} tests by experiment, material, form, outcome and conditions. Sort, chart and export.</p><span className="go">Open the database &rarr;</span></Link>
        <Link className="ig-tile" to="/investigations"><h3>Datasets</h3><p>Every investigation with a summary, an automatic chart suite, its literature and its provenance.</p><span className="go">Browse {c.investigations} investigations &rarr;</span></Link>
        <Link className="ig-tile" to="/analytics"><h3>Analytics</h3><p>Coverage, outcomes and cross-dataset statistics, computed from the data on load.</p><span className="go">See the analysis &rarr;</span></Link>
        <Link className="ig-tile" to="/guide"><h3>Guide</h3><p>How the data is structured, what one row is, and how complete each field is.</p><span className="go">Read the guide &rarr;</span></Link>
      </div>
      <p className="ig-foot">Answers use only NASA PSI and NTRS material and Atlas calculations. Counts come from the rows; passages are quoted with their source. Interpretations are labelled as such.</p>
    </div>
  )
}
