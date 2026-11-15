// Run with:  npm run test:sim   (uses the built-in node:test runner, no dependencies)
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { readCsvObjects } from '../../scripts/sim/lib.mjs'
import {
  MATERIALS, makeTheta, buoyantVelocity, blowoffFlow, blowoffSlope, gravitySigma, effectiveFlow, oxygenEquivalent,
  burnProbability, locO2, classify, hiddenRisk, nearestPoints, rangeWarnings, quantile,
  summarizeLOC, summarizeProbability, thetaFromPacked, thicknessTerm, knownMisses, PARAMS,
} from '../../src/sim/model.js'
import { fm2Predictions, fm2ToCsv } from '../../src/sim/fm2.js'

// A fixed, hand-set parameter object so these tests do not depend on the fitted file.
const th = makeTheta({ gamma: 0.2, sq: 2, lnUq0: { pmma_slab: Math.log(8) } })
const base = { o2: 21, p: 101.325, uForced: 10, direction: 'opposed', g: 0, material: 'pmma_slab' }

test('buoyant velocity is zero at zero gravity', () => {
  assert.equal(buoyantVelocity(0, th), 0)
  assert.equal(buoyantVelocity(-1, th), 0)
})

test('buoyant velocity scales as sqrt(g) and equals ub1g at 1 g', () => {
  const u1 = buoyantVelocity(1, th)
  assert.equal(u1, th.ub1g)
  assert.ok(Math.abs(buoyantVelocity(4, th) - 2 * u1) < 1e-9)
  assert.ok(Math.abs(buoyantVelocity(0.25, th) - 0.5 * u1) < 1e-9)
})

test('U_eff equals the forced flow when g = 0', () => {
  assert.equal(effectiveFlow(12, buoyantVelocity(0, th), 0.3), 12)
})

test('U_eff equals the buoyant flow when forced flow = 0', () => {
  const ub = buoyantVelocity(0.38, th)
  assert.ok(Math.abs(effectiveFlow(0, ub, 0.3) - ub) < 1e-12)
})

test('U_eff is a power mean: n = 2 root-sum-square, n = 1 plain sum, n = 4 fourth-power rule', () => {
  assert.ok(Math.abs(effectiveFlow(3, 4, 0.3, 2) - 5) < 1e-12)
  assert.ok(Math.abs(effectiveFlow(3, 4, 0.3, 1) - 7) < 1e-12)
  assert.ok(Math.abs(effectiveFlow(3, 4, 0.3, 4) - (81 + 256) ** 0.25) < 1e-12)
  // A larger exponent gives a smaller combined flow, between the larger input and the plain sum.
  const u1 = effectiveFlow(3, 4, 0.3, 1), u2 = effectiveFlow(3, 4, 0.3, 2), u4 = effectiveFlow(3, 4, 0.3, 4)
  assert.ok(u1 > u2 && u2 > u4 && u4 > 4)
  assert.equal(effectiveFlow(0, 0, 0.3, 4), 0.3)
})

test('the combination rule never exceeds the plain sum and matches NTRS 20200000557 Eq. 6 at n = 4', () => {
  // Eq. 6 with P = P0: U_m = U_f * [1 + (g l / U_f^2)^2]^(1/4) = (U_f^4 + (g l)^2)^(1/4), where U_b^2 = g l.
  const uf = 7, ub = 11
  const eq6 = uf * (1 + (ub ** 2 / uf ** 2) ** 2) ** 0.25
  assert.ok(Math.abs(effectiveFlow(uf, ub, 0.3, 4) - eq6) < 1e-9)
})

test('gravity widening is zero at g = 0 and grows with g', () => {
  assert.equal(gravitySigma(0, th), 0)
  assert.ok(gravitySigma(0.165, th) > 0)
  assert.ok(gravitySigma(1, th) > gravitySigma(0.165, th))
  assert.ok(gravitySigma(100, th) <= th.gravSigmaMax)
})

test('pressure acts through oxygen partial pressure', () => {
  assert.ok(Math.abs(oxygenEquivalent(21, 101.325) - 21) < 1e-12)
  assert.ok(Math.abs(oxygenEquivalent(30, 70.3) - 30 * 70.3 / 101.325) < 1e-12)
  // Same partial pressure gives the same probability.
  const a = burnProbability({ ...base, o2: 21, p: 101.325 }, th)
  const b = burnProbability({ ...base, o2: 42, p: 50.6625 }, th)
  assert.ok(Math.abs(a - b) < 1e-12)
})

test('P(burn) is within [0, 1] and rises with oxygen', () => {
  let prev = -1
  for (let o2 = 8; o2 <= 40; o2 += 1) {
    const p = burnProbability({ ...base, o2 }, th)
    assert.ok(p >= 0 && p <= 1)
    assert.ok(p >= prev - 1e-12, `not monotone at ${o2}%`)
    prev = p
  }
})

test('P(burn) is U-shaped in flow: starves at low flow, blows off at high flow', () => {
  const at = (u) => burnProbability({ ...base, uForced: u, o2: 19 }, th)
  const mid = at(20)
  assert.ok(at(0.5) < mid, 'low flow should burn less than mid flow')
  assert.ok(at(400) < mid, 'very high flow should burn less than mid flow')
})

test('LOC is U-shaped in flow and the bisection agrees with P = 0.5', () => {
  const loc = (u) => locO2({ ...base, uForced: u }, th)
  const mid = loc(25)
  assert.ok(loc(1) > mid)
  assert.ok(loc(300) > mid)
  const l = locO2({ ...base, uForced: 25 }, th)
  assert.ok(Math.abs(burnProbability({ ...base, uForced: 25, o2: l }, th) - 0.5) < 1e-6)
})

test('LOC is infinite when nothing burns up to the scan limit', () => {
  assert.equal(locO2({ ...base, uForced: 0, g: 0 }, makeTheta({ lnUq0: { pmma_slab: 20 } })), Infinity)
})

test('adding gravity to a quiescent case adds effective flow and can lift P(burn)', () => {
  const quiet = burnProbability({ ...base, uForced: 0, g: 0, o2: 21 }, th)
  const moon = burnProbability({ ...base, uForced: 0, g: 0.165, o2: 21 }, th)
  assert.ok(moon > quiet)
})

test('classification thresholds and hidden-risk flag', () => {
  assert.equal(classify(0.9, th), 'burns')
  assert.equal(classify(0.5, th), 'marginal')
  assert.equal(classify(0.1, th), 'extinguishes')
  assert.equal(hiddenRisk(0.9, 0.2, th), true)
  assert.equal(hiddenRisk(0.9, 0.9, th), false)
  assert.equal(hiddenRisk(0.2, 0.2, th), false)
})

test('quantile interpolates', () => {
  assert.equal(quantile([1, 2, 3, 4, 5], 0.5), 3)
  assert.equal(quantile([0, 10], 0.25), 2.5)
})

test('nearest points are sorted, unique per test, and prefer the same material', () => {
  const pts = [
    { testId: 'A', material: 'sibal', o2: 21, flow: 10, direction: 'opposed' },
    { testId: 'B', material: 'pmma_slab', o2: 21, flow: 10, direction: 'opposed' },
    { testId: 'B', material: 'pmma_slab', o2: 15, flow: 1, direction: 'opposed' },
    { testId: 'C', material: 'pmma_slab', o2: 18, flow: 8, direction: 'opposed' },
  ]
  const out = nearestPoints(base, pts, 5)
  assert.equal(out[0].pt.testId, 'B')
  assert.equal(new Set(out.map((o) => o.pt.testId)).size, out.length)
  for (let i = 1; i < out.length; i++) assert.ok(out[i].d >= out[i - 1].d)
})

test('range warnings fire outside the data and for any gravity above zero', () => {
  const ranges = { o2: [13.6, 22.2], flow: [0.5, 47], pressure: [98.3, 102.2] }
  assert.equal(rangeWarnings(base, ranges).length, 0)
  assert.equal(rangeWarnings({ ...base, o2: 30 }, ranges).length, 1)
  assert.equal(rangeWarnings({ ...base, uForced: 80 }, ranges).length, 1)
  assert.equal(rangeWarnings({ ...base, p: 70 }, ranges).length, 1)
  assert.equal(rangeWarnings({ ...base, g: 0.165 }, ranges).length, 1)
})

test('curated flow points quote the raw BASS-II table exactly', () => {
  const norm = (s) => (s || '').split(/\s+/).filter(Boolean).join(' ')
  const raw = new Map(readCsvObjects('data/psi_25.csv').map((r) => [r.test_id, r]))
  const pts = readCsvObjects('data/derived/bass2_flow_points.csv')
  assert.ok(pts.length >= 50)
  for (const p of pts) {
    const src = raw.get(p.test_id)
    assert.ok(src, `unknown test ${p.test_id}`)
    const [kind, ...rest] = p.evidence.split(':')
    const quote = norm(rest.join(':'))
    const hay = norm(kind === 'obs' ? src.observations : src.src_air_display)
    assert.ok(hay.includes(quote), `${p.point_id}: "${quote}" not found in ${kind} of ${p.test_id}`)
    assert.equal(Number(src.o2_percent), Number(p.o2_percent), `${p.point_id}: O2 differs`)
    assert.equal(src.flow_direction, p.flow_direction, `${p.point_id}: direction differs`)
    assert.ok(MATERIALS.some((m) => m.id === p.material_class))
  }
})

test('every point has an event and a use flag, and every excluded point says why', () => {
  const pts = readCsvObjects('data/derived/bass2_flow_points.csv')
  const events = new Set(['burning_sustained', 'burning_at_ignition', 'quench_ramp_down', 'extinct_not_flow_limited', 'blowoff'])
  for (const p of pts) {
    assert.ok(events.has(p.event), `${p.point_id}: unknown event ${p.event}`)
    assert.ok(['yes', 'no'].includes(p.use_in_fit), `${p.point_id}: use_in_fit must be yes or no`)
    if (p.use_in_fit === 'no') assert.ok(p.reading_note.length > 10, `${p.point_id}: excluded without a reason`)
    // Only a flame that went out while flow was being reduced is a starvation limit.
    if (p.event === 'extinct_not_flow_limited' || p.event === 'burning_at_ignition') assert.equal(p.use_in_fit, 'no')
  }
  assert.ok(pts.filter((p) => p.use_in_fit === 'yes').length >= 50)
})

test('thickness values match the raw table or the raw sample description', () => {
  const norm = (s) => (s || '').split(/\s+/).filter(Boolean).join(' ')
  const raw = new Map(readCsvObjects('data/psi_25.csv').map((r) => [r.test_id, r]))
  for (const p of readCsvObjects('data/derived/bass2_flow_points.csv')) {
    const film = p.material_class === 'pmma_film' || p.material_class === 'pmma_slab'
    assert.equal(p.thickness_mm !== '', film, `${p.point_id}: thickness present only for film and slab`)
    if (p.thickness_source === 'table') assert.equal(raw.get(p.test_id).fuel_thickness_mm, p.thickness_mm)
    if (p.thickness_source === 'sample_text')
      assert.ok(norm(raw.get(p.test_id).src_fuel_sample_material).includes(`${p.thickness_mm} mm`), `${p.point_id}: not in sample text`)
    if (film) assert.ok(['table', 'sample_text'].includes(p.thickness_source))
  }
})

test('thickness term acts on PMMA film and slab only, and only when beta is not zero', () => {
  const t0 = makeTheta({ beta: 0 })
  const t1 = makeTheta({ beta: 0.5 })
  const slab = { ...base, material: 'pmma_slab' }
  assert.equal(thicknessTerm({ ...slab, thickness: 5 }, t0), 0)
  assert.ok(thicknessTerm({ ...slab, thickness: 5 }, t1) > thicknessTerm({ ...slab, thickness: 1 }, t1))
  assert.equal(thicknessTerm({ ...base, material: 'pmma_rod', thickness: 5 }, t1), 0)
  assert.equal(thicknessTerm({ ...base, material: 'sibal', thickness: 5 }, t1), 0)
  // With beta > 0 a thicker slab needs more flow to stay lit, so at low flow it burns less.
  const low = { ...slab, uForced: 4, o2: 21 }
  assert.ok(burnProbability({ ...low, thickness: 5 }, t1) < burnProbability({ ...low, thickness: 1 }, t1))
  // With beta = 0 thickness changes nothing.
  assert.equal(burnProbability({ ...low, thickness: 5 }, t0), burnProbability({ ...low, thickness: 1 }, t0))
})

test('nearest points use thickness when both sides have it', () => {
  const pts = [
    { testId: 'A', material: 'pmma_slab', o2: 21, flow: 10, direction: 'opposed', thickness: 5 },
    { testId: 'B', material: 'pmma_slab', o2: 21, flow: 10, direction: 'opposed', thickness: 1 },
  ]
  const out = nearestPoints({ ...base, thickness: 1 }, pts, 2)
  assert.equal(out[0].pt.testId, 'B')
  // No thickness on the input: falls back to the other terms, so the two tie.
  const tie = nearestPoints({ ...base }, pts, 2)
  assert.equal(tie[0].d, tie[1].d)
})

test('thickness range warning fires outside the fitted range only', () => {
  const ranges = { o2: [13.6, 22.2], flow: [0.5, 47], pressure: [98.3, 102.2], thickness: { pmma_slab: [1, 5] } }
  const slab = { ...base, material: 'pmma_slab' }
  assert.equal(rangeWarnings({ ...slab, thickness: 3 }, ranges).length, 0)
  assert.equal(rangeWarnings({ ...slab, thickness: 8 }, ranges).length, 1)
  assert.equal(rangeWarnings({ ...base, material: 'pmma_rod', thickness: 8 }, ranges).length, 0)
})

test('validation file reports fit quality per material and why points were excluded', { skip: !existsSync('data/derived/sim-validation.json') }, () => {
  const v = JSON.parse(readFileSync('data/derived/sim-validation.json', 'utf8'))
  for (const m of MATERIALS) {
    const q = v.per_material.in_sample[m.id]
    assert.ok(q.n > 0 && q.wrong_side >= 0 && q.wrong_side <= q.n)
    assert.ok(v.per_material.leave_one_test_out[m.id].n === q.n)
  }
  assert.equal(v.points_used + v.excluded_points.length, v.points_total)
  for (const e of v.excluded_points) assert.ok(e.reason.length > 10)
  assert.equal(typeof v.thickness_term_used, 'boolean')
  assert.ok(v.variants.with_thickness && v.variants.without_thickness)
})

test('fitted parameter file loads, and the ensemble gives ordered bands', { skip: !existsSync('data/derived/sim-params.json') }, () => {
  const params = JSON.parse(readFileSync('data/derived/sim-params.json', 'utf8'))
  assert.equal(params.draws.length, params.draws_count)
  const draws = params.draws.map(thetaFromPacked)
  const s = summarizeProbability({ ...base, o2: 19, g: 0.165 }, draws)
  assert.ok(s.q05 <= s.mean && s.mean <= s.q95)
  const l = summarizeLOC({ ...base, g: 0.165 }, draws)
  assert.ok(l.q05 <= l.median && l.median <= l.q95)
})

test('FM2 table: 5 to 10 lunar predictions, valid fields, CSV round-trips', { skip: !existsSync('data/derived/sim-params.json') }, () => {
  const params = JSON.parse(readFileSync('data/derived/sim-params.json', 'utf8'))
  const rows = fm2Predictions(params.draws.map(thetaFromPacked))
  assert.ok(rows.length >= 5 && rows.length <= 10)
  for (const r of rows) {
    assert.equal(r.gravity_g, 0.165)
    assert.ok(r.p_burn_q05 <= r.p_burn && r.p_burn <= r.p_burn_q95)
    assert.ok(['burns', 'marginal', 'extinguishes'].includes(r.predicted_outcome))
  }
  const csv = fm2ToCsv(rows).trim().split('\n')
  assert.equal(csv.length, rows.length + 1)
  if (existsSync('data/derived/fm2-predictions.csv'))
    assert.equal(readFileSync('data/derived/fm2-predictions.csv', 'utf8'), fm2ToCsv(rows), 'CSV on disk is stale; rerun scripts/sim/fm2.mjs')
})

test('blow-off line passes through the 1 g anchor and the zero-flow intercept', () => {
  const t = makeTheta()
  assert.ok(Math.abs(blowoffFlow(t.o2Blowoff1g, t) - t.ub1g) < 1e-9, 'blow-off flow at 16% O2 equals the 1 g buoyant flow')
  assert.equal(blowoffFlow(t.o2Int, t), 0)
  assert.equal(blowoffFlow(t.o2Int - 2, t), 0)
  // Linear: doubling the oxygen above the intercept doubles the blow-off flow.
  assert.ok(Math.abs(blowoffFlow(t.o2Int + 4, t) - 2 * blowoffFlow(t.o2Int + 2, t)) < 1e-9)
  assert.ok(blowoffSlope(t) > 0)
})

test('with no forced flow the 1 g limit sits at the anchor (16% O2) when the quench side is not limiting', () => {
  const t = makeTheta({ gamma: 0.05, lnUq0: { pmma_rod: 0 } })
  const loc = locO2({ o2: 0, p: 101.325, uForced: 0, direction: 'concurrent', g: 1, material: 'pmma_rod' }, t)
  assert.ok(Math.abs(loc - t.o2Blowoff1g) < 0.3, `LOC at 1 g was ${loc}`)
})

test('no burning at or below the blow-off intercept at any flow', () => {
  const t = makeTheta({ gamma: 0.05, lnUq0: { pmma_rod: 0 } })
  for (const u of [0.5, 2, 10, 40]) {
    const p = burnProbability({ o2: t.o2Int, p: 101.325, uForced: u, direction: 'concurrent', g: 0, material: 'pmma_rod' }, t)
    assert.ok(p < 1e-3, `P at the intercept was ${p} for ${u} cm/s`)
  }
})

test('anchors file: every row has a verified quote, a page and a known use', () => {
  const rows = readCsvObjects('data/derived/nasa_1g_anchors.csv')
  assert.ok(rows.length >= 12)
  const ids = new Set(rows.map((r) => r.anchor_id))
  assert.equal(ids.size, rows.length, 'anchor ids must be unique')
  for (const r of rows) {
    assert.equal(r.quote_verified, 'yes', `${r.anchor_id}: quote was not found in its PDF when the file was built`)
    assert.ok(Number(r.pdf_page) >= 1, `${r.anchor_id}: missing page`)
    assert.ok(/^\d{8,}$/.test(r.ntrs_id) && r.ntrs_url.endsWith(r.ntrs_id))
    assert.ok(['calibration', 'check', 'context'].includes(r.use))
    assert.ok(r.quote.length > 15)
  }
})

test('the anchored constants in PARAMS match the numbers quoted in the anchors file', () => {
  const by = Object.fromEntries(readCsvObjects('data/derived/nasa_1g_anchors.csv').map((r) => [r.anchor_id, r]))
  assert.ok(by.A1.value.includes(String(PARAMS.ub1g.value)), 'ub1g centre should be the ~20 cm/s of A1')
  assert.ok(PARAMS.ub1g.range[0] <= 17 && PARAMS.ub1g.range[1] >= 20, 'ub1g range must cover A1 (20) and A2 (17)')
  assert.ok(by.A3.value.includes(String(PARAMS.o2Blowoff1g.value)), 'A3 gives the 1 g blow-off oxygen')
  assert.ok(by.A6.value.includes(String(PARAMS.o2Int.value)), 'A6 gives the centre of the intercept')
  assert.ok(PARAMS.o2Int.range[0] <= 13.3 && PARAMS.o2Int.range[1] >= 13.6, 'intercept range must cover A5')
  assert.deepEqual(PARAMS.mixExponent.range, [1, 4])
  assert.equal(PARAMS.mixExponent.value, 4)
})

test('NASA checks are recorded with a pass flag, and the three notes are held out', { skip: !existsSync('data/derived/sim-validation.json') }, () => {
  const v = JSON.parse(readFileSync('data/derived/sim-validation.json', 'utf8'))
  const c = v.nasa_checks
  for (const k of ['rod_nose', 'margin', 'moon_mars_buoyant_flow', 'film_quench_21', 'film_blowoff', 'sibal_opposed_1g_in_air']) assert.equal(typeof c[k].pass, 'boolean', k)
  assert.equal(c.bass2_notes_on_blowoff_side.length, 3)
  for (const n of c.bass2_notes_on_blowoff_side) assert.ok(n.share_of_draws_correct >= 0 && n.share_of_draws_correct <= 1)
})

test('known-miss warning appears for opposed SIBAL at high gravity in air, and nowhere else', () => {
  const sib = { ...base, material: 'sibal', direction: 'opposed', o2: 21, p: 101.325 }
  assert.equal(knownMisses({ ...sib, g: 1 }).length, 1)
  assert.equal(knownMisses({ ...sib, g: 0.5 }).length, 1)
  assert.equal(knownMisses({ ...sib, g: 0 }).length, 0)
  assert.equal(knownMisses({ ...sib, g: 0.165 }).length, 0)
  assert.equal(knownMisses({ ...sib, g: 1, direction: 'concurrent' }).length, 0)
  assert.equal(knownMisses({ ...sib, g: 1, material: 'pmma_rod' }).length, 0)
  assert.equal(knownMisses({ ...sib, g: 1, o2: 30 }).length, 0)
})

test('the SIBAL check is recorded and the model is honest about missing it', { skip: !existsSync('data/derived/sim-validation.json') }, () => {
  const c = JSON.parse(readFileSync('data/derived/sim-validation.json', 'utf8')).nasa_checks.sibal_opposed_1g_in_air
  assert.equal(c.pass, c.model_central_p_burn < 0.5, 'pass flag must follow the pre-declared rule')
})
