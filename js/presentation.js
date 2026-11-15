// Slide viewer for presentation.html. The page already lists every slide as a plain image, so it works without
// this script. Here the list is turned into one slide at a time with buttons, keys, swipe, thumbnails and fullscreen.
(() => {
  const deck = document.querySelector('[data-deck]')
  if (!deck) return
  const slides = [...deck.querySelectorAll('.deck__slide')]
  if (slides.length < 2) return

  const el = (tag, props = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), props)
    n.append(...kids)
    return n
  }

  const stage = el('div', { className: 'deck__stage' })
  const list = deck.querySelector('.deck__slides')
  stage.append(list)

  const status = el('p', { className: 'deck__count' })
  status.setAttribute('aria-live', 'polite')
  const title = el('p', { className: 'deck__title' })
  const prev = el('button', { type: 'button', className: 'deck__btn', textContent: '← Previous' })
  const next = el('button', { type: 'button', className: 'deck__btn', textContent: 'Next →' })
  const full = el('button', { type: 'button', className: 'deck__btn', textContent: 'Full screen' })
  const controls = el('div', { className: 'deck__controls' }, prev, status, next, full)
  const thumbs = el('ol', { className: 'deck__thumbs' })

  let index = 0
  const buttons = slides.map((s, i) => {
    const img = s.querySelector('img')
    const b = el('button', { type: 'button', className: 'deck__thumb' }, el('img', { src: img.src, alt: '', loading: 'lazy' }), el('span', { textContent: String(i + 1) }))
    b.setAttribute('aria-label', `Go to slide ${i + 1}: ${s.dataset.title}`)
    b.addEventListener('click', () => show(i))
    thumbs.append(el('li', {}, b))
    return b
  })

  function show(i, updateHash = true) {
    index = (i + slides.length) % slides.length
    slides.forEach((s, k) => s.classList.toggle('is-current', k === index))
    buttons.forEach((b, k) => (k === index ? b.setAttribute('aria-current', 'true') : b.removeAttribute('aria-current')))
    status.textContent = `Slide ${index + 1} of ${slides.length}`
    title.textContent = slides[index].dataset.title
    // Load the next slide ahead of time so the change feels instant.
    const ahead = slides[(index + 1) % slides.length].querySelector('img')
    if (ahead) ahead.loading = 'eager'
    if (updateHash) history.replaceState(null, '', `#${index + 1}`)
  }

  prev.addEventListener('click', () => show(index - 1))
  next.addEventListener('click', () => show(index + 1))

  if (stage.requestFullscreen) {
    full.addEventListener('click', () => (document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen()))
  } else {
    full.hidden = true
  }

  // Arrow keys move through the slides, unless the person is typing or a dialog is open.
  document.addEventListener('keydown', (e) => {
    const t = e.target
    if (t.matches?.('input, textarea, select, [contenteditable]') || e.altKey || e.ctrlKey || e.metaKey) return
    if (document.querySelector('.settings.is-open')) return
    if (e.key === 'ArrowRight') { e.preventDefault(); show(index + 1) }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); show(index - 1) }
    else if (e.key === 'Home') { e.preventDefault(); show(0) }
    else if (e.key === 'End') { e.preventDefault(); show(slides.length - 1) }
  })

  // Swipe on touch screens.
  let startX = null
  stage.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX }, { passive: true })
  stage.addEventListener('touchend', (e) => {
    if (startX === null) return
    const dx = e.changedTouches[0].clientX - startX
    startX = null
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1))
  })

  deck.classList.add('is-enhanced')
  deck.prepend(stage, controls, title)
  deck.append(thumbs)

  const fromHash = parseInt(location.hash.slice(1), 10)
  show(Number.isInteger(fromHash) && fromHash >= 1 && fromHash <= slides.length ? fromHash - 1 : 0, false)
})()
