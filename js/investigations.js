// Investigations cards. Data comes from data/catalogue.json, a per-investigation
// roll-up of the PSI tables. Wrapped so names do not clash with nav.js.
(() => {
  const PILLARS = { prevention: 'Prevention', detection: 'Detection', suppression: 'Suppression', context: 'Context' }
  const KIND = { table: 'Table', series: 'Series', empty: 'No data file' }

  const $ = (id) => document.getElementById(id)
  const el = (tag, props = {}, ...kids) => {
    const n = Object.assign(document.createElement(tag), props)
    n.append(...kids)
    return n
  }

  const firstSentence = (t = '', max = 130) => {
    const s = (t.match(/^.*?[.!?](\s|$)/)?.[0] || t).trim()
    return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s
  }
  const num = (it) => parseInt(it.psi_id.slice(4), 10)
  const varied = (it, vars) => vars.filter((v) => it.fp[v] === 'varies')

  let data
  const photos = new Map()
  let pubs = {}
  const figCount = new Map()

  // One card per investigation. A photo is shown only where we have a NASA image for it.
  function card(it) {
    const v = varied(it, data.vars)
    const share = it.harmonised ? it.out / it.harmonised : null
    const meta = [it.hardware, it.fuel_type].filter(Boolean).join(' · ')
    const pillar = PILLARS[it.pillar] ? it.pillar : 'context'
    const pic = photos.get(it.psi_id)

    const media = pic
      ? el('figure', { className: 'card__media' },
        el('img', { src: `img/nasa/${pic.file}`, alt: pic.alt, loading: 'lazy', width: 1280, height: 800 }),
        el('a', {
          className: 'card__credit',
          href: `https://images.nasa.gov/details/${pic.id}`,
          target: '_blank',
          rel: 'noopener',
          textContent: pic.credit,
          title: pic.nasa_title,
        }))
      : el('div', { className: 'card__media card__media--none' }, el('img', { src: 'img/logo.png', alt: '' }))

    const top = el('div', { className: 'card__top' },
      el('span', { className: `chip ${pillar}`, textContent: PILLARS[pillar] }),
      el('span', { className: 'mono', textContent: it.psi_id }))

    const page = `investigation.html?id=${encodeURIComponent(it.psi_id)}`
    const title = el('h3', {}, el('a', { href: page, textContent: it.name }))

    const size = it.rows ? `${it.rows.toLocaleString('en-US')} ${it.kind === 'series' ? 'cells' : 'rows'}` : ''
    const dots = el('span', { className: 'dots' },
      ...data.vars.map((k) => el('i', { className: it.fp[k], title: `${k}: ${it.fp[k] === 'empty' ? 'not recorded' : it.fp[k]}` })))
    const list = v.length ? v.slice(0, 3).join(', ') + (v.length > 3 ? ` +${v.length - 3}` : '') : 'none'

    const outcome = el('dd')
    if (share == null) {
      outcome.append(el('span', { className: 'muted', textContent: 'not in harmonised table' }))
    } else {
      const pct = Math.round(share * 100)
      const bar = el('span', { className: 'fillbar' }, el('i'))
      bar.firstChild.style.width = `${pct}%`
      outcome.append(bar, `${pct}% (${it.out} of ${it.harmonised})`)
    }

    const np = (pubs[it.psi_id] || []).length, nf = figCount.get(it.psi_id) || 0
    const stats = el('dl', { className: 'card__stats' },
      el('dt', { textContent: 'Papers' }), el('dd', { textContent: `${np} on PSI${nf ? `, ${nf} figure${nf === 1 ? '' : 's'} shown` : ''}` }),
      el('dt', { textContent: 'Data' }), el('dd', { textContent: [KIND[it.kind], size].filter(Boolean).join(', ') }),
      el('dt', { textContent: 'Varied' }), el('dd', {}, dots, ` ${list}`),
      el('dt', { textContent: 'Outcome' }), outcome)

    const body = el('div', { className: 'card__body' }, top, title,
      el('p', { className: 'card__sum', textContent: firstSentence(it.summary) }),
      el('p', { className: 'card__meta', textContent: meta }),
      stats)

    body.append(el('p', { className: 'card__links' }, el('a', { href: page, textContent: 'Graphs and publications' }), ' · ', el('a', { href: it.psi_url, target: '_blank', rel: 'noopener', textContent: 'PSI record ↗' })))
    const c = el('article', { className: 'card', }, media, body)
    c.dataset.pillar = pillar
    return c
  }

  function render() {
    const t = $('q').value.trim().toLowerCase()
    const pillar = $('pillar').value
    const hw = $('hw').value
    const sort = $('sort').value
    const list = data.items
      .filter((it) =>
        (pillar === 'all' || it.pillar === pillar) &&
        (hw === 'all' || it.hardware === hw) &&
        (!t || JSON.stringify([it.name, it.full_name, it.summary, it.tags, it.materials]).toLowerCase().includes(t)))
      .sort((a, b) =>
        sort === 'rows' ? b.rows - a.rows
          : sort === 'varied' ? varied(b, data.vars).length - varied(a, data.vars).length
            : num(a) - num(b))
    $('rows').replaceChildren(...list.map(card))
    $('count').textContent = `${list.length} shown`
  }

  function init(d) {
    data = d
    $('lede').textContent = `All ${d.items.length} NASA PSI investigations on one page. Read across a row to see what an investigation studied, what data it has, which variables it changed, and how many of its tests state an outcome. Select a name to open its graphs and publications.`
    $('pillar').replaceChildren(el('option', { value: 'all', textContent: 'All pillars' }),
      ...Object.entries(PILLARS).map(([k, label]) => el('option', { value: k, textContent: label })))
    const hws = [...new Set(d.items.map((i) => i.hardware).filter(Boolean))]
    $('hw').replaceChildren(el('option', { value: 'all', textContent: 'All hardware' }),
      ...hws.map((h) => el('option', { textContent: h })))
    $('note').textContent = `Dots follow the order ${d.vars.join(', ')}. Green: varies. Amber: one value. Grey: not recorded.`
    for (const id of ['q', 'pillar', 'hw', 'sort']) $(id).addEventListener('input', render)
    render()
  }

  const getJson = (u) => fetch(u).then((r) => { if (!r.ok) throw new Error(r.status); return r.json() })

  // The photo manifest is optional: the page still works without it.
  Promise.all([getJson('data/catalogue.json'), getJson('img/nasa/images.json').catch(() => []), getJson('data/publications.json').catch(() => ({})), getJson('data/pub-figures.json').catch(() => [])])
    .then(([d, imgs, pb, figs]) => {
      pubs = pb
      for (const f of figs) for (const k of f.psi) figCount.set(k, (figCount.get(k) || 0) + 1)
      for (const p of imgs) for (const id of p.psi) photos.set(id, p)
      init(d)
    })
    .catch(() => { $('lede').textContent = 'Could not load the investigations.' })
})()
