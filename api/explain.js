// Vercel function: explains why one investigation fits the researcher's question.
// Called when someone clicks "Explain" on a row below the top results.
import { BY_ID, guard, explainMany, sendModelError } from './_shared.js'

export default async function handler(req, res) {
  const question = guard(req, res, 1)
  if (question === null) return

  const id = req.body?.id
  if (typeof id !== 'string' || !BY_ID.has(id)) {
    return res.status(400).json({ error: 'Unknown investigation.' })
  }

  try {
    const explained = await explainMany(question, [id])
    const text = explained.get(id)
    if (!text) throw new Error('bad_explanation')
    return res.status(200).json({ id, text })
  } catch (err) {
    return sendModelError(res, err, 'explain failed:')
  }
}
