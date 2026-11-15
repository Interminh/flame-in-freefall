// Checks the model setup from your own machine, no Vercel needed.
// Run: node --env-file=.env scripts/check-model.mjs
// Reads LLM_API_KEY, LLM_BASE_URL and LLM_MODEL from .env. Never prints the key.
const base = process.env.LLM_BASE_URL || 'https://api.groq.com/openai/v1'
const model = process.env.LLM_MODEL || 'openai/gpt-oss-120b'
const key = process.env.LLM_API_KEY

console.log('Base URL:', base)
console.log('Model   :', model)
if (!key && !/localhost|127\.0\.0\.1/.test(base)) {
  console.log('LLM_API_KEY is empty. Add it to .env and run again.')
  process.exit(1)
}
const headers = { 'Content-Type': 'application/json', ...(key ? { Authorization: `Bearer ${key}` } : {}) }

const list = await fetch(`${base}/models`, { headers })
console.log('\nGET /models ->', list.status)
if (list.ok) {
  const ids = (await list.json()).data.map((m) => m.id).sort()
  console.log(ids.join('\n'))
  console.log(ids.includes(model) ? `\nOK: "${model}" is in the list.` : `\nNOT FOUND: "${model}" is not in the list. Set LLM_MODEL to one of the ids above.`)
} else {
  console.log((await list.text()).slice(0, 300))
}

const chat = await fetch(`${base}/chat/completions`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    model,
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [{ role: 'user', content: 'Reply with this JSON: {"ok": true}' }],
  }),
})
console.log('\nPOST /chat/completions ->', chat.status)
console.log((await chat.text()).slice(0, 400))
