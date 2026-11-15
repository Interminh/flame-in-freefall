import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useIndex } from '../lib/useIndex.js'
import { retrieve, highlight, relatedInvestigations, askLLM, llmStatus } from '../lib/rag.js'
import { getTests } from '../lib/data.js'
import { useAsync } from './ui.jsx'
import { ChartCard } from './ui.jsx'
import { OUTCOME_COLORS } from '../lib/theme.js'
import { fmt } from '../lib/stats.js'
import { buildVocab, parseQuery, resolvePsi, applyFilters, describeState, summarize, explainEmpty, toParams, toCsv, download, COLS, OUTCOME_LABEL, label } from '../lib/query.js'

// ---- engine ---------------------------------------------------------------------------------------------------
// One question runs two retrievals: (1) the sentence is parsed into filters over the harmonised test table, which
// gives exact counts and ranges; (2) BM25 retrieval over NASA report passages gives cited text. Both are shown.
export function useIgnis() {
  const ix = useIndex()
  const t = useAsync(getTests, [])
  const rows = t.data || null
  const vocab = useMemo(() => (rows ? buildVocab(rows) : null), [rows])
  const [log, setLog] = useState([])
  const [llm, setLlm] = useState({ configured: false })
  const [busy, setBusy] = useState(false)
  useEffect(() => { llmStatus().then(setLlm) }, [])
  const ready = !!(ix && rows)

  function dataFor(text) {
    if (!rows) return null
    const parsed = resolvePsi(parseQuery(text, vocab), rows)
    const hasFilter = parsed.matched.length > 0
    if (!hasFilter) return null
    const filtered = applyFilters(rows, parsed.state)
    return { state: parsed.state, matched: parsed.matched, total: rows.length, filtered, summary: summarize(filtered), empty: filtered.length === 0 ? explainEmpty(rows, parsed.state) : [] }
  }
  async function run(text, synth = false) {
    const q = text.trim()
    if (!ready || !q) return
    const hits = retrieve(ix, q, 6)
    const entry = { q, hits, inv: relatedInvestigations(ix, q), n: ix.N, data: dataFor(q) }
    setLog((l) => [...l, entry])
    if (synth && hits.length) await synthesize(entry, hits)
  }
  async function synthesize(entry, hits = entry.hits) {
    setBusy(true)
    try { const out = await askLLM(entry.q, hits); setLog((l) => l.map((e) => (e === entry ? { ...e, llm: out, llmError: null } : e))) }
    catch (e) { setLog((l) => l.map((x) => (x === entry ? { ...x, llmError: e.message } : x))) }
    setBusy(false)
  }
  return { ready, rows, vocab, ix, log, run, synthesize, llm, busy, reset: () => setLog([]) }
}

// Suggestion chips come from the data: each data chip is only offered if it returns rows, and shows its count.
export function suggestionsFrom({ rows, vocab, meta }) {
  if (!rows || !vocab) return []
  const out = []
  const tryQ = (text) => { const p = resolvePsi(parseQuery(text, vocab), rows); const n = p.matched.length ? applyFilters(rows, p.state).length : 0; if (n > 0) out.push({ text, n }) }
  const earth = meta?.scenarios?.find((s) => s.id === 'earth_air')
  const mats = {}
  for (const r of rows) if (r.material && r.material !== 'Not stated' && r.form && !/^sphere/i.test(r.material)) mats[r.material] = (mats[r.material] || 0) + 1
  const topMat = Object.entries(mats).filter(([m]) => /^[A-Za-z]{3,}$/.test(m)).sort((a, b) => b[1] - a[1]).slice(0, 2).map((x) => x[0])
  if (earth) tryQ(`Extinguished tests above ${Math.round(earth.o2_percent)}% oxygen`)
  for (const m of topMat) tryQ(`${m} tests with a stated outcome`)
  tryQ('Tests with both oxygen and pressure recorded')
  const exps = {}; for (const r of rows) exps[r.experiment] = (exps[r.experiment] || 0) + 1
  const topExp = Object.entries(exps).sort((a, b) => b[1] - a[1])[0]
  if (topExp) tryQ(`${topExp[0]} tests below 70 kPa`)
  const seen = new Set(); const uniq = out.filter((o) => (seen.has(o.text) ? false : seen.add(o.text)))
  return [...uniq.slice(0, 4), { text: 'What do the NASA reports say about flame extinction at reduced pressure?' }, { text: 'Which investigations measured smoke particle size?' }]
}

// ---- pieces ----------------------------------------------------------------------------------------------------
export function Composer({ value, onChange, onSubmit, disabled, placeholder, autoFocus, hint }) {
  const ta = useRef(null)
  useEffect(() => { if (autoFocus) ta.current?.focus() }, [autoFocus])
  useEffect(() => { const el = ta.current; if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(el.scrollHeight, 180) + 'px' }, [value])
  return (
    <form className="prompt" onSubmit={(e) => { e.preventDefault(); onSubmit() }}>
      <textarea ref={ta} rows={1} value={value} placeholder={placeholder} aria-label="Ask Ignis AI" onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit() } }} />
      <div className="prompt-row">
        <div className="prompt-hint">{hint}</div>
        <button className="send" type="submit" disabled={disabled || !value.trim()} aria-label="Send">{'↑'}</button>
      </div>
    </form>
  )
}

const OC_ORDER = ['flame', 'no_flame', 'burned_out', 'unknown']
function OutcomeBar({ items, total }) {
  const by = Object.fromEntries(items)
  return (
    <>
      <div className="obar" role="img" aria-label="Outcome shares">{OC_ORDER.filter((k) => by[k]).map((k) => <i key={k} style={{ width: `${(by[k] / total) * 100}%`, background: OUTCOME_COLORS[k] }} title={`${label('outcome_class', k)}: ${by[k]}`} />)}</div>
      <div className="olegend">{OC_ORDER.filter((k) => by[k]).map((k) => <span key={k} style={{ '--c': OUTCOME_COLORS[k] }}>{OUTCOME_LABEL[k].split(' (')[0]} {by[k]}</span>)}</div>
    </>
  )
}
const range = (s, u) => (s.n ? `${fmt(s.min, 2)} to ${fmt(s.max, 2)} ${u}` : 'not recorded')

export function DataAnswer({ d }) {
  const { summary: s, filtered, total } = d
  const chips = describeState(d.state)
  const exploreHref = `/explore?${toParams(d.state)}`
  const withO2 = filtered.filter((r) => r.o2_percent != null)
  const traces = ['flame', 'no_flame', 'burned_out', 'unknown'].map((k) => ({
    type: 'histogram', name: OUTCOME_LABEL[k].split(' (')[0], x: withO2.filter((r) => r.outcome_class === k).map((r) => r.o2_percent), xbins: { size: 1 }, marker: { color: OUTCOME_COLORS[k] },
  })).filter((t) => t.x.length)
  return (
    <div className="dans">
      <div className="ig-sec" style={{ margin: 0 }}>From the harmonised test table</div>
      <div className="big" style={{ marginTop: 8 }}>{filtered.length.toLocaleString()}<small>of {total.toLocaleString()} tests match</small></div>
      <div className="fchips">{chips.map((c) => <span className="fchip ro" key={c}>{c}</span>)}</div>
      {filtered.length === 0 && (
        <div className="callout neutral" style={{ marginBottom: 0 }}>
          <b>No test satisfies every condition.</b>
          {d.empty.length ? <ul className="relax">{d.empty.slice(0, 4).map((c) => <li key={c.desc}>Without <strong>{c.desc}</strong> there would be {c.rowsWithout.toLocaleString()} tests{c.unrecorded != null ? `; ${c.unrecorded.toLocaleString()} of them do not record ${c.quantity} at all` : ''}.</li>)}</ul> : <span>None of the individual conditions matches any row either.</span>}
        </div>
      )}
      {filtered.length > 0 && (
        <>
          <div className="facts">
            <div><span>Outcome stated</span><b>{s.stated} of {filtered.length}</b><OutcomeBar items={s.outcome} total={filtered.length} /></div>
            <div><span>Oxygen</span><b>{range(s.o2, '%')}</b><small>{s.o2.n ? `median ${fmt(s.o2.median, 1)} %, ${s.o2.n} rows recorded` : ''}</small></div>
            <div><span>Total pressure</span><b>{range(s.p, 'kPa')}</b><small>{s.p.n ? `median ${fmt(s.p.median, 1)} kPa, ${s.p.n} rows recorded` : ''}</small></div>
            <div><span>Flow speed</span><b>{range(s.flow, 'cm/s')}</b><small>{s.flow.n ? `${s.flow.n} rows recorded` : ''}</small></div>
            <div><span>Oxygen and pressure together</span><b>{s.both} rows</b></div>
            <div><span>Investigations</span>
              <div className="fchips" style={{ margin: '4px 0 0' }}>{s.experiments.slice(0, 6).map(([e, n]) => { const r = filtered.find((x) => x.experiment === e); return <Link key={e} className="chip" to={`/i/${r.psi_id}`}>{e} {n}</Link> })}</div>
            </div>
          </div>
          {withO2.length >= 8 && traces.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <ChartCard title="Outcomes across oxygen concentration" sub={`${withO2.length} of ${filtered.length} matching tests record oxygen`} data={traces}
                layout={{ barmode: 'stack', height: 280, xaxis: { title: { text: 'Oxygen concentration (%)' } }, yaxis: { title: { text: 'Tests (count)' } }, margin: { t: 10 } }} size="short" name="ignis_o2_outcomes" />
            </div>
          )}
        </>
      )}
      <div className="row" style={{ marginTop: 14 }}>
        <Link className="btn primary sm" to={exploreHref}>Open in Explore</Link>
        {filtered.length > 0 && <Link className="btn sm" to={`${exploreHref}&view=charts`}>Chart these tests</Link>}
        {filtered.length > 0 && <button className="btn sm" onClick={() => download('flame-in-freefall-selection.csv', toCsv(filtered, COLS.map((c) => c.key)))}>Download CSV</button>}
      </div>
      <p className="small" style={{ margin: '10px 0 0' }}>Counts and ranges are computed from the rows. The sentence was converted to the filters above by a rule-based parser, not a language model; check that they say what you meant.</p>
    </div>
  )
}

function Snippet({ text, q }) {
  return <>{highlight(text, q).map((p, i) => (p.hit ? <mark key={i}>{p.w}</mark> : <span key={i}>{p.w}</span>))}</>
}

export function Passages({ r }) {
  return (
    <div>
      {r.llm && (
        <div className="callout neutral">
          <b>Model synthesis ({r.llm.model})</b>
          <div style={{ whiteSpace: 'pre-wrap' }}>{r.llm.text}</div>
          {r.llm.unverified.length > 0 ? <p className="small" style={{ marginTop: 6, color: 'var(--bad)' }}>Numbers not found in the retrieved text: {r.llm.unverified.join(', ')}. Treat them as unverified.</p> : <p className="small" style={{ marginTop: 6 }}>Every number in this synthesis appears in the retrieved passages.</p>}
        </div>
      )}
      {r.llmError && <div className="callout bad">{r.llmError}</div>}
      {r.inv.length > 0 && <p className="row" style={{ gap: 6 }}><span className="small">Related investigations</span>{r.inv.map((h) => <Link key={h.id} className="chip" to={h.meta.route}>{h.meta.title}</Link>)}</p>}
      {r.hits.length === 0 && <p className="muted">No passage in the corpus matches this question. The corpus holds {r.n.toLocaleString()} passages; rephrase with the fuel, hardware or quantity names.</p>}
      {r.hits.map((h, i) => (
        <div className="src-card" key={h.id}>
          <div className="t"><span className="cite">{i + 1}</span> {h.meta.route ? <Link to={h.meta.route}>{h.meta.title}</Link> : <a href={h.meta.url} target="_blank" rel="noreferrer">{h.meta.title}</a>} <span className="small">{h.meta.kind}{h.meta.year ? `, ${h.meta.year}` : ''}{h.meta.where ? `, ${h.meta.where}` : ''}</span></div>
          {h.snippet.map((s, j) => <div className="x" key={j}>&ldquo;<Snippet text={s} q={r.q} />&rdquo;</div>)}
        </div>
      ))}
    </div>
  )
}

export function Turn({ e, llm, busy, onSynth }) {
  return (
    <div className="turn">
      <div className="u"><div>{e.q}</div></div>
      <div className="ig-a">
        {e.data && <DataAnswer d={e.data} />}
        {e.data ? (
          <details className="card flat" style={{ padding: '12px 18px' }}>
            <summary>Passages from NASA reports that share words with this question ({e.hits.length})</summary>
            <p className="small" style={{ margin: '6px 0' }}>Retrieval is by keyword, so a counting question such as this one may match only loosely. Use the table above for the numbers.</p>
            <Passages r={e} />
          </details>
        ) : (
          <>
            <div className="ig-sec">From NASA reports, PSI records and Atlas analyses</div>
            <Passages r={e} />
          </>
        )}
        <div className="row">
          {llm.configured ? <button className="btn sm" disabled={busy || !e.hits.length} onClick={() => onSynth(e)}>{busy ? 'Working...' : e.llm ? 'Re-synthesize' : 'Synthesize with LLM'}</button>
            : <span className="small">Extractive mode: passages are quoted, not rewritten. Add LLM_API_KEY on the server to enable synthesis.</span>}
        </div>
      </div>
    </div>
  )
}
