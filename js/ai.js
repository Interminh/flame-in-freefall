// Ignis AI page. Sends the question to /api/rank and draws the ranked list.
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

  function item(r, pos) {
    const top = pos <= 3
    const li = el('li', { className: top ? 'rank-item rank-item--top' : 'rank-item' })
    li.append(
      el('span', { className: 'rank-item__pos', textContent: String(pos) }),
      el(
        'span',
        {},
        el('a', { className: 'rank-item__name', href: r.psi_url, target: '_blank', rel: 'noopener', textContent: r.name }),
        el('span', { className: 'rank-item__full', textContent: ` | ${r.full_name}` })
      ),
      el('span', { className: 'rank-item__score', textContent: `Score ${r.total} of 9` }),
      el('span', { className: 'rank-item__reason', textContent: `Basis: ${r.reason}` })
    )
    if (top) {
      li.append(
        el('span', { className: 'rank-item__why-label', textContent: 'Why it fits (interpretation):' }),
        el('p', { className: 'rank-item__why', textContent: r.explanation || 'Not available for this one.' })
      )
    }
    return li
  }

  function render(data) {
    const parts = []
    if (data.weak) {
      parts.push(
        el('p', {
          className: 'weak',
          textContent: 'No investigation in this set clearly tests this question. The list shows the closest matches.',
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
          : data.error || 'Something went wrong. Try again.'
        setStatus(msg, true)
        return
      }
      setStatus('')
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
