import test from 'node:test'
import assert from 'node:assert/strict'
import { makeTheta, rangeWarningItems, rangeWarnings } from '../../src/sim/model.js'
import { caseWarnings, isWide, noClearDifference, weakFit, WIDE_RANGE } from '../../src/sim/warnings.js'

const central = makeTheta()
const ranges = { o2: [13.6, 22.2], flow: [0.5, 47], pressure: [98.3, 102.2], thickness: { pmma_slab: [1, 5] } }
const inp = { material: 'pmma_rod', o2: 19, p: 101.3, uForced: 10, direction: 'opposed', g: 0, thickness: null }
const sure = { mean: 0.9, q05: 0.8, q95: 0.97 }
const loc = (median, q05, q95) => ({ median, q05, q95 })
const validation = {
  per_material: {
    leave_one_test_out: {
      pmma_rod: { accuracy: 0.875, baseline_accuracy_majority: 0.75 },
      pmma_slab: { accuracy: 0.563, baseline_accuracy_majority: 0.563 },
    },
  },
}
const base = (over = {}) => ({
  inp, ranges, here: sure, earth: sure, locHere: loc(15, 14, 16), loc1: loc(20, 19, 21), validation, central, materialLabel: 'PMMA, rod', ...over,
})
const ids = (items) => items.map((x) => x.id)

test('a clean microgravity case inside the data has no warnings', () => {
  assert.deepEqual(caseWarnings(base()), [])
})

test('range warning items carry a kind and match the plain-text list', () => {
  const far = { ...inp, o2: 30, uForced: 80, p: 70, g: 0.165 }
  const items = rangeWarningItems(far, ranges)
  assert.deepEqual(items.map((x) => x.kind).sort(), ['flow', 'gravity', 'o2', 'pressure'])
  assert.deepEqual(rangeWarnings(far, ranges), items.map((x) => x.text))
})

test('thickness outside the fitted range is flagged, inside is not', () => {
  const slab = { ...inp, material: 'pmma_slab' }
  assert.deepEqual(rangeWarningItems({ ...slab, thickness: 3 }, ranges), [])
  assert.deepEqual(rangeWarningItems({ ...slab, thickness: 8 }, ranges).map((x) => x.kind), ['thickness'])
})

test('gravity above zero always produces an extrapolation warning', () => {
  for (const g of [0.05, 0.165, 0.38, 1]) assert.ok(ids(caseWarnings(base({ inp: { ...inp, g } }))).includes('extrapolation'))
  assert.ok(!ids(caseWarnings(base())).includes('extrapolation'))
})

test('the known miss shows for opposed SIBAL at high gravity in air, and comes first', () => {
  const sib = { ...inp, material: 'sibal', direction: 'opposed', o2: 21, g: 1 }
  const items = caseWarnings(base({ inp: sib, materialLabel: 'SIBAL' }))
  assert.equal(items[0].id, 'known-miss')
  assert.equal(items[0].level, 'high')
  assert.ok(!ids(caseWarnings(base({ inp: { ...sib, g: 0 } }))).includes('known-miss'))
})

test('wide range: flagged above the threshold, called high when very wide, quiet when narrow', () => {
  assert.equal(WIDE_RANGE, 0.5)
  assert.ok(!isWide({ q05: 0.4, q95: 0.9 }))
  assert.ok(isWide({ q05: 0.04, q95: 0.89 }))
  const items = caseWarnings(base({ here: { mean: 0.64, q05: 0.04, q95: 0.89 } }))
  const w = items.find((x) => x.id === 'wide-range')
  assert.equal(w.level, 'high')
  assert.match(w.text, /4% to 89%/)
  assert.match(w.text, /not as 64%/)
  const mid = caseWarnings(base({ here: { mean: 0.5, q05: 0.2, q95: 0.75 } })).find((x) => x.id === 'wide-range')
  assert.equal(mid.level, 'medium')
  assert.ok(!ids(caseWarnings(base({ here: { mean: 0.6, q05: 0.4, q95: 0.8 } }))).includes('wide-range'))
})

test('no clear difference from 1 g: overlapping ranges and close medians only', () => {
  assert.ok(noClearDifference(loc(17.2, 15.7, 20.7), loc(17.3, 16.1, 20.3), 0.165))
  assert.ok(!noClearDifference(loc(15, 14, 16), loc(20, 19, 21), 0.165), 'separated ranges')
  assert.ok(!noClearDifference(loc(15, 14, 20), loc(18, 16, 21), 0.165), 'overlap but medians 3 apart')
  assert.ok(!noClearDifference(loc(17.2, 15.7, 20.7), loc(17.3, 16.1, 20.3), 1), 'the 1 g case is the baseline')
  assert.ok(!noClearDifference(loc(Infinity, 30, Infinity), loc(17.3, 16.1, 20.3), 0.165), 'undefined limit')
})

test('weak fit is flagged only when held-out accuracy does not beat guessing', () => {
  assert.ok(weakFit({ accuracy: 0.563, baseline_accuracy_majority: 0.563 }))
  assert.ok(weakFit({ accuracy: 0.5, baseline_accuracy_majority: 0.7 }))
  assert.ok(!weakFit({ accuracy: 0.875, baseline_accuracy_majority: 0.75 }))
  assert.ok(!weakFit(undefined))
  const slab = caseWarnings(base({ inp: { ...inp, material: 'pmma_slab' }, materialLabel: 'PMMA, thick slab' }))
  assert.ok(ids(slab).includes('weak-fit'))
  assert.ok(!ids(caseWarnings(base())).includes('weak-fit'))
})

test('hidden risk and direction notes appear when they apply', () => {
  const burns = { mean: 0.87, q05: 0.7, q95: 0.97 }
  const wouldNot = { mean: 0.45, q05: 0.3, q95: 0.6 }
  const hr = caseWarnings(base({ inp: { ...inp, g: 0.165 }, here: burns, earth: wouldNot }))
  assert.ok(ids(hr).includes('hidden-risk'))
  assert.ok(!ids(caseWarnings(base({ inp: { ...inp, g: 1 }, here: burns, earth: wouldNot }))).includes('hidden-risk'))
  assert.ok(ids(caseWarnings(base({ inp: { ...inp, direction: 'concurrent' } }))).includes('direction'))
})

test('warnings are ordered by seriousness and keep a stable order inside a level', () => {
  const sib = { ...inp, material: 'sibal', direction: 'opposed', o2: 30, g: 1, uForced: 80 }
  const items = caseWarnings(base({ inp: sib, here: { mean: 0.6, q05: 0.05, q95: 0.95 }, materialLabel: 'SIBAL' }))
  const rank = { high: 0, notice: 1, medium: 2, info: 3 }
  for (let i = 1; i < items.length; i++) assert.ok(rank[items[i].level] >= rank[items[i - 1].level])
  assert.ok(items.every((x) => x.id && x.label && x.text.length > 10))
})
