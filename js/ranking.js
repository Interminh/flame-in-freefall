// Ranking list and detail window. Data comes from data/investigations.json,
// built from data/summaries by scripts/build-investigations.mjs.
// Wrapped so these names do not clash with nav.js, which shares the page scope.
(() => {
  const NOT_STATED = 'Not stated'

  const list = document.getElementById('list')
  const count = document.getElementById('count')
  const sortSelect = document.getElementById('sort')
  const dialog = document.getElementById('detail')
  const title = document.getElementById('detail-title')
  const sub = document.getElementById('detail-sub')
  const body = document.getElementById('detail-body')
  const closeBtn = document.getElementById('detail-close')

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')
  let items = []
  let lastRow = null

  const psiNumber = (it) => Number(it.psi_id.replace('PSI-', ''))
  const startYear = (it) => (it.period && it.period.match(/\d{4}/)?.[0]) || NOT_STATED
  const present = (v) => v !== null && v !== undefined && v !== '' && v !== 'not stated in the source'
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1)
  // Some values embed the phrase, e.g. an open-ended period.
  const text = (v) => (present(v) ? cap(String(v).replace(/not stated in the source/gi, NOT_STATED)) : NOT_STATED)

  function range(r, unit) {
    if (!r || (r.min == null && r.max == null)) return NOT_STATED
    if (r.min === r.max) return `${r.min} ${unit}`
    return `${r.min} to ${r.max} ${unit}`
  }

  function el(tag, props = {}, ...kids) {
    const node = Object.assign(document.createElement(tag), props)
    node.append(...kids)
    return node
  }

  function renderList() {
    const key = sortSelect.value
    const sorted = [...items].sort((a, b) =>
      key === 'psi' ? psiNumber(a) - psiNumber(b) : a.name.localeCompare(b.name, 'en', { numeric: true })
    )
    count.textContent = `${sorted.length} investigations`
    list.replaceChildren(
      ...sorted.map((it) => {
        const row = el(
          'button',
          { type: 'button', className: 'inv-row' },
          el('span', { className: 'inv-row__name', textContent: it.name }),
          el(
            'span',
            { className: 'inv-row__text' },
            el('span', { className: 'inv-row__full', textContent: it.full_name }),
            el('span', { className: 'inv-row__snippet', textContent: ` - ${it.summary}` })
          ),
          el('span', { className: 'inv-row__meta', textContent: `${it.psi_id} | ${startYear(it)}` })
        )
        row.addEventListener('click', () => openDetail(it, row))
        return el('li', {}, row)
      })
    )
  }

  function link(href, label) {
    return el('a', { href, textContent: label, target: '_blank', rel: 'noopener' })
  }

  function fields(it) {
    const c = it.conditions || {}
    const rows = [
      ['Platform', text(it.platform)],
      ['Facility', text(it.facility)],
      ['Period', text(it.period)],
      ['Gravity', text(it.gravity)],
      ['Fuel type', text(it.fuel_type)],
      ['Materials', it.materials?.length ? cap(it.materials.join(', ')) : NOT_STATED],
      ['Oxygen', range(c.o2_pct, '%')],
      ['Pressure', range(c.pressure_kpa, 'kPa')],
      ['Airflow speed', range(c.flow_cm_s, 'cm/s')],
      ['Measurements', it.measurements?.length ? cap(it.measurements.join(', ')) : NOT_STATED],
      ['Number of tests', text(it.n_tests)],
      ['License', text(it.license)],
    ]
    const dl = el('dl', { className: 'inv-dl' })
    for (const [k, v] of rows) dl.append(el('dt', { textContent: k }), el('dd', { textContent: v }))
    dl.append(
      el('dt', { textContent: 'Sources' }),
      el('dd', {}, link(it.psi_url, 'PSI record'), ' | ', link(`https://doi.org/${it.doi}`, 'DOI'))
    )
    return dl
  }

  function openDetail(it, row) {
    lastRow = row
    title.textContent = it.name
    sub.textContent = `${it.full_name} | ${it.psi_id}`
    const parts = [el('h3', { textContent: 'Summary:' }), el('p', { textContent: it.summary })]
    if (it.interpretation) {
      parts.push(el('h3', { textContent: 'Relevance:' }), el('p', { className: 'inv-interp', textContent: it.interpretation }))
    }
    parts.push(el('h3', { textContent: 'Details from the PSI record:' }), fields(it))
    if (it.caveats?.length) {
      parts.push(el('h3', { textContent: 'Caveats:' }), el('ul', {}, ...it.caveats.map((c) => el('li', { textContent: c }))))
    }
    body.replaceChildren(...parts)
    dialog.scrollTop = 0
    dialog.showModal()
    // Next frame so the closed styles apply first and the change animates.
    requestAnimationFrame(() => dialog.classList.add('is-open'))
  }

  function closeDetail() {
    dialog.classList.remove('is-open')
    if (reduceMotion.matches) dialog.close()
    else setTimeout(() => dialog.close(), 240)
  }

  closeBtn.addEventListener('click', closeDetail)
  // Click on the dimmed area closes the window.
  dialog.addEventListener('click', (e) => { if (e.target === dialog) closeDetail() })
  // Esc goes through the same animated close.
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); closeDetail() })
  dialog.addEventListener('close', () => lastRow?.focus())
  sortSelect.addEventListener('change', renderList)

  fetch('data/investigations.json')
    .then((r) => r.json())
    .then((data) => { items = data; renderList() })
    .catch(() => { count.textContent = 'Could not load the investigation data.' })
})()
