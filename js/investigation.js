// Investigation page. Reached from a card on investigations.html as investigation.html?id=PSI-25.
// Shows the summary, a few charts picked for that investigation, figures from its NASA papers,
// and the publication list. Reads data/atlas/*, data/catalogue.json and data/pub-figures.json.
import { curatedCharts, SMALL_TABLE_MAX } from './inv/curated.js'

const $ = (id) => document.getElementById(id)
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props)
  n.append(...kids.filter((k) => k != null && k !== false))
  return n
}
const ext = (href, text, props = {}) => el('a', { href, textContent: text, target: '_blank', rel: 'noopener', ...props })
const getJson = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json() })
const present = (v) => v && !/not stated/i.test(v)
const N = (v) => v.toLocaleString('en-US')

const FUEL = { gas: 'Gas', solid: 'Solid', liquid: 'Liquid' }

// Dataset JSON is column-major: data[i] holds column cols[i].
function toRows(ds) {
  if (!ds.cols?.length) return []
  const n = ds.data[0].length
  return Array.from({ length: n }, (_, r) => Object.fromEntries(ds.cols.map((c, i) => [c, ds.data[i][r]])))
}

const css = (v, d) => getComputedStyle(document.documentElement).getPropertyValue(v).trim() || d

function plotLayout(extra) {
  // The plot area stays a light panel in dark mode too, so it uses fixed dark text rather than the page ink.
  const ink = '#111'
  const merge = (a, b) => {
    const o = { ...a }
    for (const k of Object.keys(b || {})) o[k] = a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) && typeof b[k] === 'object' ? merge(a[k], b[k]) : b[k]
    return o
  }
  const axis = { gridcolor: '#E6DFBA', zerolinecolor: '#E6DFBA', linecolor: ink, linewidth: 2, automargin: true, ticks: 'outside', tickcolor: ink }
  return merge({
    paper_bgcolor: '#FFFFFF', plot_bgcolor: '#FFFFFF',
    font: { family: 'JetBrains Mono, ui-monospace, monospace', size: 12, color: ink },
    margin: { l: 60, r: 20, t: 14, b: 54 }, xaxis: axis, yaxis: axis, yaxis2: axis,
    legend: { orientation: 'h', x: 0, y: -0.28, font: { size: 12 } },
  }, extra)
}

function chartCard(c, psi) {
  const plot = el('div', { className: 'plot' })
  const card = el('section', { className: 'plot-card' },
    el('header', {}, el('h3', { textContent: c.title }), el('p', { textContent: c.why })),
    plot,
    el('footer', {}, `${c.foot} Source: ${psi} table.`))
  if (window.Plotly) {
    requestAnimationFrame(() => window.Plotly.newPlot(plot, c.data, plotLayout(c.layout), { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d', 'select2d'] }))
  } else {
    plot.append(el('p', { className: 'empty', textContent: 'The chart library did not load. Check your connection and reload.' }))
  }
  return card
}

// Small tables are shown as a table, since a chart of two points says nothing.
function smallTable(ds, rows) {
  const cols = ds.columns.filter((c) => !c.key.startsWith('src_') && c.n > 0 && !['gravity_regime'].includes(c.key))
  return el('div', { className: 'tablewrap' }, el('table', {},
    el('thead', {}, el('tr', {}, ...cols.map((c) => el('th', { textContent: `${c.label}${c.unit ? ` (${c.unit})` : ''}` })))),
    el('tbody', {}, ...rows.map((r) => el('tr', {}, ...cols.map((c) => el('td', { textContent: r[c.key] == null ? '' : String(r[c.key]) })))))))
}

function noChartNote(ds, rows, cat, hasFigures) {
  const kind = ds.kind === 'series'
  const why = !rows.length && !kind
    ? 'The PSI data file for this investigation holds no table of test results.'
    : kind
      ? 'The PSI data for this investigation is a set of raw instrument or model traces without consistent units, so a chart here would not be safe to read.'
      : 'The PSI table lists the test set-up but not measured results, so there is nothing meaningful to plot.'
  return el('div', { className: 'empty' }, el('p', { textContent: why }), el('p', { textContent: hasFigures ? 'The figures from the NASA papers below show the results instead.' : 'See the publications below for results.' }))
}

function figureCard(f, lit) {
  const url = `https://ntrs.nasa.gov/citations/${f.ntrs_id}`
  return el('figure', { className: 'fig-card' },
    el('header', {}, el('h3', { textContent: f.heading })),
    el('img', { src: `img/pubs/${f.file}`, alt: f.alt, loading: 'lazy' }),
    el('div', { className: 'fig-body' },
      el('p', {}, el('b', { textContent: 'What it shows ' }), f.shows),
      el('p', {}, el('b', { textContent: 'Why it matters ' }), f.why)),
    el('footer', {}, `${f.label}, page ${f.page}. `, ext(url, f.paper), ` (${lit?.year ?? ''}, NASA NTRS ${f.ntrs_id}). Reproduced from a NASA report cleared for public use.`))
}

function pubList(docs, figIds) {
  const sorted = [...docs].sort((a, b) => a.year - b.year)
  const row = (d) => el('li', {},
    el('span', {}, ext(d.url, d.title), figIds.has(String(d.id)) && el('span', { className: 'tag', textContent: 'figure above' })),
    el('span', { className: 'meta', textContent: `${d.year} · ${d.center}${d.pages ? ` · ${d.pages} pp.` : ''}` }))
  const first = sorted.slice(0, 8), rest = sorted.slice(8)
  const ul = el('ul', { className: 'pubs' }, ...first.map(row))
  const wrap = el('div', {}, ul)
  if (rest.length) {
    const btn = el('button', { type: 'button', id: 'more-pubs', textContent: `Show ${rest.length} more` })
    btn.addEventListener('click', () => { ul.append(...rest.map(row)); btn.remove() })
    wrap.append(btn)
  }
  return wrap
}

const section = (title, lead, ...kids) => el('section', { className: 'inv-sec' }, el('h2', { textContent: title }), lead && el('p', { className: 'lead', textContent: lead }), ...kids)

async function main() {
  const id = new URLSearchParams(location.search).get('id')
  const view = $('view')
  try {
    const [invs, cat, lit, figs, photos] = await Promise.all([
      getJson('data/atlas/investigations.json'), getJson('data/catalogue.json'), getJson('data/atlas/literature.json'),
      getJson('data/pub-figures.json').catch(() => []), getJson('img/nasa/images.json').catch(() => []),
    ])
    const inv = invs.find((i) => i.psi_id === id)
    const item = cat.items.find((i) => i.psi_id === id)
    if (!inv || !item) {
      view.replaceChildren(el('h1', { textContent: 'Investigation not found' }), el('p', {}, `No investigation with the id "${id}". `, el('a', { href: 'investigations.html', textContent: 'Back to the list.' })))
      return
    }
    document.title = `${inv.name} | Flame in freefall`
    const ds = await getJson(`data/atlas/datasets/${id}.json`)
    const rows = toRows(ds)
    const docs = lit.filter((l) => l.investigations.includes(id))
    const myFigs = figs.filter((f) => f.psi.includes(id))
    const litById = new Map(lit.map((l) => [String(l.id), l]))
    const photo = photos.find((p) => p.psi.includes(id))

    // Head: name, summary, photo.
    const media = photo
      ? el('figure', { className: 'inv-photo' }, el('img', { src: `img/nasa/${photo.file}`, alt: photo.alt, width: 1280, height: 800 }),
        el('figcaption', {}, ext(`https://images.nasa.gov/details/${photo.id}`, photo.credit), ' · NASA Image and Video Library'))
      : el('figure', { className: 'inv-photo inv-photo--none' }, el('img', { className: 'logo__anim', src: 'img/logo-256.webp', alt: '' }), el('img', { className: 'logo__still', src: 'img/logo.png', alt: '' }))

    const links = el('div', { className: 'inv-links' }, ext(inv.psi_url, 'PSI record on NASA ↗'), inv.doi && ext(`https://doi.org/${inv.doi}`, `DOI ${inv.doi} ↗`))
    const head = el('div', { className: 'inv-head' },
      el('div', {},
        el('p', { className: 'eyebrow', textContent: `${inv.psi_id} · ${inv.pillar}` }),
        el('h1', {}, el('span', { className: 'hl', textContent: inv.name })),
        el('p', { className: 'inv-full', textContent: inv.full_name }),
        el('p', { className: 'inv-sum', textContent: inv.summary }),
        inv.interpretation && el('div', { className: 'interp' }, el('b', { textContent: 'Interpretation' }), inv.interpretation),
        links),
      media)

    const o2 = inv.conditions?.o2_pct, pr = inv.conditions?.pressure_kpa
    const range = (r, u) => (r?.min != null && r?.max != null ? (r.min === r.max ? `${r.min}${u}` : `${r.min} to ${r.max}${u}`) : null)
    const fact = (k, v) => v && el('div', {}, el('dt', { textContent: k }), el('dd', { textContent: v }))
    const facts = el('dl', { className: 'inv-facts' },
      fact('Platform', present(inv.platform) ? inv.platform : null),
      fact('Hardware', present(inv.hardware) ? inv.hardware : null),
      fact('Period', inv.period ? inv.period.replace(' (as listed)', '') : null),
      fact('Fuel', [FUEL[inv.fuel_type] || inv.fuel_type, (inv.materials || []).filter(present).slice(0, 3).join(', ')].filter(Boolean).join(': ')),
      fact('Oxygen', range(o2, '%')),
      fact('Pressure', range(pr, ' kPa')),
      fact('Data in PSI', ds.kind === 'series' ? `${N(ds.series.length)} series` : rows.length ? `${N(rows.length)} rows` : 'no table'))

    // Charts.
    const charts = ds.kind === 'series' || rows.length ? curatedCharts(id, ds, rows) : []
    const chartBody = el('div', {})
    if (charts.length) chartBody.append(el('div', { className: 'plots' }, ...charts.map((c) => chartCard(c, inv.psi_id))))
    else if (rows.length && rows.length <= SMALL_TABLE_MAX) chartBody.append(el('p', { className: 'lead', textContent: 'This table is small enough to read directly.' }), smallTable(ds, rows))
    else chartBody.append(noChartNote(ds, rows, item, myFigs.length > 0))

    const figIds = new Set(myFigs.map((f) => f.ntrs_id))
    const parts = [head, facts]
    parts.push(section('Graphs from the PSI data',
      charts.length ? 'Picked for this investigation. Each says what it answers and how many rows it uses. Tests with no stated outcome are left out of outcome charts.' : null,
      chartBody))
    if (myFigs.length) {
      parts.push(section('Figures from the NASA publications',
        'Results the PSI table does not hold, taken from the papers listed below. Each links to the paper on NASA NTRS.',
        el('div', { className: 'fig-grid' }, ...myFigs.map((f) => figureCard(f, litById.get(f.ntrs_id))))))
    }
    parts.push(section(`Publications (${docs.length})`,
      docs.length ? 'NASA technical reports linked to this investigation in our literature list. Select a title to open it on NTRS.' : null,
      docs.length ? pubList(docs, figIds) : el('p', { className: 'empty', textContent: 'No NASA technical report in our list is mapped to this investigation yet.' })))

    if (inv.caveats?.length) {
      parts.push(section('Caveats', null, el('ul', { className: 'caveats' }, ...inv.caveats.map((c) => el('li', { textContent: c })))))
    }
    parts.push(el('p', { className: 'prov', textContent: `PSI record modified ${inv.psi_record_modified}; retrieved ${inv.retrieved_on}. Second-person check: ${inv.verified ? 'done' : 'not yet done'}. License: ${inv.license || 'not stated in the source'}.` }))
    view.replaceChildren(...parts.filter(Boolean))
  } catch (e) {
    console.error(e)
    view.replaceChildren(el('p', { textContent: 'Could not load this investigation.' }))
  }
}
main()
