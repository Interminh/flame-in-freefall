// Case-specific warnings for one set of inputs. Pure functions, no DOM, so they are unit-tested.
// The page shows every item returned here, always, next to the map and as chips on the result.
//
// Levels, most serious first:
//   high    : the model is known to be wrong, or the answer is unresolved
//   notice  : a result the reader should not miss (hidden risk)
//   medium  : the inputs leave the data, or the evidence for this case is thin
//   info    : a weakly supported setting
import { rangeWarningItems, knownMisses, hiddenRisk } from './model.js'

// A 5 to 95% range wider than this fraction of the 0 to 100% scale is called wide.
export const WIDE_RANGE = 0.5
// Above this the answer is called unresolved rather than just wide.
export const VERY_WIDE_RANGE = 0.7

const RANK = { high: 0, notice: 1, medium: 2, info: 3 }
const pct = (p) => `${Math.round(p * 100)}%`
const fin = (x) => Number.isFinite(x)

export const isWide = (s) => s.q95 - s.q05 > WIDE_RANGE

// The limiting-oxygen range here overlaps the 1 g range and the medians are within one point.
export function noClearDifference(locHere, loc1, g) {
  if (g === 1) return false
  if (!fin(locHere.median) || !fin(loc1.median)) return false
  const overlap = Math.max(locHere.q05, loc1.q05) <= Math.min(locHere.q95, loc1.q95)
  return overlap && Math.abs(locHere.median - loc1.median) < 1
}

// True when, on tests held out of the fit, the model is no better than always guessing the commoner outcome.
export function weakFit(perMaterialLoto) {
  return !!perMaterialLoto && perMaterialLoto.accuracy <= perMaterialLoto.baseline_accuracy_majority + 1e-9
}

const rangeText = (s) => {
  const f = (x) => (fin(x) ? x.toFixed(1) : 'above 60')
  return `${f(s.q05)} to ${f(s.q95)}%`
}

// ctx = { inp, ranges, here, earth, locHere, loc1, validation, central, materialLabel }
export function caseWarnings(ctx) {
  const { inp, ranges, here, earth, locHere, loc1, validation, central, materialLabel } = ctx
  const items = []

  for (const text of knownMisses(inp)) items.push({ id: 'known-miss', level: 'high', label: 'Known miss', text })

  for (const w of rangeWarningItems(inp, ranges)) {
    items.push(w.kind === 'gravity'
      ? { id: 'extrapolation', level: 'medium', label: 'Extrapolation', text: w.text }
      : { id: 'outside-data', level: 'medium', label: 'Outside the data', text: w.text })
  }

  const lot = validation?.per_material?.leave_one_test_out?.[inp.material]
  if (weakFit(lot)) {
    items.push({
      id: 'weak-fit', level: 'medium', label: 'Weak fit',
      text: `${materialLabel}: on tests held out of the fit the model was right ${pct(lot.accuracy)} of the time, no better than always guessing the commoner outcome (${pct(lot.baseline_accuracy_majority)}). Treat this result as indicative only.`,
    })
  }

  if (isWide(here)) {
    items.push({
      id: 'wide-range', level: here.q95 - here.q05 > VERY_WIDE_RANGE ? 'high' : 'medium', label: 'Wide range',
      text: `The 5 to 95% range for the chance of burning is ${pct(here.q05)} to ${pct(here.q95)}. Treat the chance as unresolved, not as ${pct(here.mean)}.`,
    })
  }

  if (noClearDifference(locHere, loc1, inp.g)) {
    items.push({
      id: 'no-difference', level: 'medium', label: 'No clear difference from 1 g',
      text: `The limiting oxygen here (${rangeText(locHere)}) overlaps the 1 g range (${rangeText(loc1)}), so the model cannot separate this case from Earth gravity.`,
    })
  }

  if (inp.g !== 1 && hiddenRisk(here.mean, earth.mean, central)) {
    items.push({
      id: 'hidden-risk', level: 'notice', label: 'Hidden risk',
      text: `This burns at ${inp.g} g (${pct(here.mean)}), but the same inputs at 1 g would not (${pct(earth.mean)}).`,
    })
  }

  if (inp.direction === 'concurrent') {
    items.push({
      id: 'direction', level: 'info', label: 'Flow direction',
      text: 'The difference between concurrent and opposed flow is weakly supported. Its sign changed between versions of the fit.',
    })
  }

  return items
    .map((x, i) => ({ x, i }))
    .sort((a, b) => RANK[a.x.level] - RANK[b.x.level] || a.i - b.i)
    .map(({ x }) => x)
}
