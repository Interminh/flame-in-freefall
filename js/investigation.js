// Investigation page. Reached from a card on investigations.html as investigation.html?id=PSI-25.
// Shows the summary, charts picked for that investigation (from the atlas table and the raw PSI
// tables), figures from NASA papers and reports, the raw tables, and every publication PSI lists.
import { curatedCharts, SMALL_TABLE_MAX } from './inv/curated.js'

const $ = (id) => document.getElementById(id)
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props)
  n.append(...kids.filter((k) => k != null && k !== false))
  return n
}
const ext = (href, text, props = {}) => el('a', { href, textContent: text, target: '_blank', rel: 'noopener', ...props })
const getJson = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json() })
const present = (v) => v && !/not (stated|named)/i.test(v)
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
    for (const k of Object.keys(b || {})) o[k] = a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) && typeof b[k] === 'object' && !Array.isArray(b[k]) ? merge(a[k], b[k]) : b[k]
    return o
  }
  const axis = { gridcolor: '#E6DFBA', zerolinecolor: '#E6DFBA', linecolor: ink, linewidth: 2, automargin: true, ticks: 'outside', tickcolor: ink }
  const out = merge({
    paper_bgcolor: '#FFFFFF', plot_bgcolor: '#FFFFFF',
    font: { family: 'JetBrains Mono, ui-monospace, monospace', size: 12, color: ink },
    margin: { l: 60, r: 20, t: 14, b: 54 }, xaxis: axis, yaxis: axis, yaxis2: axis,
    legend: { orientation: 'h', x: 0, y: -0.28, font: { size: 12 } },
  }, extra)
  // This Plotly version wants axis titles as objects, not plain strings.
  for (const k of ['xaxis', 'yaxis', 'yaxis2']) if (typeof out[k]?.title === 'string') out[k].title = { text: out[k].title }
  return out
}

function chartCard(c, psi) {
  const plot = el('div', { className: 'plot' })
  const card = el('section', { className: 'plot-card' },
    el('header', {}, el('h3', { textContent: c.title }), el('p', { textContent: c.why })),
    plot,
    el('footer', {}, `${c.foot ? `${c.foot} ` : ''}Source: ${psi} data.`))
  if (window.Plotly) {
    requestAnimationFrame(() => window.Plotly.newPlot(plot, c.data, plotLayout(c.layout), { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d', 'select2d'] }))
  } else {
    plot.append(el('p', { className: 'empty', textContent: 'The chart library did not load. Check your connection and reload.' }))
  }
  return card
}

// Small tables are shown as a table, since a chart of two points says nothing.
function smallTable(ds, rows) {
  const cols = ds.columns.filter((c) => !c.key.startsWith('src_') && c.n > 0 && c.key !== 'gravity_regime')
  return el('div', { className: 'tablewrap' }, el('table', {},
    el('thead', {}, el('tr', {}, ...cols.map((c) => el('th', { textContent: `${c.label}${c.unit ? ` (${c.unit})` : ''}` })))),
    el('tbody', {}, ...rows.map((r) => el('tr', {}, ...cols.map((c) => el('td', { textContent: r[c.key] == null ? '' : String(r[c.key]) })))))))
}

function noChartNote(hasFigures) {
  return el('div', { className: 'empty' },
    el('p', { textContent: 'PSI holds no chartable data for this investigation: the files are documents, or tables of set-up only.' }),
    el('p', { textContent: hasFigures ? 'The figures from the NASA papers below show the results instead.' : 'See the publications below for results.' }))
}

function figureCard(f, litById) {
  const fromNtrs = f.source === 'ntrs' || f.ntrs_id
  const url = fromNtrs ? `https://ntrs.nasa.gov/citations/${f.ntrs_id}` : `https://psi.nasa.gov/physci/repo/data/investigations/${f.psi_home}`
  const year = fromNtrs ? litById.get(String(f.ntrs_id))?.year : null
  const cite = fromNtrs
    ? [ext(url, f.paper), ` (${year ? `${year}, ` : ''}NASA NTRS ${f.ntrs_id}), ${f.label || `page ${f.page}`}. Public-use NASA report.`]
    : [ext(url, f.paper), `, PDF page ${f.page}. Document hosted on the ${f.psi_home} PSI record (CC0-1.0).`]
  return el('figure', { className: 'fig-card' },
    el('header', {}, el('h3', { textContent: f.heading })),
    el('img', { src: `img/pubs/${f.file}`, alt: f.alt, loading: 'lazy' }),
    el('div', { className: 'fig-body' },
      el('p', {}, el('b', { textContent: 'What it shows ' }), f.shows),
      el('p', {}, el('b', { textContent: 'Why it matters ' }), f.why)),
    el('footer', {}, ...cite))
}

// Raw PSI tables, with the original column headers. First rows only, with a way to see more.
function rawTables(raw) {
  const wrap = el('div', {})
  const tabs = el('div', { className: 'subtabs', role: 'tablist' })
  const body = el('div', {})
  let limit = 25
  const draw = (t) => {
    const shown = t.rows.slice(0, limit)
    const cols = t.cols.map((c, i) => ({ c: c || `col ${i + 1}`, i }))
    const more = el('button', { type: 'button', textContent: `Show ${Math.min(75, t.rows.length - limit)} more`, hidden: limit >= t.rows.length })
    more.addEventListener('click', () => { limit += 75; draw(t) })
    body.replaceChildren(
      el('p', { className: 'small', textContent: `${N(t.rows.length)} rows, ${t.cols.length} columns. Source file: ${t.source}.${t.note ? ` ${t.note}` : ''} Showing the first ${N(Math.min(limit, t.rows.length))}; the full file is on the PSI record.` }),
      el('div', { className: 'tablewrap' }, el('table', {},
        el('thead', {}, el('tr', {}, ...cols.map(({ c }) => el('th', { textContent: c })))),
        el('tbody', {}, ...shown.map((r) => el('tr', {}, ...cols.map(({ i }) => el('td', { textContent: r[i] == null ? '' : String(r[i]) }))))))),
      more)
  }
  raw.tables.forEach((t, k) => {
    const b = el('button', { type: 'button', role: 'tab', textContent: t.name })
    b.addEventListener('click', () => { limit = 25; tabs.querySelectorAll('button').forEach((x) => x.setAttribute('aria-selected', String(x === b))); draw(t) })
    if (k === 0) b.setAttribute('aria-selected', 'true')
    tabs.append(b)
  })
  wrap.append(tabs, body)
  draw(raw.tables[0])
  return wrap
}

function pubList(pubs, ntrsUsed) {
  const sorted = [...pubs].sort((a, b) => (b.year || 0) - (a.year || 0))
  const row = (p) => el('li', {},
    el('span', { className: 'pub__main' },
      p.url ? ext(p.url, p.title) : el('span', { textContent: p.title }),
      p.ntrs_id && ntrsUsed.has(String(p.ntrs_id)) && el('span', { className: 'tag', textContent: 'figure above' }),
      p.ntrs_id && el('a', { className: 'tag tag--link', href: `https://ntrs.nasa.gov/citations/${p.ntrs_id}`, target: '_blank', rel: 'noopener', textContent: 'free copy on NTRS' }),
      p.authors && el('span', { className: 'pub__au', textContent: p.authors })),
    el('span', { className: 'meta', textContent: [p.year, p.url ? null : 'no link on PSI'].filter(Boolean).join(' · ') }))
  const first = sorted.slice(0, 10), rest = sorted.slice(10)
  const ul = el('ul', { className: 'pubs' }, ...first.map(row))
  const wrap = el('div', {}, ul)
  if (rest.length) {
    const btn = el('button', { type: 'button', id: 'more-pubs', textContent: `Show all ${sorted.length} publications` })
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
    const [invs, cat, lit, figs, photos, pubsAll] = await Promise.all([
      getJson('data/atlas/investigations.json'), getJson('data/catalogue.json'), getJson('data/atlas/literature.json'),
      getJson('data/pub-figures.json').catch(() => []), getJson('img/nasa/images.json').catch(() => []), getJson('data/publications.json').catch(() => ({})),
    ])
    const inv = invs.find((i) => i.psi_id === id)
    const item = cat.items.find((i) => i.psi_id === id)
    if (!inv || !item) {
      view.replaceChildren(el('h1', { textContent: 'Investigation not found' }), el('p', {}, `No investigation with the id "${id}". `, el('a', { href: 'investigations.html', textContent: 'Back to the list.' })))
      return
    }
    document.title = `${inv.name} | Flame in freefall`
    const [ds, raw] = await Promise.all([getJson(`data/atlas/datasets/${id}.json`), getJson(`data/inv/${id}.json`).catch(() => null)])
    const rows = toRows(ds)
    const pubs = pubsAll[id] || []
    const myFigs = figs.filter((f) => f.psi.includes(id))
    const litById = new Map(lit.map((l) => [String(l.id), l]))
    const photo = photos.find((p) => p.psi.includes(id))

    const media = photo
      ? el('figure', { className: 'inv-photo' }, el('img', { src: `img/nasa/${photo.file}`, alt: photo.alt, width: 1280, height: 800 }),
        el('figcaption', {}, ext(`https://images.nasa.gov/details/${photo.id}`, photo.credit), ' · NASA Image and Video Library'))
      : el('figure', { className: 'inv-photo inv-photo--none' }, el('img', { src: 'img/logo.png', alt: '' }))

    const links = el('div', { className: 'inv-links' }, ext(inv.psi_url, 'PSI record on NASA ↗'), inv.doi && ext(`https://doi.org/${inv.doi}`, `DOI ${inv.doi} ↗`),
      el('a', { href: '#graphs', textContent: 'Graphs' }), myFigs.length > 0 && el('a', { href: '#figures', textContent: `Paper figures (${myFigs.length})` }),
      raw && el('a', { href: '#data', textContent: 'Data tables' }), el('a', { href: '#pubs', textContent: `Publications (${pubs.length})` }))
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
    const tableRows = raw ? raw.tables.reduce((a, t) => a + t.rows.length, 0) : 0
    const facts = el('dl', { className: 'inv-facts' },
      fact('Platform', present(inv.platform) ? inv.platform : null),
      fact('Hardware', present(inv.hardware) ? inv.hardware : null),
      fact('Period', inv.period ? inv.period.replace(' (as listed)', '') : null),
      fact('Fuel', [FUEL[inv.fuel_type] || inv.fuel_type, (inv.materials || []).filter(present).slice(0, 3).join(', ')].filter(Boolean).join(': ')),
      fact('Oxygen', range(o2, '%')),
      fact('Pressure', range(pr, ' kPa')),
      fact('Data in PSI', raw ? `${N(tableRows)} rows in ${raw.tables.length} table${raw.tables.length === 1 ? '' : 's'}` : ds.kind === 'series' ? `${N(ds.series.length)} series` : 'documents only'),
      fact('Publications on PSI', pubs.length ? String(pubs.length) : null))

    // Charts.
    const charts = curatedCharts(id, ds, rows, raw)
    const chartBody = el('div', {})
    if (charts.length) chartBody.append(el('div', { className: 'plots' }, ...charts.map((c) => chartCard(c, inv.psi_id))))
    else if (raw) chartBody.append(el('div', { className: 'empty' }, el('p', { textContent: 'There are too few measured values to chart here. The raw tables are small enough to read directly and are shown in full below.' }), myFigs.length > 0 && el('p', { textContent: 'The figures from the NASA papers show the results.' })))
    else if (rows.length && rows.length <= SMALL_TABLE_MAX) chartBody.append(el('p', { className: 'lead', textContent: 'This table is small enough to read directly.' }), smallTable(ds, rows))
    else chartBody.append(noChartNote(myFigs.length > 0))

    const ntrsUsed = new Set(myFigs.filter((f) => f.ntrs_id).map((f) => String(f.ntrs_id)))
    const parts = [head, facts]
    const g = section('Graphs from the PSI data', charts.length ? 'Picked for this investigation. Each says what it answers and how many rows it uses. Tests with no stated outcome are left out of outcome charts.' : null, chartBody)
    g.id = 'graphs'
    parts.push(g)
    if (myFigs.length) {
      const f = section('Figures from the NASA publications', 'Results the PSI tables do not hold, taken from the papers, reports and slides linked on this page. Each figure says where it comes from.',
        el('div', { className: 'fig-grid' }, ...myFigs.map((x) => figureCard(x, litById))))
      f.id = 'figures'
      parts.push(f)
    }
    if (raw) {
      const d = section('Data tables', 'The raw tables from PSI with their original column names, including columns the charts above do not use.', rawTables(raw))
      d.id = 'data'
      parts.push(d)
    }
    const p = section(`Publications (${pubs.length})`,
      pubs.length ? 'Everything PSI lists for this investigation. Titles link to the paper through its DOI or the link PSI gives. “Free copy on NTRS” marks papers we found on the NASA technical reports server.' : null,
      pubs.length ? pubList(pubs, ntrsUsed) : el('p', { className: 'empty', textContent: 'PSI lists no publications for this investigation.' }))
    p.id = 'pubs'
    parts.push(p)
    if (inv.caveats?.length) parts.push(section('Caveats', null, el('ul', { className: 'caveats' }, ...inv.caveats.map((c) => el('li', { textContent: c })))))
    parts.push(el('p', { className: 'prov', textContent: `PSI record modified ${inv.psi_record_modified}; retrieved ${inv.retrieved_on}. Second-person check: ${inv.verified ? 'done' : 'not yet done'}. License: ${inv.license || 'not stated in the source'}.` }))
    view.replaceChildren(...parts.filter(Boolean))
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView()
  } catch (e) {
    console.error(e)
    view.replaceChildren(el('p', { textContent: 'Could not load this investigation.' }))
  }
}
main()
