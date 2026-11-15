// Vercel function: explains why one investigation fits the researcher's question.
// Called when someone clicks "Explain" on a row below the top results.
import { BY_ID, guard, explainMany, sendModelError, cacheKey, cacheGet, cacheSet } from './_shared.js'

export default async function handler(req, res) {
  const id = req.body?.id
  const key = (q) => cacheKey('explain', id, q)
  const question = guard(req, res, 1, (q) => cacheGet(key(q)) !== undefined)
  if (question === null) return

  if (typeof id !== 'string' || !BY_ID.has(id)) {
    return res.status(400).json({ error: 'Unknown investigation.' })
  }
  const cached = cacheGet(key(question))
  if (cached) return res.status(200).json(cached)

  try {
    const explained = await explainMany(question, [id])
    const text = explained.get(id)
    if (!text) throw new Error('bad_explanation')
    const body = { id, text }
    cacheSet(key(question), body)
    return res.status(200).json(body)
  } catch (err) {
    return sendModelError(res, err, 'explain failed:')
  }
}
