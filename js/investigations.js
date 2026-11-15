// Investigations table. Data comes from data/catalogue.json, a per-investigation
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

  function row(it) {
    const v = varied(it, data.vars)
    const share = it.harmonised ? it.out / it.harmonised : null
    const meta = [it.hardware, it.fuel_type].filter(Boolean).join(' · ')

    const name = el('td', {},
      el('a', { href: it.psi_url, target: '_blank', rel: 'noopener' }, el('b', { textContent: it.name })),
      el('div', { className: 'small mono', textContent: it.psi_id }),
      el('span', { className: `chip ${it.pillar}`, textContent: PILLARS[it.pillar] || PILLARS.context }))

    const studied = el('td', { className: 'small', textContent: firstSentence(it.summary) },
      el('div', { className: 'muted', textContent: meta }))

    const size = it.rows ? `${it.rows.toLocaleString('en-US')} ${it.kind === 'series' ? 'cells' : 'rows'}` : ''
    const dataCell = el('td', { className: 'small' }, el('b', { textContent: KIND[it.kind] }), el('div', { textContent: size }))

    const dots = el('span', { className: 'dots' },
      ...data.vars.map((k) => el('i', { className: it.fp[k], title: `${k}: ${it.fp[k] === 'empty' ? 'not recorded' : it.fp[k]}` })))
    const list = v.length ? v.slice(0, 3).join(', ') + (v.length > 3 ? ` +${v.length - 3}` : '') : 'none'
    const varCell = el('td', {}, dots, el('div', { className: 'small muted', textContent: list }))

    const outCell = el('td', { className: 'small' })
    if (share == null) {
      outCell.append(el('span', { className: 'muted', textContent: 'not in harmonised table' }))
    } else {
      const pct = Math.round(share * 100)
      const bar = el('span', { className: 'fillbar' }, el('i'))
      bar.firstChild.style.width = `${pct}%`
      outCell.append(bar, `${pct}%`, el('div', { className: 'muted', textContent: `${it.out} of ${it.harmonised}` }))
    }
    return el('tr', {}, name, studied, dataCell, varCell, outCell)
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
    $('rows').replaceChildren(...list.map(row))
    $('count').textContent = `${list.length} shown`
  }

  function init(d) {
    data = d
    $('lede').textContent = `All ${d.items.length} NASA PSI investigations on one page. Read across a row to see what an investigation studied, what data it has, which variables it changed, and how many of its tests state an outcome. Select a name to open its PSI page.`
    $('pillar').replaceChildren(el('option', { value: 'all', textContent: 'All pillars' }),
      ...Object.entries(PILLARS).map(([k, label]) => el('option', { value: k, textContent: label })))
    const hws = [...new Set(d.items.map((i) => i.hardware).filter(Boolean))]
    $('hw').replaceChildren(el('option', { value: 'all', textContent: 'All hardware' }),
      ...hws.map((h) => el('option', { textContent: h })))
    $('note').textContent = `Dots follow the order ${d.vars.join(', ')}. Green: varies. Amber: one value. Grey: not recorded.`
    for (const id of ['q', 'pillar', 'hw', 'sort']) $(id).addEventListener('input', render)
    render()
  }

  fetch('data/catalogue.json')
    .then((r) => { if (!r.ok) throw new Error(r.status); return r.json() })
    .then(init)
    .catch(() => { $('lede').textContent = 'Could not load the investigations.' })
})()
