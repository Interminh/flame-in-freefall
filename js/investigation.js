// Investigation detail page: summary, charts, data table, literature and provenance.
// Reads data/atlas/* (built from the PSI tables) and data/catalogue.json.
import { autoCharts, GROUPS, sub2 } from './inv/charts.js'
import { fmt } from './inv/stats.js'

const $ = (id) => document.getElementById(id)
const el = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props)
  n.append(...kids.filter((k) => k != null && k !== false))
  return n
}
const link = (href, text) => el('a', { href, textContent: text, target: '_blank', rel: 'noopener' })
const getJson = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json() })
const present = (v) => v && !/not stated/i.test(v)
const N = (v) => v.toLocaleString('en-US')

// Dataset JSON is column-major: data[i] holds column cols[i].
function toRows(ds) {
  if (!ds.cols?.length) return []
  const n = ds.data[0].length
  return Array.from({ length: n }, (_, r) => Object.fromEntries(ds.cols.map((c, i) => [c, ds.data[i][r]])))
}

// Which analyses a table can support, decided from its variable fingerprint only.
function capabilities(fp) {
  const varies = (k) => fp[k] === 'varies'
  const why = (ks) => ks.map((k) => `${k} ${fp[k] === 'empty' ? 'missing' : fp[k]}`).join(', ')
  const cond = ['O₂', 'Flow speed', 'Pressure', 'Thickness'].some(varies)
  return [
    { label: 'Flammability map', ok: varies('Outcome') && cond, need: 'Outcome and at least one condition vary', reason: why(['Outcome', 'O₂', 'Flow speed', 'Pressure']) },
    { label: 'Oxygen effect', ok: varies('O₂'), need: 'O₂ varies', reason: why(['O₂']) },
    { label: 'Pressure scaling', ok: varies('O₂') && varies('Pressure'), need: 'O₂ and pressure both vary', reason: why(['O₂', 'Pressure']) },
    { label: 'Flow effect', ok: varies('Flow speed'), need: 'Flow speed varies', reason: why(['Flow speed']) },
    { label: 'Thickness effect', ok: varies('Thickness'), need: 'Thickness varies', reason: why(['Thickness']) },
    { label: 'Gravity comparison', ok: varies('Gravity'), need: 'Gravity varies', reason: why(['Gravity']) },
    { label: 'Fuel comparison', ok: varies('Fuel'), need: 'Fuel varies', reason: why(['Fuel']) },
  ]
}

const stat = (k, v, n) => el('div', { className: 'stat' }, el('div', { className: 'stat__k', textContent: k }), el('div', { className: 'stat__v', textContent: v }), n && el('div', { className: 'stat__n', textContent: n }))
const table = (head, body) => el('div', { className: 'cat-wrap' }, el('table', { className: 'cat' }, el('thead', {}, el('tr', {}, ...head.map((h) => el('th', { textContent: h })))), el('tbody', {}, ...body)))

function describe(c) {
  if (c.type === 'num') return [`${fmt(c.min, 3)} to ${fmt(c.max, 3)}`, el('span', { className: 'muted', textContent: ` · median ${fmt(c.median, 3)}` })]
  if (c.top?.length) {
    const shown = c.top.slice(0, 3)
    return [...shown.map(([v, n]) => el('span', { className: 'val' }, String(v).slice(0, 26), el('span', { className: 'muted', textContent: ` ${n}` }))), c.nuniq > shown.length && el('span', { className: 'muted', textContent: ` +${c.nuniq - shown.length} more` })]
  }
  return [el('span', { className: 'muted', textContent: `${c.nuniq} distinct` })]
}

function columnTable(cols, rows) {
  return table(['Column', 'Recorded in', 'Distinct', 'Values'], cols.map((c) => {
    const share = c.n / rows
    const bar = el('span', { className: 'fillbar' }, el('i')); bar.firstChild.style.width = `${Math.round(share * 100)}%`
    return el('tr', {},
      el('td', {}, sub2(c.label), c.unit && el('span', { className: 'muted', textContent: ` (${c.unit})` }), c.nuniq === 1 && c.n > 0 && el('span', { className: 'chip tiny', textContent: 'one value' })),
      el('td', {}, bar, `${Math.round(share * 100)}%`), el('td', { textContent: c.nuniq }), el('td', {}, ...describe(c)))
  }))
}

function seriesSummary(ds) {
  const m = new Map()
  for (const s of ds.series) {
    const k = s.meta?.quantity_original || 'unlabelled'
    const g = m.get(k) || { q: k, series: 0, points: 0, lo: Infinity, hi: -Infinity }
    g.series++; g.points += s.n
    if (s.stats) { g.lo = Math.min(g.lo, s.stats.min); g.hi = Math.max(g.hi, s.stats.max) }
    m.set(k, g)
  }
  const groups = [...m.values()].sort((a, b) => b.points - a.points)
  const kinds = [...new Set(ds.series.map((s) => s.meta?.record_kind).filter(Boolean))]
  return el('div', {},
    el('p', { className: 'small', textContent: `This dataset is a set of numeric series, not a table of tests. ${kinds.length ? `Source record kind: ${kinds.join(', ')}. ` : ''}Each series is one list of x-y values; the quantity is the original header from the source file.` }),
    table(['Quantity (original header)', 'Series', 'Points', 'Value range'], groups.slice(0, 12).map((g) => el('tr', {}, el('td', { textContent: g.q }), el('td', { textContent: g.series }), el('td', { textContent: N(g.points) }), el('td', { textContent: Number.isFinite(g.lo) ? `${fmt(g.lo, 3)} to ${fmt(g.hi, 3)}` : 'n/a' })))),
    groups.length > 12 && el('p', { className: 'small', textContent: `${groups.length - 12} more quantities not shown.` }))
}

function summaryTab(ctx) {
  const { ds, cat, docs } = ctx
  const isSeries = ds.kind === 'series'
  const rowCount = ds.rows || 0
  const std = (ds.columns || []).filter((c) => !c.key.startsWith('src_') && c.n > 0)
  const raw = (ds.columns || []).filter((c) => c.key.startsWith('src_') && c.n > 0)
  const empty = (ds.columns || []).filter((c) => !c.key.startsWith('src_') && c.n === 0)
  const out = std.find((c) => c.key === 'outcome')
  const stated = out ? out.n - (out.top?.find(([v]) => v === 'unknown')?.[1] || 0) : null
  const idCol = std.find((c) => c.nuniq === rowCount)
  const files = ds.provenance?.file ? [...new Set(ds.provenance.file)] : []
  const fp = cat.fp
  const caps = capabilities(fp)
  const names = (s) => Object.keys(fp).filter((k) => fp[k] === s)
  const varied = names('varies'), never = names('empty'), cant = caps.filter((q) => !q.ok)

  const root = el('div', {})
  root.append(el('div', { className: 'stats' },
    stat(isSeries ? 'Points' : 'Rows', N(rowCount), isSeries ? `${ds.series.length} series` : idCol ? `one per ${idCol.label.toLowerCase()}` : 'one per record'),
    stat(isSeries ? 'Quantities' : 'Columns recorded', isSeries ? new Set(ds.series.map((s) => s.meta?.quantity_original)).size : std.length, isSeries ? 'distinct original headers' : `${raw.length} raw source columns kept${empty.length ? `; ${empty.length} empty` : ''}`),
    stat('Outcome stated', stated == null ? 'no outcome column' : `${Math.round((100 * stated) / rowCount)}%`, stated == null ? 'this table records no outcome' : `${N(stated)} of ${N(rowCount)} rows`),
    stat('Linked NASA reports', docs.length, 'in our literature list')))

  root.append(el('div', { className: 'inshort' }, el('b', { textContent: 'In short' }), el('ul', {},
    el('li', {}, el('span', { textContent: 'Changes' }), varied.length ? varied.join(', ') : 'none of the nine tracked variables'),
    never.length > 0 && el('li', {}, el('span', { textContent: 'Never records' }), never.join(', ')),
    !isSeries && el('li', {}, el('span', { textContent: 'Outcome' }), stated == null ? 'not recorded' : `stated for ${Math.round((100 * stated) / rowCount)}% of rows`),
    cant.length > 0 && el('li', {}, el('span', { textContent: 'Cannot answer' }), cant.map((q) => q.label.toLowerCase()).join(', ')))))

  root.append(el('div', { className: 'panel' }, el('h3', { textContent: 'What this table can answer' }),
    el('div', { className: 'caps' }, ...caps.map((q) => el('div', { className: `cap ${q.ok ? 'yes' : 'no'}`, title: `${q.need}. ${q.reason}` }, el('span', { className: 'mark', textContent: q.ok ? '✓' : '–' }), q.label))),
    el('p', { className: 'small', textContent: 'A check mark means the variable takes more than one value in this table, so its effect can be read from the rows.' })))

  root.append(el('h2', { textContent: isSeries ? 'What the series contain' : 'What was recorded' }))
  if (isSeries) { root.append(seriesSummary(ds)); return root }
  root.append(el('p', { className: 'small', textContent: `${idCol ? `Each row is identified by ${idCol.label}. ` : ''}${files.length ? `Rows come from ${files.length} source file${files.length > 1 ? 's' : ''}. ` : ''}"Recorded in" is the share of rows with a value; an empty cell means the source did not state it.` }), columnTable(std, rowCount))
  if (raw.length) {
    const holder = el('div', { className: 'raw' })
    const btn = el('button', { type: 'button', className: 'btn', textContent: `Show ${raw.length} raw source columns` })
    btn.addEventListener('click', () => {
      const open = holder.childElementCount > 0
      holder.replaceChildren(...(open ? [] : [columnTable(raw, rowCount)]))
      btn.textContent = `${open ? 'Show' : 'Hide'} ${raw.length} raw source columns`
    })
    root.append(btn, holder)
  }
  return root
}

function chartsTab(ctx) {
  const { charts, inv } = ctx
  const root = el('div', {})
  if (!charts.length) { root.append(el('p', { textContent: 'This investigation has no tabular rows to chart.' })); return root }
  if (!window.Plotly) { root.append(el('p', { textContent: 'The chart library could not be loaded. Check your connection and reload.' })); return root }
  const ink = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#1B2A41'
  const grid = getComputedStyle(document.documentElement).getPropertyValue('--rule').trim() || '#C3CCD6'
  const axis = { gridcolor: grid, zerolinecolor: grid, linecolor: grid, automargin: true }
  const base = () => ({ paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)', font: { family: 'IBM Plex Sans Condensed, Arial Narrow, sans-serif', size: 12, color: ink }, margin: { l: 56, r: 18, t: 18, b: 48 }, xaxis: axis, yaxis: axis, legend: { orientation: 'h', x: 0, y: 1.02, yanchor: 'bottom', font: { size: 11 } } })
  const merge = (a, b) => { const o = { ...a }; for (const k of Object.keys(b || {})) o[k] = a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) && typeof b[k] === 'object' && !Array.isArray(b[k]) ? merge(a[k], b[k]) : b[k]; return o }

  const tabs = el('div', { className: 'subtabs' })
  const grid2 = el('div', { className: 'charts' })
  const groups = GROUPS.filter((g) => charts.some((c) => c.group === g.id))
  const show = (gid) => {
    tabs.querySelectorAll('button').forEach((b) => b.classList.toggle('active', b.dataset.g === gid))
    grid2.querySelectorAll('.plot').forEach((p) => window.Plotly.purge(p))
    const cards = charts.filter((c) => c.group === gid).map((c) => {
      const plot = el('div', { className: `plot${c.tall ? ' tall' : ''}` })
      const card = el('section', { className: `chart-card${c.tall ? ' wide' : ''}` }, el('header', {}, el('h4', { textContent: c.title }), c.sub && el('div', { className: 'sub', textContent: c.sub })), plot,
        el('footer', {}, c.notes && el('span', { textContent: c.notes }), el('span', { textContent: `Source: ${inv.psi_id} table` })))
      requestAnimationFrame(() => window.Plotly.react(plot, c.data, merge(base(), c.layout), { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['lasso2d', 'select2d'] }))
      return card
    })
    grid2.replaceChildren(...cards)
  }
  for (const g of groups) tabs.append(el('button', { type: 'button', textContent: `${g.label} (${charts.filter((c) => c.group === g.id).length})`, onclick: () => show(g.id) }, ))
  groups.forEach((g, i) => { tabs.children[i].dataset.g = g.id })
  root.append(tabs, grid2)
  show(groups[0].id)
  return root
}

function dataTab(ctx) {
  const { ds, rows } = ctx
  if (!rows.length) return el('p', { textContent: 'No table to show.' })
  const std = ds.columns.filter((c) => !c.key.startsWith('src_')).slice(0, 14)
  let all = false, sort = null, limit = 100
  const root = el('div', {})
  const info = el('span', { className: 'small', textContent: `${rows.length} rows, ${ds.columns.length} columns. Columns prefixed src_ are source columns kept verbatim.` })
  const toggle = el('button', { type: 'button', className: 'btn', textContent: 'Include source columns' })
  const dl = el('button', { type: 'button', className: 'btn', textContent: 'Download CSV' })
  const wrap = el('div', {})
  const more = el('button', { type: 'button', className: 'btn' })

  const draw = () => {
    const cols = all ? ds.columns.slice(0, 40) : std
    let list = rows
    if (sort) list = [...rows].sort((a, b) => { const x = a[sort.k], y = b[sort.k]; if (x == null) return 1; if (y == null) return -1; return (x > y ? 1 : x < y ? -1 : 0) * sort.d })
    const th = cols.map((c) => el('th', { className: 'sortable', textContent: `${c.label}${c.unit ? ` (${c.unit})` : ''}`, onclick: () => { sort = { k: c.key, d: sort?.k === c.key ? -sort.d : 1 }; draw() } }))
    const body = list.slice(0, limit).map((r) => el('tr', {}, ...cols.map((c) => el('td', { textContent: r[c.key] == null ? '' : String(r[c.key]).slice(0, 60) }))))
    wrap.replaceChildren(el('div', { className: 'cat-wrap' }, el('table', { className: 'cat data' }, el('thead', {}, el('tr', {}, ...th)), el('tbody', {}, ...body))))
    more.hidden = limit >= rows.length
    more.textContent = `Show more (${rows.length - limit} left)`
    toggle.textContent = all ? 'Standard columns' : 'Include source columns'
  }
  toggle.onclick = () => { all = !all; draw() }
  more.onclick = () => { limit += 200; draw() }
  dl.onclick = () => {
    const q = (v) => JSON.stringify(v ?? '')
    const text = ds.cols.join(',') + '\n' + rows.map((r) => ds.cols.map((c) => q(r[c])).join(',')).join('\n')
    const a = el('a', { href: URL.createObjectURL(new Blob([text], { type: 'text/csv' })), download: `${ds.id}.csv` })
    a.click()
  }
  root.append(el('div', { className: 'toolbar' }, info, el('span', { className: 'toolbar__btns' }, toggle, dl)), wrap, more)
  draw()
  return root
}

function litTab(ctx) {
  const { inv, docs, anchors, cat } = ctx
  const mine = anchors.filter((a) => docs.some((d) => String(d.id) === String(a.ntrs_id)))
  const root = el('div', {}, el('h2', { textContent: 'Benchmarks against the literature' }))
  if (!mine.length) root.append(el('p', { className: 'muted', textContent: 'No curated benchmark from the literature is attached to this investigation yet.' }))
  else {
    if (cat.rod_check) root.append(el('p', { className: 'callout' }, el('b', { textContent: 'Reproduction check. ' }), `The lowest O₂ among the ${cat.rod_check.n} PMMA rod rows in this table is ${cat.rod_check.min_o2}%. NASA reports its lowest BASS-II test point at 13.6% O₂ (NTRS 20160000593, p. 18). The match shows the repository table carries the paper's headline number; it does not by itself verify any outcome label.`))
    root.append(table(['Quantity', 'Value', 'Quote', 'Source'], mine.map((a) => el('tr', {},
      el('td', { textContent: a.quantity }), el('td', { textContent: a.value }),
      el('td', { className: 'small' }, `“${a.quote}”`, a.caveat && el('div', { className: 'muted', textContent: `Caveat: ${a.caveat}` })),
      el('td', {}, link(a.ntrs_url, `NTRS ${a.ntrs_id}, p. ${a.pdf_page}`), a.quote_verified && el('span', { className: 'chip tiny', textContent: 'quote checked' }))))))
  }
  root.append(el('h2', { textContent: 'Linked NASA reports' }))
  if (!docs.length) root.append(el('p', { className: 'muted', textContent: 'No NTRS report in our list is mapped to this investigation.' }))
  else root.append(el('ul', { className: 'plain' }, ...docs.map((d) => el('li', {}, link(d.url, d.title), el('span', { className: 'small muted', textContent: ` ${d.year}, ${d.center}${d.pages ? `, ${d.pages} pp.` : ''}` })))))
  return root
}

function provTab(ctx) {
  const { inv } = ctx
  return el('div', { className: 'two' },
    el('div', { className: 'panel' }, el('h3', { textContent: 'Source files' }), el('ul', { className: 'plain' }, ...(inv.files || []).map((f) => el('li', {}, el('code', { textContent: f.name }), el('span', { className: 'small muted', textContent: ` ${f.format}, ${(f.size_bytes / 1024).toFixed(0)} KB` }))))),
    el('div', { className: 'panel' }, el('h3', { textContent: 'Record' }),
      el('p', { className: 'small', textContent: `Retrieved ${inv.retrieved_on}; PSI record modified ${inv.psi_record_modified}. Verified by a second person: ${inv.verified ? 'yes' : 'no'}.` }),
      ...(inv.sources || []).map((s) => el('div', {}, link(s, s)))))
}

async function main() {
  const id = new URLSearchParams(location.search).get('id')
  const view = $('view')
  try {
    const [invs, cat] = await Promise.all([getJson('data/atlas/investigations.json'), getJson('data/catalogue.json')])
    const inv = invs.find((i) => i.psi_id === id)
    const item = cat.items.find((i) => i.psi_id === id)
    if (!inv || !item) { view.replaceChildren(el('h1', { textContent: 'Investigation not found' }), el('p', {}, `No investigation with the id "${id}". `, el('a', { href: 'investigations.html', textContent: 'Back to the list.' }))); return }
    document.title = `${inv.name} | Flame in freefall`
    const [ds, lit, anchors] = await Promise.all([getJson(`data/atlas/datasets/${id}.json`), getJson('data/atlas/literature.json'), getJson('data/atlas/anchors.json')])
    const rows = toRows(ds)
    const ctx = { inv, cat: item, ds, rows, anchors, docs: lit.filter((l) => l.investigations.includes(id)), charts: autoCharts(ds, rows) }

    const tabs = [
      { id: 'summary', label: 'Summary', build: summaryTab },
      { id: 'charts', label: `Charts (${ctx.charts.length})`, build: chartsTab },
      { id: 'table', label: 'Data', build: dataTab },
      { id: 'lit', label: `Literature (${ctx.docs.length})`, build: litTab },
      { id: 'prov', label: 'Provenance', build: provTab },
    ]
    const body = el('div', { className: 'tab-body' })
    const bar = el('div', { className: 'tabs', role: 'tablist' })
    const open = (t) => {
      bar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.t === t.id)))
      body.replaceChildren(t.build(ctx))
    }
    for (const t of tabs) { const b = el('button', { type: 'button', role: 'tab', textContent: t.label, onclick: () => open(t) }); b.dataset.t = t.id; bar.append(b) }

    const chips = [el('span', { className: `chip ${inv.pillar}`, textContent: inv.pillar }), present(inv.hardware) && el('span', { className: 'chip', textContent: inv.hardware }), present(inv.platform) && el('span', { className: 'chip', textContent: inv.platform }), inv.period && el('span', { className: 'chip', textContent: inv.period }), present(inv.license) && el('span', { className: 'chip', textContent: inv.license })]
    view.replaceChildren(
      el('p', { className: 'small muted', textContent: [inv.psi_id, present(inv.facility) ? inv.facility.split(',')[0] : null].filter(Boolean).join(' · ') }),
      el('h1', { textContent: inv.name }), el('p', { textContent: inv.summary }),
      el('div', { className: 'chips' }, ...chips, el('a', { className: 'btn', href: inv.psi_url, target: '_blank', rel: 'noopener', textContent: 'PSI record' }), inv.doi && el('a', { className: 'btn', href: `https://doi.org/${inv.doi}`, target: '_blank', rel: 'noopener', textContent: `DOI ${inv.doi}` })),
      inv.caveats?.length > 0 && el('div', { className: 'callout' }, el('b', { textContent: 'Caveats recorded for this investigation' }), ...inv.caveats.map((c) => el('div', { textContent: c }))),
      bar, body)
    open(tabs[0])
  } catch (e) {
    view.replaceChildren(el('p', { textContent: 'Could not load this investigation.' }))
  }
}
main()
