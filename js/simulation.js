// Simulation page. Loads the fitted parameters, runs the model in the browser, draws one map for the exact inputs.
// The model itself lives in src/sim/model.js and the warning rules in src/sim/warnings.js. Both are tested separately.
import {
  MATERIALS, THICKNESS_MATERIALS, PARAMS, flowScales, thetaFromPacked, locO2, summarizeProbability, summarizeLOC,
  classify, nearestPoints, burnProbability, quantile, P_REF_KPA,
} from '../src/sim/model.js'
import { caseWarnings } from '../src/sim/warnings.js'
import { fm2Predictions, fm2ToCsv } from '../src/sim/fm2.js'

// Reference gravities drawn as dashed lines. Each has its own dash pattern so the lines do not rely on colour.
const REFS = [
  { g: 0, name: '0 g', dash: '2 3' },
  { g: 0.165, name: 'Moon 0.165 g', dash: '7 3' },
  { g: 0.38, name: 'Mars 0.38 g', dash: '12 3' },
  { g: 1, name: '1 g', dash: '14 3 3 3' },
]
const FLOW_MAX = 50
const O2_MIN = 10
const O2_MAX = 30
const NX = 48
const NY = 40
const W = 640, H = 390
const M = { l: 54, r: 14, t: 10, b: 48 }
const PW = W - M.l - M.r
const PH = H - M.t - M.b
const xOf = (f) => M.l + (Math.min(f, FLOW_MAX) / FLOW_MAX) * PW
const yOf = (o) => M.t + ((O2_MAX - o) / (O2_MAX - O2_MIN)) * PH
const clampO2 = (v) => (Number.isFinite(v) ? Math.min(O2_MAX, Math.max(O2_MIN, v)) : O2_MAX)
const SVG = 'http://www.w3.org/2000/svg'
// Slider bounds for the thickness control. The fit ranges used for warnings come from the data.
const THICKNESS_UI = {
  pmma_film: { min: 0.05, max: 0.5, step: 0.05 },
  pmma_slab: { min: 0.5, max: 6, step: 0.5 },
}

const $ = (id) => document.getElementById(id)
const svg = (tag, attrs = {}, ...kids) => {
  const n = document.createElementNS(SVG, tag)
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v)
  n.append(...kids)
  return n
}
const html = (tag, props = {}, ...kids) => {
  const n = Object.assign(document.createElement(tag), props)
  n.append(...kids)
  return n
}
const pct = (p) => `${Math.round(p * 100)}%`
const LABEL = { burns: 'Burns', marginal: 'Marginal', extinguishes: 'Extinguishes' }
const OBSERVED = { burn: 'Burned', extinguish: 'Went out', blowoff: 'Blown off' }
const matLabel = (id) => MATERIALS.find((m) => m.id === id)?.label ?? id

let params, validation, draws, central, points, ranges
let mapDraws, boundaryDraws, refDraws
let cellKey = '', refKey = ''
let selectedIdx = null
let pinned = false
const mapEls = {}

// ---------- inputs ----------
function readInputs() {
  const material = $('material').value
  return {
    material,
    o2: Number($('o2').value),
    p: Number($('pressure').value) || P_REF_KPA,
    uForced: Number($('flow').value),
    direction: document.querySelector('input[name="dir"]:checked').value,
    g: Number($('g').value),
    thickness: THICKNESS_MATERIALS.includes(material) ? Number($('thickness').value) : null,
  }
}

// Slider and number box stay in step.
function link(rangeId, numId) {
  const r = $(rangeId), n = $(numId)
  r.addEventListener('input', () => { n.value = r.value; schedule() })
  n.addEventListener('input', () => {
    if (n.value === '') return
    r.value = n.value
    schedule()
  })
}

function setGravity(g) {
  $('g').value = g
  syncGravity()
  schedule()
}

function syncGravity() {
  const g = Number($('g').value)
  $('gout').textContent = `${g} g`
  document.querySelectorAll('#presets button').forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.g) === g)))
}

// Show the thickness control for film and slab only, with sensible bounds and the default thickness.
function syncThickness() {
  const m = $('material').value
  const field = $('thickness-field')
  const ui = THICKNESS_UI[m]
  field.hidden = !ui
  if (!ui) return
  const r = $('thickness'), n = $('thicknessn')
  for (const el of [r, n]) { el.min = ui.min; el.max = ui.max; el.step = ui.step }
  r.value = n.value = PARAMS.defaultThickness.value[m]
  const fit = ranges.thickness[m]
  $('thickness-hint').textContent = params.thickness_term_used
    ? `Changes the quench flow. Fitted between ${fit[0]} and ${fit[1]} mm.`
    : `Used to pick similar experiments and to warn outside ${fit[0]} to ${fit[1]} mm. It does not change the chance of burning, because adding it did not improve scores on held-out tests.`
}

let queued = false
function schedule() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; update() })
}

// ---------- results ----------
function fmtLoc(s) {
  if (!Number.isFinite(s.median)) return 'Above 60%'
  const f = (x) => (Number.isFinite(x) ? x.toFixed(1) : 'above 60')
  return `${s.median.toFixed(1)}% (5 to 95%: ${f(s.q05)} to ${f(s.q95)})`
}

const LEVEL_WORD = { high: 'Serious', notice: 'Notice', medium: 'Caution', info: 'Note' }

function renderWarnings(items) {
  $('warn-count').textContent = items.length ? `(${items.length})` : '(none specific to these inputs)'
  const lis = items.length
    ? items.map((w) => {
        const li = html('li', { className: 'sim-warn' },
          html('span', { className: 'sim-warn-level', textContent: LEVEL_WORD[w.level] }),
          html('strong', { className: 'sim-warn-label', textContent: w.label }),
          html('span', { textContent: ` ${w.text}` }))
        li.dataset.level = w.level
        return li
      })
    : [html('li', { className: 'sim-warn sim-warn-none', textContent: 'These inputs are inside the fitted microgravity data, so none of the case-specific checks apply.' })]
  $('warnings').replaceChildren(...lis)
}

function renderRangeBar(here) {
  const lo = here.q05 * 100, hi = here.q95 * 100
  $('rb-band').style.left = `${lo}%`
  $('rb-band').style.width = `${Math.max(1, hi - lo)}%`
  $('rb-mean').style.left = `${here.mean * 100}%`
  const t1 = central.extinguishThreshold * 100, t2 = central.burnThreshold * 100
  $('rb-t1').style.left = `${t1}%`
  $('rb-t2').style.left = `${t2}%`
  $('rb-l1').style.left = `${t1}%`
  $('rb-l2').style.left = `${t2}%`
  $('rb-l1').textContent = `${Math.round(t1)}%`
  $('rb-l2').textContent = `${Math.round(t2)}%`
  $('rangebar').setAttribute('aria-label', `Chance of burning ${pct(here.mean)}, 5 to 95% range ${pct(here.q05)} to ${pct(here.q95)}`)
}

function renderResult(inp) {
  const here = summarizeProbability(inp, draws)
  const earth = summarizeProbability({ ...inp, g: 1 }, draws)
  const label = classify(here.mean, central)
  const { ub, u } = flowScales(inp, central)
  const locHere = summarizeLOC(inp, draws)
  const loc1 = summarizeLOC({ ...inp, g: 1 }, draws)

  $('pburn').textContent = pct(here.mean)
  const chip = $('label')
  chip.textContent = LABEL[label]
  chip.dataset.label = label
  $('pband').textContent = `Chance of burning. 5 to 95% range ${pct(here.q05)} to ${pct(here.q95)}. Estimated, not measured.`
  $('ub').textContent = `${ub.toFixed(1)} cm/s`
  $('ueff').textContent = `${u.toFixed(1)} cm/s`
  $('loc').textContent = fmtLoc(locHere)
  $('loc1g').textContent = fmtLoc(loc1)
  $('margin').textContent = !Number.isFinite(locHere.median) || !Number.isFinite(loc1.median)
    ? 'Not defined, at least one limit is above 60%'
    : inp.g === 1
      ? 'None, this is the 1 g case'
      : `${Math.abs(loc1.median - locHere.median).toFixed(1)} points ${loc1.median >= locHere.median ? 'lower' : 'higher'} than at 1 g`

  renderRangeBar(here)
  const items = caseWarnings({ inp, ranges, here, earth, locHere, loc1, validation, central, materialLabel: matLabel(inp.material) })
  renderWarnings(items)
  return { here, label, items, u }
}

// ---------- real experiments ----------
const BASIS = {
  notes: 'Read from the crew notes in the PSI-25 table.',
  air_display: 'Read from the air display column of the PSI-25 table, which is in time order. Not a calibrated cm/s value.',
}
const EVENT = {
  burning_sustained: 'The flame burned steadily at this flow.',
  quench_ramp_down: 'The flame went out while the flow was being reduced. This is a low-flow limit.',
  blowoff: 'The flame was blown off at this flow.',
  burning_at_ignition: 'The flow stated is the one at ignition, and the flame burned.',
  extinct_not_flow_limited: 'The flame went out for a reason other than the flow.',
}
const quoteText = (pt) => pt.evidence.replace(/^(obs|air):/, (m) => (m === 'air:' ? 'Air display: ' : ''))
const flowText = (pt) => (pt.censored ? 'under 1 cm/s' : `${pt.flow} cm/s`)

function select(idx, pin) {
  selectedIdx = idx
  if (pin) pinned = true
  refresh()
}

function renderInspector(inp, near) {
  if (!pinned || selectedIdx === null) selectedIdx = near[0]?.pt.idx ?? null
  const pt = points[selectedIdx]
  const body = $('inspector-body')
  if (!pt) { body.replaceChildren(); return }
  const rank = near.findIndex((n) => n.pt.idx === pt.idx)
  $('insp-h').textContent = pinned ? 'Selected experiment' : 'Nearest experiment'
  const row = (k, ...v) => [html('dt', { textContent: k }), html('dd', {}, ...v)]
  const verdict = html('p', { className: 'sim-insp-verdict' },
    html('span', { className: 'sim-insp-outcome', textContent: OBSERVED[pt.label] }),
    ` at ${flowText(pt)}, ${pt.o2}% oxygen`)
  verdict.dataset.label = pt.label
  const used = pt.useInFit
    ? 'Used to fit the model.'
    : `Left out of the fit. ${pt.readingNote || 'Reason not stated in the source.'}`
  const model = pt.p0 === null
    ? 'Not computed.'
    : `${pct(pt.p0)} chance of burning at 0 g. ${pt.useInFit ? (pt.wrong ? 'The model is on the wrong side of this test.' : 'The model is on the correct side of this test.') : ''}`
  body.replaceChildren(
    verdict,
    html('dl', { className: 'sim-dl sim-insp-dl' },
      ...row('Test', html('a', { href: `https://psi.nasa.gov/physci/repo/data/investigations/${pt.psiId}`, target: '_blank', rel: 'noopener', textContent: `${pt.psiId} test ${pt.testId}` }), rank >= 0 ? ` (one of the 5 nearest)` : ''),
      ...row('Material', `${pt.materialText}${pt.thickness ? `, ${pt.thickness} mm` : ', thickness not stated in the source'}`),
      ...row('Direction', pt.direction || 'not recorded'),
      ...row('What happened', EVENT[pt.event] ?? pt.event),
      ...row('Flow reading', BASIS[pt.basis] ?? pt.basis),
      ...row('Fit', used),
      ...row('0 g model', model)),
    html('blockquote', { className: 'sim-quote' }, quoteText(pt), html('cite', { textContent: ' Quoted from the PSI-25 notes' })))
}

function renderEvidence(near) {
  const rows = near.map(({ pt }) => {
    const tr = html('tr', {},
      html('td', {}, html('button', { type: 'button', className: 'sim-linkbtn', textContent: 'View', 'aria-label': `Show details for test ${pt.testId}` })),
      html('td', {}, html('a', { href: `https://psi.nasa.gov/physci/repo/data/investigations/${pt.psiId}`, target: '_blank', rel: 'noopener', textContent: `${pt.psiId} ${pt.testId}` })),
      html('td', { textContent: pt.materialText }),
      html('td', { textContent: pt.thickness ?? '' }),
      html('td', { textContent: pt.o2 }),
      html('td', { textContent: pt.censored ? 'under 1' : pt.flow }),
      html('td', { textContent: pt.direction || 'not recorded' }),
      html('td', { textContent: OBSERVED[pt.label] }),
      html('td', { className: 'quote', textContent: quoteText(pt) }))
    if (pt.idx === selectedIdx) tr.className = 'is-selected'
    tr.addEventListener('click', (e) => { if (e.target.tagName !== 'A') select(pt.idx, true) })
    return tr
  })
  $('evidence').tBodies[0].replaceChildren(...rows)
}

// ---------- the map ----------
function buildMap() {
  const chart = $('map')
  const axes = svg('g')
  for (let f = 0; f <= FLOW_MAX; f += 10) {
    axes.append(svg('line', { class: 'sim-axis', x1: xOf(f), x2: xOf(f), y1: yOf(O2_MIN), y2: yOf(O2_MIN) + 4 }))
    axes.append(svg('text', { class: 'sim-tick', x: xOf(f), y: yOf(O2_MIN) + 19, 'text-anchor': 'middle' }, String(f)))
  }
  for (let o = O2_MIN; o <= O2_MAX; o += 10) {
    axes.append(svg('line', { class: 'sim-axis', x1: M.l - 4, x2: M.l, y1: yOf(o), y2: yOf(o) }))
    axes.append(svg('text', { class: 'sim-tick', x: M.l - 7, y: yOf(o) + 5, 'text-anchor': 'end' }, String(o)))
  }
  axes.append(
    svg('line', { class: 'sim-axis', x1: M.l, x2: M.l + PW, y1: yOf(O2_MIN), y2: yOf(O2_MIN) }),
    svg('line', { class: 'sim-axis', x1: M.l, x2: M.l, y1: M.t, y2: yOf(O2_MIN) }),
    svg('text', { class: 'sim-axis-label', x: M.l + PW / 2, y: H - 6, 'text-anchor': 'middle' }, 'Forced airflow (cm/s)'),
    svg('text', { class: 'sim-axis-label', transform: `translate(14 ${M.t + PH / 2}) rotate(-90)`, 'text-anchor': 'middle' }, 'Oxygen (%)'))

  const hatch = svg('g')
  const [a, b] = ranges.o2
  const hp = 'url(#hatch-map)'
  hatch.append(
    svg('rect', { x: M.l, y: M.t, width: PW, height: yOf(b) - M.t, fill: hp }),
    svg('rect', { x: M.l, y: yOf(a), width: PW, height: yOf(O2_MIN) - yOf(a), fill: hp }),
    svg('rect', { x: xOf(ranges.flow[1]), y: yOf(b), width: M.l + PW - xOf(ranges.flow[1]), height: yOf(a) - yOf(b), fill: hp }))

  Object.assign(mapEls, {
    cells: svg('g'), band: svg('path', { class: 'sim-band' }), refs: svg('g'), median: svg('path', { class: 'sim-median' }),
    pts: svg('g'),
    marker: svg('g', { class: 'sim-marker-group' },
      svg('circle', { class: 'sim-marker', r: 9 }), svg('circle', { class: 'sim-marker-dot', r: 2 }),
      svg('text', { class: 'sim-miss-label sim-halo', y: 25, 'text-anchor': 'middle', display: 'none' }, 'Known miss')),
  })
  chart.append(
    svg('defs', {}, svg('pattern', { id: 'hatch-map', width: 7, height: 7, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, svg('line', { class: 'sim-hatch', x1: 0, y1: 0, x2: 0, y2: 7 }))),
    mapEls.cells, hatch, mapEls.band, mapEls.refs, mapEls.median, axes, mapEls.pts, mapEls.marker)
}

// The key above the map names every line, so the plot itself carries no text labels.
function buildKey() {
  const item = (swatch, text, id) => html('li', {}, swatch, html('span', id ? { id, textContent: text } : { textContent: text }))
  const line = (cls, dash) => svg('svg', { viewBox: '0 0 30 10', 'aria-hidden': 'true' }, svg('path', { class: cls, d: 'M0 5H30', ...(dash ? { 'stroke-dasharray': dash } : {}) }))
  $('line-key').replaceChildren(
    item(line('sim-median'), '', 'key-own'),
    ...REFS.map((r) => item(line('sim-ref', r.dash), r.name)),
    item(svg('svg', { viewBox: '0 0 30 10', 'aria-hidden': 'true' }, svg('circle', { class: 'sim-marker', cx: 15, cy: 5, r: 4.5 }), svg('circle', { class: 'sim-marker-dot', cx: 15, cy: 5, r: 1.3 })), 'Your input'))
}

const pathOf = (a) => a.map(([x, y], k) => `${k ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('')

function paintCells(inp) {
  const cw = PW / NX, ch = PH / NY
  const rects = []
  for (let j = 0; j < NY; j++) {
    const o2 = O2_MIN + ((j + 0.5) * (O2_MAX - O2_MIN)) / NY
    for (let i = 0; i < NX; i++) {
      const uForced = ((i + 0.5) * FLOW_MAX) / NX
      let s = 0
      for (const d of mapDraws) s += burnProbability({ ...inp, uForced, o2 }, d)
      const p = s / mapDraws.length
      if (p < 0.03) continue
      rects.push(svg('rect', { class: 'sim-cell', x: M.l + i * cw, y: yOf(O2_MIN + ((j + 1) * (O2_MAX - O2_MIN)) / NY), width: cw, height: ch, 'shape-rendering': 'crispEdges', 'fill-opacity': Math.min(0.85, p * 0.9).toFixed(2) }))
    }
  }
  mapEls.cells.replaceChildren(...rects)
}

// Limiting oxygen against flow for one gravity: the 5th, 50th and 95th percentile across draws.
function limitLine(inp, g, drawSet, step) {
  const lo = [], mid = [], hi = []
  for (let f = 0; f <= FLOW_MAX; f += step) {
    const locs = drawSet.map((d) => locO2({ ...inp, g, uForced: f }, d)).sort((p, q) => p - q)
    lo.push([xOf(f), yOf(clampO2(quantile(locs, 0.05)))])
    mid.push([xOf(f), yOf(clampO2(quantile(locs, 0.5)))])
    hi.push([xOf(f), yOf(clampO2(quantile(locs, 0.95)))])
  }
  return { lo, mid, hi }
}

function paintOwnLine(inp) {
  const { lo, mid, hi } = limitLine(inp, inp.g, boundaryDraws, 2)
  mapEls.band.setAttribute('d', `${pathOf(lo)}${[...hi].reverse().map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join('')}Z`)
  mapEls.median.setAttribute('d', pathOf(mid))
}

// Reference lines do not depend on the gravity slider, so they are cached on everything else.
function paintRefLines(inp) {
  const lines = REFS.map((r) => svg('path', { class: 'sim-ref', d: pathOf(limitLine(inp, r.g, refDraws, 2).mid), 'stroke-dasharray': r.dash }))
  mapEls.refs.replaceChildren(...lines)
}

// A dot per real test of the chosen material. Click or Enter selects it. The five nearest carry their table number.
function shapeFor(pt, cx, cy) {
  if (!pt.useInFit) {
    const s = 3.6
    return svg('path', { class: 'sim-pt-skip', d: `M${cx - s} ${cy - s}L${cx + s} ${cy + s}M${cx - s} ${cy + s}L${cx + s} ${cy - s}` })
  }
  if (pt.label === 'burn') return svg('circle', { class: 'sim-pt-burn', cx, cy, r: 4.6 })
  if (pt.label === 'blowoff') {
    const s = 5.4
    return svg('path', { class: 'sim-pt-out', d: `M${cx} ${cy - s}L${cx + s} ${cy}L${cx} ${cy + s}L${cx - s} ${cy}Z` })
  }
  return svg('circle', { class: 'sim-pt-out', cx, cy, r: 4.6 })
}

function paintPoints(inp, near) {
  const nearSet = new Set(near.map((n) => n.pt.idx))
  const out = []
  for (const pt of points.filter((x) => x.material === inp.material)) {
    const cx = xOf(pt.flow), cy = yOf(pt.o2)
    const name = `${pt.testId}: ${OBSERVED[pt.label]} at ${flowText(pt)}, ${pt.o2}% oxygen${pt.useInFit ? '' : ', left out of the fit'}. Click for details.`
    const g = svg('g', { class: 'sim-dot', tabindex: 0, role: 'button', 'aria-label': name }, svg('title', {}, name))
    if (pt.idx === selectedIdx) g.append(svg('circle', { class: 'sim-pt-sel', cx, cy, r: 10 }))
    if (nearSet.has(pt.idx)) g.append(svg('circle', { class: 'sim-near', cx, cy, r: 8.5 }))
    g.append(svg('circle', { class: 'sim-hit', cx, cy, r: 10 }), shapeFor(pt, cx, cy))
    if (pt.useInFit && pt.wrong) g.append(svg('circle', { class: 'sim-pt-wrong', cx, cy, r: 7.5 }))
    g.addEventListener('click', () => select(pt.idx, true))
    g.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(pt.idx, true) } })
    out.push(g)
  }
  // Selected dot last so its ring is not covered.
  out.sort((p, q) => Number(p.querySelector('.sim-pt-sel') !== null) - Number(q.querySelector('.sim-pt-sel') !== null))
  mapEls.pts.replaceChildren(...out)
}

function paintMarker(inp, items) {
  const x = xOf(inp.uForced), y = yOf(clampO2(inp.o2))
  mapEls.marker.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`)
  const miss = mapEls.marker.querySelector('text')
  const flip = y < M.t + 30
  miss.setAttribute('y', flip ? 26 : -15)
  miss.setAttribute('text-anchor', x > M.l + PW - 50 ? 'end' : x < M.l + 40 ? 'start' : 'middle')
  miss.setAttribute('display', items.some((w) => w.id === 'known-miss') ? 'inline' : 'none')
}

const gravityName = (g) => REFS.find((r) => r.g === g)?.name ?? `${g} g`
function describe(inp) {
  const mat = matLabel(inp.material) + (inp.thickness ? `, ${inp.thickness} mm` : '')
  return `${mat}, ${inp.o2}% oxygen, ${inp.p} kPa, ${inp.uForced} cm/s ${inp.direction} flow, ${gravityName(inp.g)}`
}

function renderFitLine(inp) {
  const m = inp.material
  const a = validation.per_material.in_sample[m]
  const l = validation.per_material.leave_one_test_out[m]
  const skipped = points.filter((p) => p.material === m && !p.useInFit).length
  $('fit-line').textContent =
    `${matLabel(m)}: ${a.n - a.wrong_side} of ${a.n} fitted points are on the correct side of the 0 g line. ` +
    `On tests held out of the fit, ${pct(l.accuracy)} were called correctly, against ${pct(l.baseline_accuracy_majority)} for always guessing the commoner outcome.` +
    (skipped ? ` ${skipped} ${skipped === 1 ? 'point was' : 'points were'} left out (grey crosses).` : '')
}

function renderMap(inp, res) {
  const nk = `${inp.material}|${inp.direction}|${inp.p}|${inp.thickness}`
  const ck = `${nk}|${inp.g}`
  if (nk !== refKey) { refKey = nk; paintRefLines(inp); renderFitLine(inp) }
  if (ck !== cellKey) { cellKey = ck; paintCells(inp); paintOwnLine(inp) }
  $('key-own').textContent = `Your gravity, ${inp.g} g`

  const sameMaterial = usedByMaterial(inp.material)
  const near = nearestPoints(inp, sameMaterial, 5)
  if (!pinned || selectedIdx === null || points[selectedIdx]?.material !== inp.material) { pinned = false; selectedIdx = near[0]?.pt.idx ?? null }
  paintPoints(inp, near)
  paintMarker(inp, res.items)
  renderInspector(inp, near)
  renderEvidence(near)

  $('map-summary').textContent = `Map for: ${describe(inp)}.`
  $('map-badge').textContent = inp.g === 0
    ? 'Fitted to microgravity data for this material. Still an estimate.'
    : 'Estimated, no direct measurements at this gravity. The dots are microgravity tests.'
  $('map-caption').textContent = `At your inputs: ${pct(res.here.mean)} chance of burning, ${LABEL[res.label].toLowerCase()}. Effective flow ${res.u.toFixed(1)} cm/s.${inp.o2 > O2_MAX ? ` The map shows oxygen up to ${O2_MAX}%, so the ring is held at the top edge.` : ''}${inp.uForced > FLOW_MAX ? ' Airflow is off the right edge.' : ''}`
}

const usedCache = {}
const usedByMaterial = (m) => (usedCache[m] ??= points.filter((p) => p.useInFit && p.material === m))

// ---------- update ----------
let lastInputs = null
function update() {
  lastInputs = readInputs()
  refresh()
}

function refresh() {
  const inp = lastInputs
  renderMap(inp, renderResult(inp))
}

// ---------- FM2 view ----------
function renderFm2() {
  const rows = fm2Predictions(draws)
  $('fm2-table').tBodies[0].replaceChildren(...rows.map((r) =>
    html('tr', {},
      ...[r.id, r.material, r.thickness_mm, r.o2_percent, r.pressure_kpa, r.forced_flow_cm_s, r.flow_direction, LABEL[r.predicted_outcome],
        pct(r.p_burn), `${pct(r.p_burn_q05)} to ${pct(r.p_burn_q95)}`, pct(r.p_burn_at_1g), r.hidden_risk, r.refuted_if]
        .map((v) => html('td', { textContent: v })))))
  $('fm2-download').onclick = () => {
    const url = URL.createObjectURL(new Blob([fm2ToCsv(rows)], { type: 'text/csv' }))
    const a = html('a', { href: url, download: 'fm2-predictions.csv' })
    document.body.append(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }
}

// ---------- views ----------
const VIEWS = { sim: 'view-sim', fm2: 'view-fm2', how: 'view-how' }
function showView(which) {
  for (const [key, id] of Object.entries(VIEWS)) {
    $(id).hidden = key !== which
    $(`view-${key}-btn`).setAttribute('aria-pressed', String(key === which))
  }
  const hash = { sim: '', fm2: '#fm2', how: '#how' }[which]
  if (location.hash !== hash) history.replaceState(null, '', location.pathname + location.search + hash)
}
const viewFromHash = () => (location.hash === '#fm2' ? 'fm2' : location.hash === '#how' ? 'how' : 'sim')

// ---------- explanation view, filled from the fitted files so it never goes stale ----------
const KIND = { anchored: 'From a NASA source', assumed: 'Assumed', calibrated: 'Fitted to data', definition: 'Definition' }
const NAMES = {
  ub1g: 'Buoyant flow at 1 g (cm/s)',
  mixExponent: 'How forced and buoyant flow combine (exponent n)',
  o2Int: 'Oxygen where the blow-off line reaches zero flow (%)',
  o2Blowoff1g: 'Oxygen at the 1 g blow-off limit (%)',
  sb: 'Sharpness of the blow-off edge',
  gamma: 'Rise in quench flow per % oxygen below 21',
  sq: 'Sharpness of the low-flow edge',
  dirShift: 'Concurrent versus opposed shift (log units)',
  beta: 'Thickness effect on quench flow (log units)',
  uFloor: 'Smallest effective flow (cm/s)',
  gravSigmaMax: 'Extra uncertainty on buoyant flow at high gravity',
  gravSigmaScale: 'Gravity where that extra uncertainty is mostly reached (g)',
  burnThreshold: 'Label "burns" at or above',
  extinguishThreshold: 'Label "extinguishes" at or below',
}
const USE = { calibration: 'Builds the model', check: 'Check only', context: 'Context' }
const fmt = (x) => (typeof x === 'number' ? String(Math.round(x * 1000) / 1000) : String(x))

function renderHow() {
  const rows = []
  for (const [k, name] of Object.entries(NAMES)) {
    const p = params.params[k]
    if (!p) continue
    const fitted = k in params.central
    const used = fitted ? params.central[k] : p.value
    const off = k === 'beta' && !params.thickness_term_used
    rows.push(html('tr', {},
      html('td', { textContent: name }),
      html('td', { textContent: off ? 'Fitted, but not used' : KIND[p.kind] }),
      html('td', { textContent: off ? '0 (switched off)' : fmt(used) }),
      html('td', { textContent: p.range ? `${p.range[0]} to ${p.range[1]}` : '' })))
  }
  params.materials.forEach((m, i) =>
    rows.push(html('tr', {}, html('td', { textContent: `Quench flow at 21% oxygen, ${m.label} (cm/s)` }), html('td', { textContent: 'Fitted to data' }), html('td', { textContent: fmt(Math.exp(params.central.lnUq0[i])) }), html('td'))))
  $('how-constants').tBodies[0].replaceChildren(...rows)

  const v = validation
  const notes = v.nasa_checks.bass2_notes_on_blowoff_side
  $('how-blowoff').textContent =
    `The blow-off line is straight: zero flow at ${params.central.o2Int}% oxygen, and ${params.params.o2Blowoff1g.value}% oxygen at the 1 g buoyant flow of ${params.central.ub1g} cm/s, a slope of ${params.blowoff_slope_pts_per_cm_s} points of oxygen per cm/s. ` +
    `Three BASS-II notes about the blow-off side were not used to build it. The central model gets ${notes.filter((n) => n.central_correct).length} of ${notes.length} right, and ${notes.map((n) => pct(n.share_of_draws_correct)).join(', ')} of the 200 draws do.`

  $('how-anchors').tBodies[0].replaceChildren(...params.anchors.map((a) =>
    html('tr', {},
      html('td', { textContent: a.id }),
      html('td', { textContent: USE[a.use] }),
      html('td', {}, html('div', { textContent: a.quantity }), html('div', { className: 'quote', textContent: `"${a.quote}"` }), a.caveat ? html('div', { className: 'quote', textContent: `Caution: ${a.caveat}` }) : ''),
      html('td', { textContent: a.value }),
      html('td', {}, html('a', { href: a.url, target: '_blank', rel: 'noopener', textContent: `NTRS ${a.ntrsId}, page ${a.page}` })))))

  $('how-data').textContent =
    `${v.points_used} of ${v.points_total} flow points from ${v.tests_used} tests were used in the fit: ` +
    params.materials.map((m) => `${m.points_used} for ${m.label.toLowerCase()}`).join(', ') + '.'
  $('how-excluded').replaceChildren(...v.excluded_points.map((e) => html('li', { textContent: `Test ${e.test}: ${e.reason}` })))

  const wo = v.variants.without_thickness.leave_one_test_out, wi = v.variants.with_thickness.leave_one_test_out
  $('how-thickness').textContent = v.thickness_term_used
    ? `Thickness is in the model for PMMA film and slab. On held-out tests it scored ${wi.brier} Brier against ${wo.brier} without it.`
    : `Thickness was tested as a model term for PMMA film and slab. It improved the fit to the data it was trained on, but on held-out tests it scored ${wi.brier} Brier against ${wo.brier} without it (lower is better). A rule fixed before the test says to keep it only if it helps on held-out tests, so it is not in the model. The thickness box only picks similar experiments and warns about out-of-range values.`

  $('lim-data').append(` Fitted to ${v.points_used} points from ${v.tests_used} tests, read from free text. They have not been checked by a second person.`)

  $('how-fit-intro').textContent =
    'For each material: how many fitted points sit on the correct side of the line, and how often the model was right on tests it had not been fitted to. The last column is the score for always guessing whichever outcome is commoner for that material.'
  $('how-fit').tBodies[0].replaceChildren(...params.materials.map((m) => {
    const a = v.per_material.in_sample[m.id], l = v.per_material.leave_one_test_out[m.id]
    return html('tr', {},
      html('td', { textContent: m.label }),
      html('td', { textContent: a.n }),
      html('td', { textContent: `${a.n - a.wrong_side} of ${a.n} (${pct(a.accuracy)})` }),
      html('td', { textContent: pct(l.accuracy) }),
      html('td', { textContent: pct(l.baseline_accuracy_majority) }))
  }))

  const lo = v.leave_one_test_out, lm = v.leave_one_material_out
  const rel = (m) => (m.brier < m.baseline_brier_prevalence ? 'better than' : 'not better than')
  $('how-validation').textContent =
    `Across all materials, on tests held out of the fit the model was right ${pct(lo.accuracy)} of the time (Brier ${lo.brier}, a constant guess scores ${lo.baseline_brier_prevalence}), which is ${rel(lo)} a constant guess. ` +
    `For a material the model had never seen it was right ${pct(lm.accuracy)} (Brier ${lm.brier} against ${lm.baseline_brier_prevalence}), which is ${rel(lm)} a constant guess. That is why only the four fitted materials are offered.`

  const c = v.nasa_checks
  const ok = (b) => (b ? 'Passes' : 'Fails')
  const range = (m) => `${m.model_central}% (5 to 95%: ${m.q05} to ${m.q95})`
  const checkRows = [
    ['Lowest oxygen that burns, PMMA rod', c.rod_nose.nasa, range(c.rod_nose), c.rod_nose.pass],
    ['1 g limit minus that minimum', c.margin.nasa, `${c.margin.model_central} points (5 to 95%: ${c.margin.q05} to ${c.margin.q95})`, c.margin.pass],
    ['Buoyant flow at 0.165 g (Moon)', c.moon_mars_buoyant_flow.nasa, `${c.moon_mars_buoyant_flow.moon_central} cm/s (${c.moon_mars_buoyant_flow.moon_q05} to ${c.moon_mars_buoyant_flow.moon_q95})`, c.moon_mars_buoyant_flow.moon_central >= 5 && c.moon_mars_buoyant_flow.moon_central <= 20],
    ['Buoyant flow at 0.38 g (Mars)', c.moon_mars_buoyant_flow.nasa, `${c.moon_mars_buoyant_flow.mars_central} cm/s (${c.moon_mars_buoyant_flow.mars_q05} to ${c.moon_mars_buoyant_flow.mars_q95})`, c.moon_mars_buoyant_flow.mars_central >= 5 && c.moon_mars_buoyant_flow.mars_central <= 20],
    ['Quench flow, 0.1 mm film, 21% O2', c.film_quench_21.nasa, `${c.film_quench_21.model_central} cm/s`, c.film_quench_21.pass],
    ['Blow-off flow, 0.1 mm film', c.film_blowoff.nasa, `${c.film_blowoff.model_at_18} to ${c.film_blowoff.model_at_21} cm/s between 18 and 21% O2`, c.film_blowoff.pass],
    ['Downward spread over SIBAL in 1 g air', c.sibal_opposed_1g_in_air.nasa, `P(burn) ${c.sibal_opposed_1g_in_air.model_central_p_burn}, so the model says it burns`, c.sibal_opposed_1g_in_air.pass],
    ...c.saffire2_ground.cases.map((x) => [`SAFFIRE-II ${x.test}, ${x.gravity_g} g, ${matLabel(x.material)}, 20 cm/s concurrent`, 'The whole sample burned', `P(burn) ${x.model_mean_p_burn} (${x.q05} to ${x.q95})`, x.pass]),
    ...notes.map((n) => [`BASS-II note, ${n.note}`, n.observed === 'burn' ? 'Burned' : 'Blown off', `P(burn) ${n.p_burn_central}, right in ${pct(n.share_of_draws_correct)} of draws`, n.central_correct]),
  ]
  $('how-checks').tBodies[0].replaceChildren(...checkRows.map(([name, nasa, model, pass]) =>
    html('tr', {}, html('td', { textContent: name }), html('td', { textContent: nasa }), html('td', { textContent: model }), html('td', { textContent: ok(pass) }))))
  const gap = Math.round((c.rod_nose.model_central - 13.6) * 10) / 10
  $('how-checks-note').textContent =
    'The pass rules were fixed before the results were seen: the rod minimum within 1 point of 13.3 to 13.6%, the margin within 0.5 points of 1.4 to 2.4, Moon and Mars buoyant flow inside 5 to 20 cm/s, film quench flow under 2 cm/s, 40 cm/s between the model blow-off flows at 18 and 21%, and a chance of burning below 50% for SIBAL in opposed flow at 1 g in air, and at least 50% for each SAFFIRE-II case where the whole sample burned. The SAFFIRE-II rule was written after a first look at the numbers, so it is weaker evidence than the rest. ' +
    `The 1 g limit of ${c.rod_limit_1g.nasa} is not a check, because it was used to build the blow-off line. ` +
    (gap > 0 ? `The model's rod minimum sits ${gap} points above NASA's upper figure, so it is a little too cautious there.` : '') +
    (c.sibal_opposed_1g_in_air.pass ? '' : ' The SIBAL check fails: NASA says downward spread over SIBAL does not happen in 1 g air and the model says it does. The result card warns when that case comes up.')

  const rod = v.brief_figures_check.verdicts.find((x) => x.material === 'pmma_rod')
  $('how-literature').textContent =
    `Figures from the task brief (15.6% at 1 g falling to 13 to 14% at 0.05 to 0.1 g) came without a citation and are not used. For reference, with no forced airflow the model gives ${rod.loc_1g}% for a rod at 1 g and ${rod.loc_0_05g}% to ${rod.loc_0_1g}% at 0.05 to 0.1 g.`
}

function renderValidation() {
  const v = validation, lo = v.leave_one_test_out, lm = v.leave_one_material_out, c = v.nasa_checks
  const checks = [c.rod_nose, c.margin, c.moon_mars_buoyant_flow, c.film_quench_21, c.film_blowoff, c.sibal_opposed_1g_in_air, c.saffire2_ground]
  const notes = c.bass2_notes_on_blowoff_side
  const rel = (m) => (m.brier < m.baseline_brier_prevalence ? 'better than' : 'not better than')
  $('validation').textContent =
    `Leave-one-test-out: ${pct(lo.accuracy)} correct, Brier ${lo.brier} (a constant guess scores ${lo.baseline_brier_prevalence}), ${rel(lo)} a constant guess. ` +
    `Leave-one-material-out: ${pct(lm.accuracy)} correct, Brier ${lm.brier} (constant guess ${lm.baseline_brier_prevalence}), ${rel(lm)} a constant guess for a material the model has not seen. ` +
    `Checks against NASA numbers not used to build the model: ${checks.filter((x) => x.pass).length} of ${checks.length} pass, and the three BASS-II blow-off notes are ${notes.filter((n) => n.central_correct).length} of ${notes.length} right. ` +
    `Per-material numbers are under How it works and limits, and everything is in the README.`
}

// ---------- boot ----------
async function boot() {
  const get = (p) => fetch(p).then((r) => { if (!r.ok) throw new Error(`${p}: ${r.status}`); return r.json() })
  ;[params, validation] = await Promise.all([get('data/derived/sim-params.json'), get('data/derived/sim-validation.json')])
  draws = params.draws.map(thetaFromPacked)
  central = thetaFromPacked({ ...params.central, zG: 0 })
  mapDraws = draws.filter((_, i) => i % 4 === 0)
  boundaryDraws = draws.filter((_, i) => i % 4 === 0)
  refDraws = draws.filter((_, i) => i % 10 === 0)
  ranges = params.ranges
  // p0 is the central model's chance of burning at 0 g at the test's own conditions. A test is on the wrong side
  // when that call is the opposite of what was observed.
  points = params.points.map((p, idx) => {
    const p0 = burnProbability({ o2: p.o2, p: P_REF_KPA, uForced: p.flow, direction: p.direction, g: 0, material: p.material, thickness: p.thickness }, central)
    return { ...p, idx, censored: p.basis === 'air_display' && p.flow === 0.5, p0, wrong: (p0 >= 0.5) !== (p.label === 'burn') }
  })

  const sel = $('material')
  for (const m of MATERIALS) {
    const info = params.materials.find((x) => x.id === m.id)
    sel.append(html('option', { value: m.id, textContent: `${m.label} (${info.points_used} flow points)` }))
  }
  sel.value = 'pmma_slab'
  syncThickness()

  link('o2', 'o2n'); link('flow', 'flown'); link('thickness', 'thicknessn')
  $('pressure').addEventListener('input', schedule)
  sel.addEventListener('change', () => { pinned = false; syncThickness(); schedule() })
  document.querySelectorAll('input[name="dir"]').forEach((r) => r.addEventListener('change', schedule))
  $('g').addEventListener('input', () => { syncGravity(); schedule() })
  document.querySelectorAll('#presets button').forEach((b) => b.addEventListener('click', () => setGravity(Number(b.dataset.g))))
  for (const key of Object.keys(VIEWS)) $(`view-${key}-btn`).addEventListener('click', () => showView(key))
  for (const id of ['how-link', 'how-link2']) $(id).addEventListener('click', (e) => { e.preventDefault(); showView('how'); window.scrollTo(0, 0) })
  window.addEventListener('hashchange', () => showView(viewFromHash()))

  buildMap()
  buildKey()
  syncGravity()
  renderValidation()
  renderHow()
  renderFm2()
  $('status').hidden = true
  showView(viewFromHash())
  update()
}

boot().catch((e) => {
  console.error(e)
  $('status').textContent = 'Could not load the model. Run npm run sim:calibrate, then reload.'
})
