// Read-only proxy for public research APIs. Browsers cannot call several of these directly (CORS),
// and routing through the server keeps one User-Agent and a small cache. GET only, allowlisted hosts.

const ALLOW = new Set([
  'api.crossref.org', 'api.openalex.org', 'api.semanticscholar.org', 'export.arxiv.org', 'zenodo.org',
  'ntrs.nasa.gov', 'api.datacite.org', 'huggingface.co',
])
const cache = new Map()
const TTL = 10 * 60 * 1000

export async function fetchExternal(rawUrl, env = {}) {
  let u
  try { u = new URL(rawUrl) } catch { return { status: 400, type: 'text/plain', body: 'Bad URL' } }
  if (u.protocol !== 'https:' || !ALLOW.has(u.hostname)) return { status: 403, type: 'text/plain', body: 'Host not allowed' }
  const key = u.toString()
  const hit = cache.get(key)
  if (hit && Date.now() - hit.t < TTL) return hit.v
  const headers = { 'user-agent': 'FlameAtlas/1.0 (open research tool)', accept: 'application/json, application/atom+xml, text/xml' }
  if (u.hostname === 'api.openalex.org' && env.OPENALEX_API_KEY) u.searchParams.set('api_key', env.OPENALEX_API_KEY)
  if (u.hostname === 'api.semanticscholar.org' && env.S2_API_KEY) headers['x-api-key'] = env.S2_API_KEY
  try {
    const r = await fetch(u, { headers, signal: AbortSignal.timeout(15000) })
    const text = await r.text()
    const v = { status: r.status, type: r.headers.get('content-type') || 'text/plain', body: text.slice(0, 2_000_000) }
    if (r.ok) { if (cache.size > 300) cache.clear(); cache.set(key, { t: Date.now(), v }) }
    return v
  } catch {
    return { status: 504, type: 'text/plain', body: 'Upstream request failed' }
  }
}
