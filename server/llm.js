// Server-side LLM access. The key lives in env vars and never reaches the browser.
// Providers: "openai" (any OpenAI-compatible endpoint: Groq, OpenRouter, Ollama, OpenAI) or "anthropic".

const MAX_MESSAGES = 14
const MAX_CHARS = 36000

export function llmStatus(env) {
  const provider = env.LLM_PROVIDER || 'openai'
  const base = env.LLM_BASE_URL || (provider === 'anthropic' ? 'https://api.anthropic.com' : 'https://api.groq.com/openai/v1')
  const local = /\/\/(localhost|127\.0\.0\.1)/.test(base)
  const model = env.LLM_MODEL || (provider === 'anthropic' ? 'claude-sonnet-4-5' : 'openai/gpt-oss-120b')
  return { provider, base, model, configured: Boolean(env.LLM_API_KEY) || local }
}

export async function chatCompletion(body, env) {
  const st = llmStatus(env)
  if (!st.configured) return { ok: false, status: 501, error: 'No LLM key is configured on the server. Set LLM_API_KEY in .env.' }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : []
  const system = String(body.system || '').slice(0, 12000)
  const total = messages.reduce((n, m) => n + String(m.content || '').length, system.length)
  if (!messages.length || total > MAX_CHARS) return { ok: false, status: 400, error: 'Message list is empty or too long.' }
  const maxTokens = Math.min(Number(body.maxTokens) || 900, 1800)
  const temperature = Math.min(Math.max(Number(body.temperature ?? 0.2), 0), 1)
  const clean = messages.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: String(m.content || '') }))
  const ctl = AbortSignal.timeout(45000)
  try {
    if (st.provider === 'anthropic') {
      const r = await fetch(`${st.base}/v1/messages`, {
        method: 'POST', signal: ctl,
        headers: { 'content-type': 'application/json', 'x-api-key': env.LLM_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: st.model, max_tokens: maxTokens, temperature, system, messages: clean }),
      })
      const j = await r.json()
      if (!r.ok) return { ok: false, status: r.status, error: j?.error?.message || 'Provider error' }
      return { ok: true, text: (j.content || []).map((c) => c.text || '').join(''), model: st.model }
    }
    const payload = { model: st.model, max_tokens: maxTokens, temperature, messages: [{ role: 'system', content: system }, ...clean] }
    if (/gpt-oss/.test(st.model)) payload.reasoning_effort = env.LLM_REASONING_EFFORT || 'low'
    const headers = { 'content-type': 'application/json' }
    if (env.LLM_API_KEY) headers.authorization = `Bearer ${env.LLM_API_KEY}`
    const r = await fetch(`${st.base}/chat/completions`, { method: 'POST', signal: ctl, headers, body: JSON.stringify(payload) })
    const j = await r.json()
    if (!r.ok) return { ok: false, status: r.status, error: j?.error?.message || 'Provider error' }
    return { ok: true, text: j.choices?.[0]?.message?.content || '', model: st.model }
  } catch (e) {
    return { ok: false, status: 502, error: e?.name === 'TimeoutError' ? 'The model took too long.' : 'Could not reach the model provider.' }
  }
}
