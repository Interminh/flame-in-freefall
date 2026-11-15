// Query layer for the harmonised test table (tests.json).
// Everything here is derived from the rows themselves: facet values, counts, ranges and the vocabulary used
// to turn a sentence into filters. Nothing is a hard-coded list of materials or experiments.
import { median, quantile, spearman, fmt } from './stats.js'

export const PSI_PER_KPA = 0.1450377377
export const KPA_PER_PSI = 6.894757293

// Column catalogue. `unit` is shown in headers and chart axes; `kind` drives filtering, charting and profiling.
export const COLS = [
  { key: 'experiment', label: 'Experiment', kind: 'cat' },
  { key: 'psi_id', label: 'PSI id', kind: 'cat' },
  { key: 'test_id', label: 'Test id', kind: 'id' },
  { key: 'platform', label: 'Platform', kind: 'cat' },
  { key: 'form', label: 'Form', kind: 'cat' },
  { key: 'material', label: 'Material', kind: 'cat' },
  { key: 'fuel', label: 'Fuel (as recorded)', kind: 'cat' },
  { key: 'o2_percent', label: 'Oxygen', unit: '%', kind: 'num' },
  { key: 'pressure_kpa', label: 'Total pressure', unit: 'kPa', kind: 'num' },
  { key: 'ppo2_kpa', label: 'O₂ partial pressure', unit: 'kPa', kind: 'num' },
  { key: 'flow_velocity_cm_s', label: 'Flow speed', unit: 'cm/s', kind: 'num' },
  { key: 'flow_direction', label: 'Flow direction', kind: 'cat' },
  { key: 'fuel_thickness_mm', label: 'Fuel thickness', unit: 'mm', kind: 'num' },
  { key: 'rod_diameter_mm', label: 'Rod diameter', unit: 'mm', kind: 'num' },
  { key: 'gravity_g', label: 'Gravity (if stated)', unit: 'g', kind: 'num' },
  { key: 'outcome_class', label: 'Outcome class', kind: 'cat' },
  { key: 'outcome', label: 'Outcome (as recorded)', kind: 'cat' },
  { key: 'spread_rate_mm_s', label: 'Spread rate', unit: 'mm/s', kind: 'num' },
  { key: 'extinction_reason', label: 'Extinction reason', kind: 'cat' },
  { key: 'pillar', label: 'Pillar', kind: 'cat' },
  { key: 'source_file', label: 'Source file', kind: 'id' },
  { key: 'source_row_or_page', label: 'Source row / page', kind: 'id' },
]
export const COL = Object.fromEntries(COLS.map((c) => [c.key, c]))
export const colTitle = (k) => (COL[k] ? COL[k].label + (COL[k].unit ? ` (${COL[k].unit})` : '') : k)
export const NUM_COLS = COLS.filter((c) => c.kind === 'num').map((c) => c.key)
export const DEFAULT_COLS = ['experiment', 'test_id', 'material', 'form', 'o2_percent', 'pressure_kpa', 'flow_velocity_cm_s', 'outcome_class', 'platform']

// Categorical facets shown in the sidebar, in display order.
export const FACETS = [
  { key: 'experiment', label: 'Experiment' },
  { key: 'pillar', label: 'Pillar' },
  { key: 'form', label: 'Form' },
  { key: 'material', label: 'Material' },
  { key: 'outcome_class', label: 'Outcome' },
  { key: 'flow_direction', label: 'Flow direction' },
  { key: 'platform', label: 'Platform' },
]
// Numeric range filters.
export const RANGES = [
  { key: 'o2_percent', param: 'o2', label: 'Oxygen', unit: '%' },
  { key: 'pressure_kpa', param: 'p', label: 'Total pressure', unit: 'kPa' },
  { key: 'flow_velocity_cm_s', param: 'flow', label: 'Flow speed', unit: 'cm/s' },
  { key: 'fuel_thickness_mm', param: 'thick', label: 'Fuel thickness', unit: 'mm' },
]
// "Has value" toggles.
export const HAS = [
  { id: 'o2', key: 'o2_percent', label: 'oxygen' },
  { id: 'p', key: 'pressure_kpa', label: 'pressure' },
  { id: 'flow', key: 'flow_velocity_cm_s', label: 'flow speed' },
  { id: 'outcome', key: 'outcome_class', label: 'a stated outcome', test: (r) => r.outcome_class !== 'unknown' },
]

export const OUTCOME_LABEL = { flame: 'Flame (ignited)', no_flame: 'No flame (extinguished / no ignition)', burned_out: 'Burned out', unknown: 'Not stated' }
export const label = (key, v) => {
  if (v == null || v === '') return 'Not stated'
  if (key === 'outcome_class') return OUTCOME_LABEL[v] || v
  return String(v)
}

export const emptyState = () => ({ text: '', cat: {}, range: {}, has: [] })
export const isEmpty = (s) => !s.text && !Object.values(s.cat).some((a) => a.length) && !Object.keys(s.range).length && !s.has.length

// ---- URL <-> state -------------------------------------------------------------------------------------------
export function fromParams(sp) {
  const s = emptyState()
  s.text = sp.get('q') || ''
  for (const f of FACETS) { const v = sp.get(f.key); if (v) s.cat[f.key] = v.split('|').filter(Boolean) }
  for (const r of RANGES) {
    const v = sp.get(r.param)
    if (!v) continue
    const [a, b] = v.split('~')
    const lo = a === '' ? null : Number(a), hi = b === '' || b == null ? null : Number(b)
    if ((lo != null && !Number.isNaN(lo)) || (hi != null && !Number.isNaN(hi))) s.range[r.key] = [Number.isNaN(lo) ? null : lo, Number.isNaN(hi) ? null : hi]
  }
  const h = sp.get('has'); if (h) s.has = h.split(',').filter((x) => HAS.some((y) => y.id === x))
  return s
}
export function toParams(s, extra = {}) {
  const p = new URLSearchParams()
  if (s.text) p.set('q', s.text)
  for (const f of FACETS) if (s.cat[f.key]?.length) p.set(f.key, s.cat[f.key].join('|'))
  for (const r of RANGES) { const v = s.range[r.key]; if (v && (v[0] != null || v[1] != null)) p.set(r.param, `${v[0] ?? ''}~${v[1] ?? ''}`) }
  if (s.has.length) p.set('has', s.has.join(','))
  for (const [k, v] of Object.entries(extra)) if (v != null && v !== '') p.set(k, v)
  return p
}

// ---- filtering -----------------------------------------------------------------------------------------------
const NOT_STATED = 'Not stated'
const cellKey = (r, k) => (r[k] == null || r[k] === '' ? NOT_STATED : String(r[k]))

function passes(r, s, skip) {
  if (s.text) {
    const hay = `${r.experiment} ${r.psi_id} ${r.test_id} ${r.material} ${r.fuel} ${r.form}`.toLowerCase()
    for (const w of s.text.toLowerCase().split(/\s+/).filter(Boolean)) if (!hay.includes(w)) return false
  }
  for (const f of FACETS) {
    if (f.key === skip) continue
    const sel = s.cat[f.key]
    if (sel?.length && !sel.includes(cellKey(r, f.key))) return false
  }
  for (const [k, [lo, hi]] of Object.entries(s.range)) {
    const v = r[k]
    if (v == null) return false
    if (lo != null && v < lo) return false
    if (hi != null && v > hi) return false
  }
  for (const id of s.has) {
    const h = HAS.find((x) => x.id === id)
    if (h.test ? !h.test(r) : r[h.key] == null) return false
  }
  return true
}
export const applyFilters = (rows, s) => rows.filter((r) => passes(r, s))

// Facet counts for each categorical facet, computed with that facet's own selection ignored so the
// user can see what adding another value would give (standard faceted-search behaviour).
export function facetCounts(rows, s) {
  const out = {}
  for (const f of FACETS) {
    const m = new Map()
    for (const r of rows) if (passes(r, s, f.key)) { const k = cellKey(r, f.key); m.set(k, (m.get(k) || 0) + 1) }
    // keep selected values visible even when their count is now 0
    for (const v of s.cat[f.key] || []) if (!m.has(v)) m.set(v, 0)
    out[f.key] = [...m.entries()].sort((a, b) => (a[0] === NOT_STATED) - (b[0] === NOT_STATED) || b[1] - a[1] || a[0].localeCompare(b[0]))
  }
  return out
}

// Observed [min, max] of each numeric column over all rows.
export function rangeBounds(rows) {
  const out = {}
  for (const r of RANGES) {
    let lo = Infinity, hi = -Infinity, n = 0
    for (const row of rows) { const v = row[r.key]; if (v != null) { n++; if (v < lo) lo = v; if (v > hi) hi = v } }
    out[r.key] = n ? { lo, hi, n } : null
  }
  return out
}

// ---- describing a filter state in words ----------------------------------------------------------------------
export function describeState(s) {
  const parts = []
  if (s.text) parts.push(`text "${s.text}"`)
  for (const f of FACETS) if (s.cat[f.key]?.length) parts.push(`${f.label.toLowerCase()} = ${s.cat[f.key].map((v) => label(f.key, v)).join(' or ')}`)
  for (const r of RANGES) {
    const v = s.range[r.key]; if (!v) continue
    const [lo, hi] = v
    parts.push(lo != null && hi != null ? `${r.label.toLowerCase()} ${fmt(lo, 2)} to ${fmt(hi, 2)} ${r.unit}` : lo != null ? `${r.label.toLowerCase()} ≥ ${fmt(lo, 2)} ${r.unit}` : `${r.label.toLowerCase()} ≤ ${fmt(hi, 2)} ${r.unit}`)
  }
  for (const id of s.has) parts.push(`has ${HAS.find((h) => h.id === id).label}`)
  return parts
}

// ---- sentence -> filters -------------------------------------------------------------------------------------
// Vocabulary is built from the data (experiments, PSI ids, materials, forms) plus a small set of generic words
// for outcomes, pillars and units. Aliases are only used where the data itself spells the same thing two ways.
export function buildVocab(rows) {
  const uniq = (k) => [...new Set(rows.map((r) => r[k]).filter((v) => v != null && v !== ''))]
  return { experiments: uniq('experiment'), psi: uniq('psi_id'), materials: uniq('material'), forms: uniq('form'), flowDirs: uniq('flow_direction'), platforms: uniq('platform'), pillars: uniq('pillar') }
}
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const norm = (s) => s.toLowerCase().replace(/[₂]/g, '2').replace(/\s+/g, ' ').trim()
const whole = (hay, needle) => new RegExp(`(^|[^a-z0-9])${esc(needle)}([^a-z0-9]|$)`).test(hay)

const NUM = '(\\d+(?:\\.\\d+)?)'
const UNIT = '(%|percent|kpa|psi|cm\\/s|cm s|mm\\/s)?'
const SUBJ = '(?:o2|oxygen)?'

export function parseQuery(text, vocab) {
  const raw = String(text || '')
  const q = norm(raw)
  const s = emptyState()
  const matched = []
  const add = (key, v) => { (s.cat[key] ||= []); if (!s.cat[key].includes(v)) s.cat[key].push(v) }

  // experiments by name or PSI id
  // longest name wins: "BASS-II" must not also select "BASS", nor "ACME CFI-G" also "CFI"
  const hit = vocab.experiments.filter((e) => whole(q, norm(e)))
  for (const e of hit) if (!hit.some((o) => o !== e && norm(o).includes(norm(e)))) { add('experiment', e); matched.push(e) }
  const psiIds = vocab.psi.filter((id) => whole(q, norm(id)))
  // materials: exact value, or a value that starts with the query word (PMMA -> PMMA, PMMA (clear), ...)
  const words = q.split(/[^a-z0-9()%.\/-]+/).filter((w) => w.length >= 3)
  const matVals = new Set()
  for (const m of vocab.materials) {
    const mn = norm(m)
    if (mn === 'not stated' || mn.startsWith('sphere (')) continue
    const head = mn.replace(/\(.*?\)/g, '').replace(/\d+\s*%/g, '').trim()
    if (head.length >= 3 && whole(q, head)) matVals.add(m)
  }
  // ethylene is recorded as both "C2H4" and "Ethylene"
  if (whole(q, 'ethylene')) for (const m of vocab.materials) if (norm(m) === 'c2h4') matVals.add(m)
  if (matVals.size) { s.cat.material = [...matVals]; matched.push(`material ${[...matVals].slice(0, 3).join(', ')}${matVals.size > 3 ? '...' : ''}`) }
  // forms
  for (const f of vocab.forms) if (f !== 'unspecified' && (whole(q, norm(f)) || whole(q, norm(f) + 's') || whole(q, norm(f) + 'ets'))) { add('form', f); matched.push(`form ${f}`) }
  if (/\bgas burners?\b|\bjet flame/.test(q) && vocab.forms.includes('gas burner') && !(s.cat.form || []).includes('gas burner')) add('form', 'gas burner')
  for (const d of vocab.flowDirs) if (whole(q, norm(d))) { add('flow_direction', d); matched.push(`${d} flow`) }
  for (const p of vocab.platforms) if (p !== 'ISS' ? whole(q, norm(p)) : /\b(iss|space station)\b/.test(q)) { add('platform', p); matched.push(`platform ${p}`) }
  for (const p of vocab.pillars) if (p !== 'context' && whole(q, norm(p))) { add('pillar', p); matched.push(`${p} pillar`) }
  // outcomes
  const oc = []
  if (/(extinguish|extinction|went out|blow ?off|blown out|no flame)/.test(q)) oc.push('no_flame')
  if (/\bno ignition|did not ignite|failed to ignite/.test(q) && !oc.includes('no_flame')) oc.push('no_flame')
  if (/\b(ignited|ignition occurred|sustained flame|burned|burnt|burning)\b/.test(q) && !/\bburned out\b/.test(q) && !/\bno ignition|did not ignite/.test(q)) oc.push('flame')
  if (/\bburned out|burnt out/.test(q)) oc.push('burned_out')
  if (oc.length) { s.cat.outcome_class = oc; matched.push(`outcome ${oc.join(' / ')}`) }
  if (/\b(with|having) (a )?(stated |recorded |known )?outcome/.test(q) || /\bwhere the outcome is (stated|known|recorded)/.test(q)) { s.has.push('outcome'); matched.push('has outcome') }
  if (/\b(both|and) (o2|oxygen) and (total )?pressure\b/.test(q) || /\boxygen and pressure (both )?(recorded|stated|vary|varied)/.test(q)) { s.has.push('o2', 'p'); matched.push('has O2 and pressure') }

  // numeric constraints
  const setRange = (key, lo, hi, desc) => { const cur = s.range[key] || [null, null]; s.range[key] = [lo ?? cur[0], hi ?? cur[1]]; matched.push(desc) }
  const toKey = (unit, subj, ctx) => {
    if (unit === 'psi') return { key: 'pressure_kpa', mul: KPA_PER_PSI, u: 'kPa' }
    if (unit === 'kpa') return { key: 'pressure_kpa', mul: 1, u: 'kPa' }
    if (unit === 'cm/s' || unit === 'cm s') return { key: 'flow_velocity_cm_s', mul: 1, u: 'cm/s' }
    if (unit === 'mm/s') return null
    if (unit === '%' || unit === 'percent') return { key: 'o2_percent', mul: 1, u: '%' }
    if (subj) return { key: 'o2_percent', mul: 1, u: '%' }
    if (ctx === 'pressure') return { key: 'pressure_kpa', mul: 1, u: 'kPa' }
    return null
  }
  const used = []
  const reRel = new RegExp(`(?:(above|over|greater than|more than|at least|higher than|>=|>|exceeding)|(below|under|less than|at most|lower than|<=|<|up to))\\s*${NUM}\\s*${UNIT}\\s*${SUBJ}`, 'g')
  let m
  while ((m = reRel.exec(q))) {
    const unit = m[4] ? m[4].replace('percent', '%') : null
    const after = q.slice(m.index + m[0].length, m.index + m[0].length + 18)
    const subj = /o2|oxygen/.test(m[0]) || /^\s*(o2|oxygen)/.test(after)
    const ctx = /^\s*(total )?pressure/.test(after) ? 'pressure' : null
    const t = toKey(unit, subj, ctx)
    if (!t) continue
    const v = Number(m[3]) * t.mul
    const val = t.mul === 1 ? Number(m[3]) : Math.round(v * 100) / 100
    if (m[1]) setRange(t.key, val, null, `${t.key === 'o2_percent' ? 'O2' : t.key === 'pressure_kpa' ? 'pressure' : 'flow'} ≥ ${fmt(val, 2)} ${t.u}`)
    else setRange(t.key, null, val, `${t.key === 'o2_percent' ? 'O2' : t.key === 'pressure_kpa' ? 'pressure' : 'flow'} ≤ ${fmt(val, 2)} ${t.u}`)
    used.push([m.index, m.index + m[0].length])
  }
  const reBetween = new RegExp(`between\\s*${NUM}\\s*${UNIT}\\s*(?:and|to|-)\\s*${NUM}\\s*${UNIT}\\s*${SUBJ}`, 'g')
  while ((m = reBetween.exec(q))) {
    const unit = (m[4] || m[2] || '').replace('percent', '%') || null
    const after = q.slice(m.index + m[0].length, m.index + m[0].length + 18)
    const subj = /o2|oxygen/.test(m[0]) || /^\s*(o2|oxygen)/.test(after)
    const t = toKey(unit, subj, /^\s*(total )?pressure/.test(after) ? 'pressure' : null)
    if (!t) continue
    const a = Number(m[1]) * t.mul, b = Number(m[3]) * t.mul
    setRange(t.key, Math.min(a, b), Math.max(a, b), `${t.key === 'o2_percent' ? 'O2' : t.key === 'pressure_kpa' ? 'pressure' : 'flow'} ${fmt(Math.min(a, b), 2)} to ${fmt(Math.max(a, b), 2)} ${t.u}`)
    used.push([m.index, m.index + m[0].length])
  }
  // "21% oxygen", "70 kPa", "at 30% O2": equality with a tolerance of half the last digit given
  const reAt = new RegExp(`(?:\\bat\\b|\\bwith\\b|\\bnear\\b|\\baround\\b|\\bof\\b|\\bin\\b)?\\s*${NUM}\\s*(%|percent|kpa|psi|cm\\/s)\\s*${SUBJ}`, 'g')
  while ((m = reAt.exec(q))) {
    if (used.some(([a, b]) => m.index >= a - 1 && m.index < b)) continue
    const unit = m[2].replace('percent', '%')
    const t = toKey(unit, /o2|oxygen/.test(m[0]), null)
    if (!t) continue
    const decimals = (m[1].split('.')[1] || '').length
    const tol = 0.5 * Math.pow(10, -decimals)
    const v = Number(m[1]) * t.mul
    const tolv = t.mul === 1 ? tol : Math.max(tol * t.mul, 0.05)
    setRange(t.key, Math.round((v - tolv) * 1000) / 1000, Math.round((v + tolv) * 1000) / 1000, `${t.key === 'o2_percent' ? 'O2' : t.key === 'pressure_kpa' ? 'pressure' : 'flow'} ≈ ${fmt(v, 2)} ${t.u}`)
  }
  return { state: s, matched, psiIds }
}
// map PSI ids found in a sentence onto experiment names using the rows
export function resolvePsi(parsed, rows) {
  if (!parsed.psiIds.length) return parsed
  const names = new Set(parsed.state.cat.experiment || [])
  const hit = []
  for (const id of parsed.psiIds) { const r = rows.find((x) => x.psi_id === id); if (r) { names.add(r.experiment); hit.push(`${id} = ${r.experiment}`) } }
  const st = { ...parsed.state, cat: { ...parsed.state.cat } }
  if (names.size) st.cat.experiment = [...names]
  return { state: st, matched: [...parsed.matched, ...hit], psiIds: [] }
}

// ---- summarising a result set ---------------------------------------------------------------------------------
export function countBy(rows, key) {
  const m = new Map()
  for (const r of rows) { const k = cellKey(r, key); m.set(k, (m.get(k) || 0) + 1) }
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}
export function numStats(rows, key) {
  const v = rows.map((r) => r[key]).filter((x) => x != null && !Number.isNaN(x)).sort((a, b) => a - b)
  if (!v.length) return { n: 0 }
  return { n: v.length, min: v[0], q1: quantile(v, 0.25), median: median(v), q3: quantile(v, 0.75), max: v[v.length - 1], distinct: new Set(v).size }
}
export function summarize(rows) {
  return {
    n: rows.length,
    experiments: countBy(rows, 'experiment'),
    outcome: countBy(rows, 'outcome_class'),
    material: countBy(rows, 'material'),
    form: countBy(rows, 'form'),
    platform: countBy(rows, 'platform'),
    o2: numStats(rows, 'o2_percent'),
    p: numStats(rows, 'pressure_kpa'),
    flow: numStats(rows, 'flow_velocity_cm_s'),
    thick: numStats(rows, 'fuel_thickness_mm'),
    both: rows.filter((r) => r.o2_percent != null && r.pressure_kpa != null).length,
    stated: rows.filter((r) => r.outcome_class !== 'unknown').length,
  }
}

// Column profile for a result set: completeness and, for numeric columns, five-number summary.
export function profile(rows, keys = COLS.map((c) => c.key)) {
  return keys.map((key) => {
    const c = COL[key] || { key, label: key, kind: 'cat' }
    const vals = rows.map((r) => r[key]).filter((v) => v != null && v !== '')
    const out = { key, label: colTitle(key), kind: c.kind, n: vals.length, fill: rows.length ? vals.length / rows.length : 0, distinct: new Set(vals).size }
    if (c.kind === 'num' && vals.length) Object.assign(out, numStats(rows, key))
    if (c.kind === 'cat') out.top = countBy(rows.filter((r) => r[key] != null && r[key] !== ''), key).slice(0, 4)
    return out
  })
}

// Spearman rank correlation between numeric columns, using pairwise-complete rows. Reports n per pair.
export function corrMatrix(rows, keys = ['o2_percent', 'pressure_kpa', 'ppo2_kpa', 'flow_velocity_cm_s', 'fuel_thickness_mm']) {
  const z = keys.map(() => keys.map(() => ({ r: null, n: 0 })))
  for (let i = 0; i < keys.length; i++) for (let j = 0; j < keys.length; j++) {
    const x = [], y = []
    for (const r of rows) { const a = r[keys[i]], b = r[keys[j]]; if (a != null && b != null) { x.push(a); y.push(b) } }
    const distinctX = new Set(x).size, distinctY = new Set(y).size
    z[i][j] = { n: x.length, r: x.length >= 5 && distinctX > 1 && distinctY > 1 ? spearman(x, y) : null }
  }
  return { keys, z }
}

// ---- export ----------------------------------------------------------------------------------------------------
export function toCsv(rows, keys) {
  const q = (v) => { if (v == null) return ''; const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  return [keys.join(','), ...rows.map((r) => keys.map((k) => q(r[k])).join(','))].join('\n') + '\n'
}
export function download(name, text, type = 'text/csv') {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

// When a filter set returns no rows, say which single condition is responsible: for each condition, the row
// count if that condition alone were dropped. Conditions that restore rows are the ones to relax.
export function explainEmpty(rows, s) {
  const comps = []
  if (s.text) comps.push({ desc: `text "${s.text}"`, drop: (x) => ({ ...x, text: '' }) })
  for (const f of FACETS) if (s.cat[f.key]?.length) comps.push({ desc: `${f.label.toLowerCase()} = ${s.cat[f.key].map((v) => label(f.key, v)).join(' or ')}`, drop: (x) => ({ ...x, cat: { ...x.cat, [f.key]: [] } }) })
  for (const r of RANGES) if (s.range[r.key]) comps.push({ desc: describeState({ ...emptyState(), range: { [r.key]: s.range[r.key] } })[0], col: r, drop: (x) => { const rg = { ...x.range }; delete rg[r.key]; return { ...x, range: rg } } })
  for (const id of s.has) comps.push({ desc: `has ${HAS.find((h) => h.id === id).label}`, drop: (x) => ({ ...x, has: x.has.filter((h) => h !== id) }) })
  return comps.map((c) => {
    const rest = applyFilters(rows, c.drop(s))
    // for a numeric bound: how many of the rows that meet the other conditions never recorded the quantity
    const unrecorded = c.col ? rest.filter((r) => r[c.col.key] == null).length : null
    return { desc: c.desc, rowsWithout: rest.length, unrecorded, quantity: c.col ? c.col.label.toLowerCase() : null }
  }).filter((c) => c.rowsWithout > 0).sort((a, b) => b.rowsWithout - a.rowsWithout)
}
