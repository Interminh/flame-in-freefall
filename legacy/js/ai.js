// Ignis AI page. Sends the question to /api/rank and draws the ranked list.
// Rows without a written explanation get an Explain button that calls /api/explain.
// Everything from the server is added with textContent, never as HTML.
(() => {
  const form = document.getElementById('ask')
  const input = document.getElementById('question')
  const submit = document.getElementById('submit')
  const status = document.getElementById('status')
  const results = document.getElementById('results')

  function el(tag, props = {}, ...kids) {
    const node = Object.assign(document.createElement(tag), props)
    node.append(...kids)
    return node
  }

  function setStatus(msg, isError = false) {
    status.textContent = msg
    status.classList.toggle('is-error', isError)
  }

  // Question that produced the list on screen. Explain requests use this, not
  // whatever has since been typed into the box.
  let askedQuestion = ''

  function explained(text) {
    return [
      el('span', { className: 'rank-item__why-label', textContent: 'Why it fits:' }),
      el('p', { className: 'rank-item__why', textContent: text }),
    ]
  }

  // Button that asks the server to explain one investigation.
  function explainSlot(r) {
    const slot = el('div', { className: 'rank-item__extra' })
    const btn = el('button', { type: 'button', className: 'link-button', textContent: 'Explain' })
    const msg = el('span', { className: 'rank-item__error' })
    btn.addEventListener('click', async () => {
      btn.disabled = true
      btn.textContent = 'Explaining...'
      msg.textContent = ''
      try {
        const res = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: askedQuestion, id: r.id }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error((data.error || 'Something went wrong.') + (data.code ? ` (${data.code})` : ''))
        slot.replaceChildren(...explained(data.text))
      } catch (err) {
        msg.textContent = err.message
        btn.disabled = false
        btn.textContent = 'Try again'
      }
    })
    slot.append(btn, msg)
    return slot
  }

  function item(r, pos) {
    const top = Boolean(r.featured)
    const li = el('li', { className: top ? 'rank-item rank-item--top' : 'rank-item' })
    li.append(
      el('span', { className: 'rank-item__pos', textContent: String(pos) }),
      el(
        'span',
        {},
        el('a', { className: 'rank-item__name', href: r.psi_url, target: '_blank', rel: 'noopener', textContent: r.name }),
        el('span', { className: 'rank-item__full', textContent: ` | ${r.full_name}` })
      ),
      el('span', { className: 'rank-item__score', textContent: `Score ${r.score} of 100` }),
      el('span', { className: 'rank-item__reason', textContent: `Basis: ${r.reason}` })
    )
    if (r.explanation) li.append(...explained(r.explanation))
    else li.append(explainSlot(r))
    return li
  }

  function render(data) {
    const parts = []
    if (data.weak) {
      parts.push(
        el('p', {
          className: 'weak',
          textContent: 'These investigations are only loosely related to your topic. The list shows the closest matches.',
        })
      )
    }
    if (data.explanationsFailed) {
      parts.push(el('p', { className: 'weak', textContent: 'The explanations could not be written this time. The ranking is still valid.' }))
    }
    parts.push(el('ol', { className: 'rank-list' }, ...data.results.map((r, k) => item(r, k + 1))))
    results.replaceChildren(...parts)
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const question = input.value.trim()
    if (!question) return
    submit.disabled = true
    results.replaceChildren()
    setStatus('Ranking 24 investigations...')
    try {
      const res = await fetch('/api/rank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Live Server has no /api route, so say how to run it properly.
        const msg = res.status === 404
          ? 'The AI function is not running here. Use "vercel dev" or the deployed site.'
          : (data.error || 'Something went wrong. Try again.') + (data.code ? ` (${data.code})` : '')
        setStatus(msg, true)
        return
      }
      setStatus('')
      askedQuestion = question
      render(data)
    } catch {
      setStatus('Could not reach the server. Check your connection and try again.', true)
    } finally {
      submit.disabled = false
    }
  })

  document.querySelectorAll('[data-example]').forEach((b) =>
    b.addEventListener('click', () => {
      input.value = b.dataset.example
      input.focus()
    })
  )
})()
