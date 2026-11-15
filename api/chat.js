// Vercel function: the help bot popup. Answers questions about the site using
// only our own data. Retrieval is plain keyword matching in api/_chat.js.
import { MODEL, guard, callModel, sendModelError, cacheKey, cacheGet, cacheSet } from './_shared.js'
import { SYSTEM, buildContext } from './_chat.js'

// Keep the last two exchanges so follow-ups work without a large token bill.
const MAX_HISTORY = 4
const MAX_TURN_CHARS = 600

function cleanHistory(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role, content: m.content.slice(0, MAX_TURN_CHARS) }))
}

export default async function handler(req, res) {
  const history = cleanHistory(req.body?.history)
  // Only a question with no history is safe to cache, since follow-ups depend on context.
  const key = (q) => cacheKey('chat', q)
  const question = guard(req, res, 2, (q) => !history.length && cacheGet(key(q)) !== undefined)
  if (question === null) return

  if (!history.length) {
    const cached = cacheGet(key(question))
    if (cached) return res.status(200).json(cached)
  }

  // A follow-up like "what about its pressure?" has no topic words, so retrieval
  // also looks at the previous user message.
  const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content || ''
  const { block, allowed } = buildContext(`${question} ${lastUser}`)

  try {
    const raw = await callModel([
      { role: 'system', content: `${SYSTEM}\n\n${block}` },
      ...history,
      { role: 'user', content: question },
    ])
    const answer = typeof raw?.answer === 'string' ? raw.answer.trim().slice(0, 1200) : ''
    if (!answer) throw new Error('bad_answer')
    const cited = [...new Set(Array.isArray(raw.cited) ? raw.cited.map(String) : [])].filter((id) => allowed.has(id)).slice(0, 6)
    const body = { answer, sources: cited.map((id) => allowed.get(id)), model: MODEL }
    if (!history.length) cacheSet(key(question), body)
    return res.status(200).json(body)
  } catch (err) {
    return sendModelError(res, err, 'chat failed:')
  }
}
