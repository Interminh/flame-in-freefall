// Retrieval over the Atlas corpus: NTRS page-level chunks, PSI investigation records and our own analysis notes.
// BM25 runs in the browser, so the extractive answer works with no server and no key.
// The optional LLM step only rewrites retrieved passages; it never computes numbers, and its numbers are checked.

const STOP = new Set('a an and are as at be but by for from has have in into is it its of on or that the their this to was were which with what how why when do does can could should would i we you our not no than then there these those'.split(' '))
const SYN = {
  loc: ['limiting', 'oxygen', 'concentration'], moon: ['lunar'], lunar: ['moon'], mars: ['martian'],
  psi: ['psia', 'pressure'], kpa: ['pressure'], pressure: ['psia', 'kpa', 'atm'], smoke: ['aerosol', 'particulate'],
  extinguish: ['extinction', 'quench', 'suppression'], suppress: ['suppression', 'extinguish'],
  flammability: ['flammable', 'ignition', 'burn'], fire: ['flame', 'combustion'], iss: ['station'],
}
export const tokenize = (s) => String(s || '').toLowerCase().replace(/[₂]/g, '2').match(/[a-z0-9]+(?:\.[0-9]+)?/g)?.map(stem).filter((t) => t.length > 1 && !STOP.has(t)) || []
function stem(w) { return w.length > 4 && w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.length > 4 && w.endsWith('es') && !w.endsWith('ses') ? w.slice(0, -2) : w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w }

export function buildIndex(chunks, literature, investigations) {
  const lit = new Map(literature.map((d) => [String(d.id), d]))
  const inv = new Map(investigations.map((d) => [d.psi_id, d]))
  const docs = chunks.map((c) => ({ ...c, toks: tokenize(c.t) }))
  const df = new Map()
  let total = 0
  for (const d of docs) { total += d.toks.length; for (const t of new Set(d.toks)) df.set(t, (df.get(t) || 0) + 1) }
  const post = new Map()
  docs.forEach((d, i) => {
    const tf = new Map()
    for (const t of d.toks) tf.set(t, (tf.get(t) || 0) + 1)
    for (const [t, f] of tf) { if (!post.has(t)) post.set(t, []); post.get(t).push([i, f]) }
  })
  return { docs, df, post, avg: total / docs.length, N: docs.length, lit, inv }
}

export function expandQuery(q) {
  const base = tokenize(q)
  const extra = []
  for (const t of base) if (SYN[t]) extra.push(...SYN[t].map(stem))
  return { base, extra }
}

export function retrieve(ix, q, k = 8, { perDoc = 2 } = {}) {
  const { base, extra } = expandQuery(q)
  const weights = new Map()
  for (const t of base) weights.set(t, 1)
  for (const t of extra) if (!weights.has(t)) weights.set(t, 0.35)
  const k1 = 1.4, b = 0.75, scores = new Map()
  for (const [t, w] of weights) {
    const p = ix.post.get(t)
    if (!p) continue
    const idf = Math.log(1 + (ix.N - p.length + 0.5) / (p.length + 0.5))
    for (const [i, f] of p) {
      const len = ix.docs[i].toks.length
      scores.set(i, (scores.get(i) || 0) + w * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * len) / ix.avg))))
    }
  }
  const ranked = [...scores.entries()].sort((a, b2) => b2[1] - a[1])
  const out = [], seen = new Map()
  for (const [i, s] of ranked) {
    const d = ix.docs[i]
    const n = seen.get(d.doc) || 0
    if (n >= perDoc) continue
    seen.set(d.doc, n + 1)
    out.push({ ...d, score: s, meta: describe(ix, d), snippet: bestSentences(d.t, base) })
    if (out.length >= k) break
  }
  return out
}

export function describe(ix, d) {
  if (d.src === 'ntrs') {
    const l = ix.lit.get(String(d.doc))
    return { kind: 'NTRS report', title: l?.title || `NTRS ${d.doc}`, year: l?.year, url: l ? l.url : `https://ntrs.nasa.gov/citations/${d.doc}`, where: d.p ? `p. ${d.p}` : '', id: `NTRS ${d.doc}` }
  }
  if (d.src === 'psi') {
    const v = ix.inv.get(d.doc)
    return { kind: 'PSI record', title: `${d.doc} ${v?.name || ''}`.trim(), url: v?.psi_url, where: '', id: d.doc, route: `/i/${d.doc}` }
  }
  return { kind: 'Atlas analysis', title: d.doc.replace('analysis:', 'Analysis: '), where: '', id: d.doc, route: d.doc.includes('theta') ? '/analytics#theta' : '/analytics' }
}

function bestSentences(text, qt, n = 2) {
  const sents = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-Z0-9(])/).filter((s) => s.length > 30)
  if (!sents.length) return [text.slice(0, 260)]
  const qs = new Set(qt)
  const scored = sents.map((s, i) => ({ s, i, sc: tokenize(s).filter((t) => qs.has(t)).length / Math.sqrt(s.length / 60 + 1) }))
  return scored.sort((a, b) => b.sc - a.sc).slice(0, n).sort((a, b) => a.i - b.i).map((x) => (x.s.length > 340 ? x.s.slice(0, 337) + '...' : x.s))
}

export function highlight(text, q) {
  const qs = new Set(tokenize(q))
  return text.split(/(\W+)/).map((w) => ({ w, hit: qs.has(stem(w.toLowerCase())) && w.length > 2 }))
}

// Which investigations are most relevant to the question, from PSI-record chunks only.
export function relatedInvestigations(ix, q, k = 4) {
  return retrieve({ ...ix, docs: ix.docs }, q, 60, { perDoc: 1 }).filter((h) => h.src === 'psi').slice(0, k)
}

export function buildPrompt(q, hits) {
  const ctx = hits.map((h, i) => `[${i + 1}] ${h.meta.title}${h.meta.where ? ' (' + h.meta.where + ')' : ''}\n${h.t.slice(0, 1400)}`).join('\n\n')
  const system = [
    'You are the research assistant inside Flame Atlas, a tool for NASA microgravity combustion data.',
    'Answer ONLY from the numbered sources below. Cite each claim as [n]. If the sources do not contain the answer, say so plainly and stop.',
    'Never compute, estimate or invent numbers; quote numbers exactly as they appear in a source. Label any inference "Interpretation:".',
    'Be concise and precise. Finish with one line "Open question:" naming what the sources leave unresolved.',
    '', 'SOURCES', ctx,
  ].join('\n')
  return { system, messages: [{ role: 'user', content: q }] }
}

// Numbers in an answer must appear in the retrieved text. Returns the ones that do not.
export function verifyNumbers(answer, hits) {
  const corpus = hits.map((h) => h.t).join(' ').replace(/,/g, '')
  const body = answer.replace(/\[\d+\]/g, ' ')
  const nums = [...new Set(body.replace(/,/g, '').match(/\d+(?:\.\d+)?/g) || [])].filter((n) => !(n.length === 1 && Number(n) < 10))
  return nums.filter((n) => !new RegExp(`(^|[^0-9.])${n.replace('.', '\\.')}([^0-9]|$)`).test(corpus))
}

export async function llmStatus() {
  try { const r = await fetch('/api/status'); return (await r.json()).llm } catch { return { configured: false } }
}
export async function askLLM(q, hits) {
  const { system, messages } = buildPrompt(q, hits)
  const r = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system, messages, maxTokens: 900, temperature: 0.1 }) })
  const j = await r.json()
  if (!j.ok) throw new Error(j.error || 'LLM request failed')
  return { text: j.text, model: j.model, unverified: verifyNumbers(j.text, hits) }
}
