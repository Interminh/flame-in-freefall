import { chatCompletion, llmStatus } from './llm.js'
import { fetchExternal } from './ext.js'

const hits = new Map()
function limited(ip) {
  const now = Date.now()
  if (hits.size > 500) hits.clear()
  const r = (hits.get(ip) || []).filter((t) => now - t < 60000)
  r.push(now); hits.set(ip, r)
  return r.length > 30
}

async function readJson(req) {
  if (req.body && typeof req.body === 'object') return req.body
  const chunks = []
  for await (const c of req) { chunks.push(c); if (chunks.length > 200) break }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}') } catch { return {} }
}

function send(res, status, body, type = 'application/json') {
  res.statusCode = status
  res.setHeader('Content-Type', type)
  res.setHeader('Cache-Control', 'no-store')
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

// route is the path after /api, e.g. "chat" or "ext".
export async function handleApi(route, req, res, env) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'local').split(',')[0]
  if (route === 'status') return send(res, 200, { llm: llmStatus(env) })
  if (limited(ip)) return send(res, 429, { error: 'Too many requests. Wait a minute.' })
  if (route === 'chat') {
    if (req.method !== 'POST') return send(res, 405, { error: 'POST only' })
    const out = await chatCompletion(await readJson(req), env)
    return send(res, out.ok ? 200 : out.status, out)
  }
  if (route === 'ext') {
    if (req.method !== 'GET') return send(res, 405, { error: 'GET only' })
    const url = new URL(req.url, 'http://local').searchParams.get('u')
    const out = await fetchExternal(url, env)
    return send(res, out.status, out.body, out.type)
  }
  return send(res, 404, { error: 'Unknown route' })
}
