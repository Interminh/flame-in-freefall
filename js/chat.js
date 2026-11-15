// Help bot popup, loaded on every page. Sends questions to /api/chat.
// Everything from the server is added with textContent, never as HTML.
// The conversation is kept in sessionStorage so it survives page changes in this tab only.
(() => {
  const KEY = 'ffChat'
  const MAX_SENT = 4

  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = 'src/styles/chat.css'
  document.head.append(link)

  function el(tag, props = {}, ...kids) {
    const node = Object.assign(document.createElement(tag), props)
    node.append(...kids)
    return node
  }

  let messages = []
  try {
    messages = JSON.parse(sessionStorage.getItem(KEY) || '[]')
  } catch {}
  const save = () => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(messages.slice(-20)))
    } catch {}
  }

  const launcher = el('button', { type: 'button', className: 'chat-launcher', textContent: 'Ask Ignis' })
  launcher.setAttribute('aria-expanded', 'false')
  launcher.setAttribute('aria-controls', 'chat-panel')

  const log = el('div', { className: 'chat-log', tabIndex: 0 })
  log.setAttribute('role', 'log')
  log.setAttribute('aria-live', 'polite')
  log.setAttribute('aria-label', 'Conversation')

  const input = el('textarea', { className: 'chat-input', rows: 2, maxLength: 500, placeholder: 'Ask about the investigations or this site' })
  input.setAttribute('aria-label', 'Your question')
  const send = el('button', { type: 'submit', className: 'chat-send', textContent: 'Send' })
  const form = el('form', { className: 'chat-form' }, input, send)

  const close = el('button', { type: 'button', className: 'chat-close', textContent: 'Close' })
  close.setAttribute('aria-label', 'Close chat')

  const panel = el(
    'section',
    { className: 'chat-panel', id: 'chat-panel', hidden: true },
    el('header', { className: 'chat-head' }, el('strong', { textContent: 'Ask Ignis' }), close),
    log,
    form,
    el('p', {
      className: 'chat-note',
      textContent: 'AI-generated from the data on this site. It can be wrong, so check the linked source.',
    }),
    el('p', {
      className: 'chat-note',
      textContent: 'Our MVP faces token limits, please wait for a minute if you hit an error.',
    }),
  )
  panel.setAttribute('aria-label', 'Help chat')

  function add(m) {
    const bubble = el('div', { className: `chat-msg chat-msg--${m.role}${m.error ? ' is-error' : ''}` }, el('p', { textContent: m.content }))
    if (m.sources?.length) {
      const list = el('ul', { className: 'chat-sources' })
      for (const s of m.sources) {
        const item = el('li')
        // Our own investigation page where there is one, plus the NASA source.
        if (s.page) item.append(el('a', { href: s.page, textContent: `${s.id} ${s.label}` }), ' · ')
        item.append(el('a', { href: s.url, target: '_blank', rel: 'noopener', textContent: s.page ? 'PSI record' : `${s.label} (NTRS)` }))
        list.append(item)
      }
      bubble.append(list)
    }
    log.append(bubble)
    log.scrollTop = log.scrollHeight
    return bubble
  }

  function greet() {
    add({
      role: 'assistant',
      content: 'Hi. Ask me about the NASA investigations on this site, such as "What did BASS-II measure?" or "Which investigations looked at smoke?"',
    })
  }

  async function ask(text) {
    const history = messages.filter((m) => !m.error).slice(-MAX_SENT).map(({ role, content }) => ({ role, content }))
    const user = { role: 'user', content: text }
    messages.push(user)
    add(user)
    send.disabled = true
    input.disabled = true
    const wait = add({ role: 'assistant', content: 'Thinking...' })
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, history }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong.')
      const reply = { role: 'assistant', content: data.answer, sources: data.sources }
      messages.push(reply)
      wait.remove()
      add(reply)
    } catch (err) {
      // Failed turns are shown but not kept as history.
      messages.pop()
      wait.remove()
      add({ role: 'assistant', content: err.message, error: true })
    } finally {
      save()
      send.disabled = false
      input.disabled = false
      input.focus()
    }
  }

  function setOpen(open) {
    panel.hidden = !open
    launcher.setAttribute('aria-expanded', String(open))
    launcher.hidden = open
    try {
      sessionStorage.setItem(KEY + 'Open', open ? '1' : '')
    } catch {}
    if (open) input.focus()
    else launcher.focus()
  }

  launcher.addEventListener('click', () => setOpen(true))
  close.addEventListener('click', () => setOpen(false))
  panel.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false)
  })
  form.addEventListener('submit', (e) => {
    e.preventDefault()
    const text = input.value.trim()
    if (text.length < 3) return
    input.value = ''
    ask(text)
  })
  // Enter sends, Shift+Enter adds a new line.
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      form.requestSubmit()
    }
  })

  if (messages.length) for (const m of messages) add(m)
  else greet()
  document.body.append(launcher, panel)
  try {
    if (sessionStorage.getItem(KEY + 'Open')) setOpen(true)
  } catch {}
})()
