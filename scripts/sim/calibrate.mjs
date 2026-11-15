// Fits the flammability model to the BASS-II flow points and writes
//   data/derived/sim-params.json      fitted values, bootstrap draws, data ranges, points (read by the page)
//   data/derived/sim-validation.json  validation numbers (quoted in the README and shown on the page)
// Run from the repo root:  node scripts/sim/calibrate.mjs
// Raw data is only read, never changed.
//
// Only points with use_in_fit = yes enter the fit. The others stay in the file with the reason they were left out.
// The buoyant flow, the combination rule and the blow-off line come from NASA-hosted sources
// (data/derived/nasa_1g_anchors.csv). They are sampled over the ranges those sources support, not fitted.
import { writeFileSync } from 'node:fs'
import { readCsvObjects, rng, nelderMead } from './lib.mjs'
import {
  MATERIALS, PARAMS, P_REF_KPA, THICKNESS_MATERIALS, O2_REF, makeTheta, burnProbability, summarizeLOC, summarizeProbability, locO2, quantile,
  buoyantVelocity, gravitySigma, blowoffFlow, blowoffSlope,
} from '../../src/sim/model.js'

const SEED = 2026
const DRAWS = 200
const NM = MATERIALS.length
const IBETA = 4 + NM // index of the thickness term in the parameter vector

// ---------- data ----------
const all = readCsvObjects('data/derived/bass2_flow_points.csv').map((r) => ({
  id: r.point_id,
  testId: r.test_id,
  psiId: r.psi_id,
  material: r.material_class,
  materialText: r.material_text,
  thickness: r.thickness_mm === '' ? null : Number(r.thickness_mm),
  thicknessSource: r.thickness_source,
  o2: Number(r.o2_percent),
  direction: r.flow_direction,
  flow: Number(r.flow_cm_s),
  basis: r.flow_basis,
  label: r.label,
  censored: r.censored,
  event: r.event,
  useInFit: r.use_in_fit === 'yes',
  readingNote: r.reading_note,
  y: r.label === 'burn' ? 1 : 0,
  evidence: r.evidence,
}))
const points = all.filter((p) => p.useInFit)
const excluded = all.filter((p) => !p.useInFit)

// BASS-II recorded no pressure. Training points use one standard atmosphere (assumption).
const inputOf = (pt) => ({ o2: pt.o2, p: P_REF_KPA, uForced: pt.flow, direction: pt.direction, g: 0, material: pt.material, thickness: pt.thickness })

// ---------- fitting ----------
// Parameter vector: [ln gamma, ln sq, mu, d(material) x NM, dirShift, beta]. ln U_q0(material) = mu + d.
// The penalties are regularisation chosen by the authors (assumed): they keep a material with few points
// near the shared mean and keep the direction and thickness terms near zero unless the data insists.
const unpack = (v, right) =>
  makeTheta({
    ...right,
    gamma: Math.exp(v[0]),
    sq: Math.exp(v[1]),
    dirShift: v[3 + NM],
    beta: v[IBETA],
    lnUq0: Object.fromEntries(MATERIALS.map((m, i) => [m.id, v[2] + v[3 + i]])),
  })

function penalty(v) {
  const d = v.slice(3, 3 + NM)
  return 0.5 * (
    (v[0] - Math.log(0.3)) ** 2 +
    (v[1] - Math.log(2.5)) ** 2 +
    ((v[2] - Math.log(5)) / 2) ** 2 +
    d.reduce((s, x) => s + (x / 1.5) ** 2, 0) +
    v[3 + NM] ** 2 +
    (v[IBETA] / 1.5) ** 2
  )
}

const clip = (p) => Math.min(1 - 1e-4, Math.max(1e-4, p))
const START = [Math.log(0.3), Math.log(2.5), Math.log(5), 0, 0, 0, 0, 0, 0]

// useBeta = false pins the thickness term at zero (the model without thickness).
function fit(train, right, start, useBeta = true) {
  const f = (v0) => {
    const v = useBeta ? v0 : [...v0.slice(0, IBETA), 0]
    const th = unpack(v, right)
    let nll = 0
    for (const pt of train) {
      const p = clip(burnProbability(inputOf(pt), th))
      nll -= pt.y ? Math.log(p) : Math.log(1 - p)
    }
    return nll + penalty(v)
  }
  const { x } = nelderMead(f, start ?? START)
  return useBeta ? x : [...x.slice(0, IBETA), 0]
}

// ---------- metrics ----------
const round = (x, d = 3) => Math.round(x * 10 ** d) / 10 ** d
const prevalence = (a) => a.reduce((s, p) => s + p.y, 0) / a.length

function metrics(preds, subset) {
  // preds: Map id -> { p, prev }
  let hit = 0, brier = 0, base = 0, maj = 0, n = 0
  for (const pt of subset) {
    const e = preds.get(pt.id)
    if (!e) continue
    n++
    hit += (e.p >= 0.5) === (pt.y === 1) ? 1 : 0
    brier += (e.p - pt.y) ** 2
    base += (e.prev - pt.y) ** 2
    maj += (e.prev >= 0.5 ? 1 : 0) === pt.y ? 1 : 0
  }
  return {
    n,
    wrong_side: n - hit,
    accuracy: round(hit / n),
    brier: round(brier / n),
    baseline_brier_prevalence: round(base / n),
    baseline_accuracy_majority: round(maj / n),
  }
}

// ---------- the anchored side of the model ----------
// Centre values of the NASA-anchored constants. The sampling ranges are in PARAMS.
const right0 = {
  ub1g: PARAMS.ub1g.value,
  o2Int: PARAMS.o2Int.value,
  sb: PARAMS.sb.value,
  mixExponent: PARAMS.mixExponent.value,
}
const R = rng(SEED)
const priorRight = () => ({
  ub1g: R.uniform(...PARAMS.ub1g.range),
  o2Int: R.uniform(...PARAMS.o2Int.range),
  sb: R.uniform(...PARAMS.sb.range),
  mixExponent: R.uniform(...PARAMS.mixExponent.range),
})

// The three BASS-II notes about the blow-off side are no longer used to build the model. They are checks now.
const notePts = [
  { id: 'b04', want: 1, what: 'T15: no blow-off at 29 cm/s' },
  { id: 'r16', want: 1, what: 'P17: blow-off tried without success at 22 cm/s' },
  { id: 'b08', want: 0, what: 'T21: blow-off at an air display of 47' },
].map((c) => ({ ...c, pt: points.find((p) => p.id === c.id) }))

// ---------- validation, for a model with and without the thickness term ----------
function evaluate(useBeta) {
  const vC = fit(points, right0, undefined, useBeta)
  const th = unpack(vC, right0)
  const inSamplePreds = new Map(points.map((pt) => [pt.id, { p: burnProbability(inputOf(pt), th), prev: prevalence(points) }]))

  const cv = (groupOf, groups) => {
    const preds = new Map()
    for (const g of groups) {
      const train = points.filter((p) => groupOf(p) !== g)
      const test = points.filter((p) => groupOf(p) === g)
      if (!test.length || !train.length) continue
      const tt = unpack(fit(train, right0, vC, useBeta), right0)
      test.forEach((pt) => preds.set(pt.id, { p: burnProbability(inputOf(pt), tt), prev: prevalence(train) }))
    }
    return preds
  }
  const lomoPreds = cv((p) => p.material, MATERIALS.map((m) => m.id))
  const lotoPreds = cv((p) => p.testId, [...new Set(points.map((p) => p.testId))])
  const perMaterial = (preds) => Object.fromEntries(MATERIALS.map((m) => [m.id, metrics(preds, points.filter((p) => p.material === m.id))]))
  return {
    vC, th,
    in_sample: metrics(inSamplePreds, points),
    leave_one_test_out: metrics(lotoPreds, points),
    leave_one_material_out: metrics(lomoPreds, points),
    per_material: {
      in_sample: perMaterial(inSamplePreds),
      leave_one_test_out: perMaterial(lotoPreds),
      leave_one_material_out: perMaterial(lomoPreds),
    },
  }
}
const withoutThickness = evaluate(false)
const withThickness = evaluate(true)

// Pre-declared rule: keep the thickness term only if it lowers the leave-one-test-out Brier score.
// `--thickness=on` or `--thickness=off` overrides the rule. The override is recorded in the validation file.
const forced = process.argv.find((a) => a.startsWith('--thickness='))?.split('=')[1]
const ruleSaysUse = withThickness.leave_one_test_out.brier < withoutThickness.leave_one_test_out.brier
const useBeta = forced === 'on' ? true : forced === 'off' ? false : ruleSaysUse
const chosen = useBeta ? withThickness : withoutThickness
const vCentral = chosen.vC
const thetaCentral = chosen.th

// ---------- bootstrap draws (cluster bootstrap over tests) ----------
const byTest = new Map()
points.forEach((p) => byTest.set(p.testId, [...(byTest.get(p.testId) ?? []), p]))
const testIds = [...byTest.keys()]
const draws = Array.from({ length: DRAWS }, () => {
  const right = priorRight()
  const sample = []
  for (let i = 0; i < testIds.length; i++) sample.push(...byTest.get(testIds[R.int(testIds.length)]))
  const v = fit(sample, right, vCentral, useBeta)
  return { ...unpack(v, right), zG: R.normal() }
})

// ---------- NASA-sourced held-out checks ----------
// Pass rules, fixed before the results were looked at:
//   rod nose      : model minimum LOC across flows for the rod lies within 1.0 point of the NASA range 13.3 to 13.6
//   margin        : model 1 g limit minus the nose lies within 0.5 points of the NASA range 1.4 to 2.4
//   Moon and Mars : model buoyant flow at 0.165 g and 0.38 g lies inside the NASA range 5 to 20 cm/s
//   film quench   : model film quench flow at 21% O2 is below 2 cm/s
//   film blow-off : 40 cm/s lies between the model blow-off flow at 18% and at 21% O2
//   three notes   : the central model gets each BASS-II blow-off note right
//   SIBAL at 1 g  : NASA says downward (opposed) spread over SIBAL is not possible in normal air, so the central model chance of burning is below 0.5
//   SAFFIRE-II    : the whole sample burned in each case in data/derived/saffire2_ground_checks.csv, so the mean chance of burning is at least 0.5.
//                   This rule was written after a first look at the model's numbers, so it is weaker evidence than the others.
const fin = (x) => (Number.isFinite(x) ? round(x, 2) : '>60')
const qs = (arr) => { const s = [...arr].sort((a, b) => a - b); return { median: quantile(s, 0.5), q05: quantile(s, 0.05), q95: quantile(s, 0.95) } }
const FLOW_GRID = Array.from({ length: 70 }, (_, i) => 0.2 * 1.09 ** i) // about 0.2 to 75 cm/s
const rodBase = { o2: 0, p: P_REF_KPA, direction: 'concurrent', g: 0, material: 'pmma_rod', thickness: null }
const noseOf = (th) => Math.min(...FLOW_GRID.map((u) => locO2({ ...rodBase, uForced: u }, th)))
const loc1gOf = (th) => locO2({ ...rodBase, g: 1, uForced: 0 }, th)
const noseDraws = draws.map(noseOf)
const loc1gDraws = draws.map(loc1gOf)
const marginDraws = draws.map((d, i) => loc1gDraws[i] - noseDraws[i])
const nose = { central: noseOf(thetaCentral), ...qs(noseDraws) }
const loc1g = { central: loc1gOf(thetaCentral), ...qs(loc1gDraws) }
const margin = { central: loc1g.central - nose.central, ...qs(marginDraws) }
const ubOf = (g) => ({
  central: buoyantVelocity(g, thetaCentral),
  ...qs(draws.map((d) => buoyantVelocity(g, d) * Math.exp(gravitySigma(g, d) * d.zG))),
})
const moon = ubOf(0.165), mars = ubOf(0.38)
const filmQ = (o2) => Math.exp(thetaCentral.lnUq0.pmma_film + thetaCentral.gamma * (O2_REF - o2))
const filmBo = (o2) => blowoffFlow(o2, thetaCentral)
const consistent = (th, c) => (burnProbability(inputOf(c.pt), th) >= 0.5) === (c.want === 1)
const notes = notePts.map((c) => ({
  note: c.what, point: c.id, observed: c.want === 1 ? 'burn' : 'blow-off',
  p_burn_central: round(burnProbability(inputOf(c.pt), thetaCentral)),
  central_correct: consistent(thetaCentral, c),
  share_of_draws_correct: round(draws.filter((d) => consistent(d, c)).length / draws.length),
}))

const s2g = readCsvObjects('data/derived/saffire2_ground_checks.csv').map((r) => {
  const inp = { o2: Number(r.o2_percent_used), p: P_REF_KPA, uForced: Number(r.forced_flow_cm_s), direction: r.flow_direction, g: Number(r.gravity_g), material: r.material_class, thickness: null }
  const s = summarizeProbability(inp, draws)
  return {
    check: r.check_id, test: r.test_id, material: r.material_class, gravity_g: Number(r.gravity_g), o2_percent: Number(r.o2_percent_used),
    observed: r.observed_outcome, observed_text: r.observed_text,
    model_central_p_burn: round(burnProbability(inp, thetaCentral)), model_mean_p_burn: round(s.mean), q05: round(s.q05), q95: round(s.q95),
    pass: (s.mean >= 0.5) === (r.observed_outcome === 'burn'),
  }
})

const sibal1g = { o2: 21, p: P_REF_KPA, uForced: 0, direction: 'opposed', g: 1, material: 'sibal', thickness: null }
const sibal1gP = burnProbability(sibal1g, thetaCentral)
const sibal1gMean = draws.reduce((a, d) => a + burnProbability(sibal1g, d), 0) / draws.length

const nasaChecks = {
  rod_nose: {
    nasa: '13.3 to 13.6% O2 (anchors H1, A5, A6)', model_central: fin(nose.central), model_median: fin(nose.median), q05: fin(nose.q05), q95: fin(nose.q95),
    pass: nose.central >= 13.3 - 1 && nose.central <= 13.6 + 1,
  },
  rod_limit_1g: { note: 'Fixed by construction from anchor A3, shown for reference', nasa: '16% O2', model_central: fin(loc1g.central), model_median: fin(loc1g.median), q05: fin(loc1g.q05), q95: fin(loc1g.q95) },
  margin: {
    nasa: '1.4 to 2.4 points (anchors H3, H4)', model_central: fin(margin.central), model_median: fin(margin.median), q05: fin(margin.q05), q95: fin(margin.q95),
    pass: margin.central >= 1.4 - 0.5 && margin.central <= 2.4 + 0.5,
  },
  moon_mars_buoyant_flow: {
    nasa: '5 to 20 cm/s (anchor H2)',
    moon_central: fin(moon.central), moon_q05: fin(moon.q05), moon_q95: fin(moon.q95),
    mars_central: fin(mars.central), mars_q05: fin(mars.q05), mars_q95: fin(mars.q95),
    pass: moon.central >= 5 && moon.central <= 20 && mars.central >= 5 && mars.central <= 20,
  },
  film_quench_21: { nasa: 'below 2 cm/s (anchor H5)', model_central: fin(filmQ(21)), pass: filmQ(21) < 2 },
  film_blowoff: {
    nasa: 'about 40 cm/s (anchor H6), oxygen not stated', model_at_18: fin(filmBo(18)), model_at_21: fin(filmBo(21)),
    pass: filmBo(18) <= 40 && 40 <= filmBo(21),
  },
  bass2_notes_on_blowoff_side: notes,
  saffire2_ground: {
    source: 'SAFFIRE-II ground comparisons, PSI-99, concurrent flow at 20 cm/s and about 22% O2',
    rule: 'Mean chance of burning at least 0.5 where the whole sample burned. Written after a first look at the numbers.',
    cases: s2g,
    pass: s2g.every((c) => c.pass),
  },
  sibal_opposed_1g_in_air: {
    nasa: 'no sustained downward spread in normal air (anchor H7)', model_central_p_burn: round(sibal1gP), model_mean_p_burn: round(sibal1gMean),
    pass: sibal1gP < 0.5,
  },
}

// ---------- the earlier brief figures (unverified, informational only) ----------
// Direction reproduced if the central LOC at 1 g exceeds the LOC at both 0.05 g and 0.1 g (no forced flow, opposed).
// Size: the drop lies within half to double the 1.6 to 2.6 points in the brief (0.8 to 5.2).
const lit = []
for (const m of ['pmma_film', 'pmma_slab', 'pmma_rod']) {
  for (const uForced of [0, 10]) {
    const b = { p: P_REF_KPA, uForced, direction: 'opposed', material: m }
    const row = { material: m, forced_flow_cm_s: uForced }
    for (const g of [0, 0.05, 0.1, 1]) {
      const s = summarizeLOC({ ...b, g }, draws)
      row[`loc_g${g}`] = { central: fin(locO2({ ...b, g }, thetaCentral)), median: fin(s.median), q05: fin(s.q05), q95: fin(s.q95) }
    }
    lit.push(row)
  }
}
const num = (x) => (typeof x === 'number' ? x : Infinity)
const litVerdicts = lit.filter((r) => r.forced_flow_cm_s === 0).map((r) => {
  const l1 = r.loc_g1.central, a = r['loc_g0.05'].central, b = r['loc_g0.1'].central
  const dropA = num(l1) - num(a), dropB = num(l1) - num(b)
  return {
    material: r.material,
    loc_1g: l1,
    loc_0_05g: a,
    loc_0_1g: b,
    direction_reproduced: num(l1) > num(a) && num(l1) > num(b),
    drop_points_0_05g: Number.isFinite(dropA) ? round(dropA, 2) : null,
    drop_points_0_1g: Number.isFinite(dropB) ? round(dropB, 2) : null,
    size_within_half_to_double: [dropA, dropB].every((d) => Number.isFinite(d) && d >= 0.8 && d <= 5.2),
  }
})

// ---------- write ----------
const phys = ['ub1g', 'o2Int', 'sb', 'mixExponent', 'gamma', 'sq', 'dirShift', 'beta', 'lnUq0', 'zG']
const pack = (th) => {
  const o = {}
  for (const k of phys) o[k] = k === 'lnUq0' ? MATERIALS.map((m) => round(th.lnUq0[m.id], 5)) : round(th[k], 5)
  return o
}
const pressures = readCsvObjects('data/psi_26.csv').map((r) => Number(r.pressure_kpa)).filter((x) => x > 0)
const o2All = readCsvObjects('data/psi_25.csv').map((r) => Number(r.o2_percent)).filter((x) => x > 0)
const matInfo = MATERIALS.map((m) => {
  const used = points.filter((p) => p.material === m.id)
  const th = used.map((p) => p.thickness).filter((x) => x !== null)
  return {
    id: m.id, label: m.label,
    points_used: used.length,
    points_total: all.filter((p) => p.material === m.id).length,
    tests: new Set(used.map((p) => p.testId)).size,
    thickness_mm: THICKNESS_MATERIALS.includes(m.id) && th.length ? [Math.min(...th), Math.max(...th)] : null,
  }
})

writeFileSync('data/derived/sim-params.json', JSON.stringify({
  note: 'Written by scripts/sim/calibrate.mjs. Do not edit by hand.',
  seed: SEED,
  draws_count: DRAWS,
  thickness_term_used: useBeta,
  blowoff_slope_pts_per_cm_s: round(blowoffSlope(thetaCentral), 4),
  materials: matInfo,
  central: pack(thetaCentral),
  draws: draws.map(pack),
  ranges: {
    o2: [Math.min(...o2All), Math.max(...o2All)],
    flow: [Math.min(...points.map((p) => p.flow)), Math.max(...points.map((p) => p.flow))],
    pressure: [Math.min(...pressures), Math.max(...pressures)],
    thickness: Object.fromEntries(matInfo.filter((m) => m.thickness_mm).map((m) => [m.id, m.thickness_mm])),
  },
  params: Object.fromEntries(Object.entries(PARAMS).map(([k, v]) => [k, { value: v.value, range: v.range ?? null, kind: v.kind, note: v.note }])),
  anchors: readCsvObjects('data/derived/nasa_1g_anchors.csv').map((r) => ({
    id: r.anchor_id, source: r.source, ntrsId: r.ntrs_id, url: r.ntrs_url, page: r.pdf_page, quote: r.quote,
    quantity: r.quantity, value: r.value, use: r.use, howUsed: r.how_used, caveat: r.caveat,
  })),
  points: all.map(({ y, ...p }) => p),
}) + '\n')

const slimVariant = (e) => ({
  in_sample: e.in_sample, leave_one_test_out: e.leave_one_test_out, leave_one_material_out: e.leave_one_material_out,
})
writeFileSync('data/derived/sim-validation.json', JSON.stringify({
  note: 'Written by scripts/sim/calibrate.mjs.',
  points_total: all.length,
  points_used: points.length,
  tests_used: testIds.length,
  labels_used: { burn: points.filter((p) => p.y === 1).length, not_burn: points.filter((p) => p.y === 0).length },
  thickness_term_used: useBeta,
  thickness_rule: 'Keep the thickness term only if it lowers the leave-one-test-out Brier score on the same points.',
  thickness_rule_says_use: ruleSaysUse,
  thickness_overridden: forced === 'on' || forced === 'off' ? forced : null,
  variants: { without_thickness: slimVariant(withoutThickness), with_thickness: slimVariant(withThickness) },
  in_sample: chosen.in_sample,
  leave_one_test_out: chosen.leave_one_test_out,
  leave_one_material_out: chosen.leave_one_material_out,
  per_material: chosen.per_material,
  excluded_points: excluded.map((p) => ({ id: p.id, test: p.testId, event: p.event, reason: p.readingNote })),
  nasa_checks: nasaChecks,
  brief_figures_check: { note: 'Figures from the task brief, no citation found. Informational only.', verdicts: litVerdicts, table: lit },
}, null, 2) + '\n')

console.log(`points ${all.length} (used ${points.length}), tests ${testIds.length}, draws ${DRAWS}`)
console.log('thickness term kept:', useBeta)
for (const [name, e] of [['WITHOUT thickness', withoutThickness], ['WITH thickness', withThickness]]) {
  console.log(`\n${name}`)
  console.log(' in-sample  ', JSON.stringify(e.in_sample))
  console.log(' LOTO       ', JSON.stringify(e.leave_one_test_out))
  console.log(' LOMO       ', JSON.stringify(e.leave_one_material_out))
}
console.log('\nCHOSEN central', JSON.stringify(pack(thetaCentral)), 'blow-off slope', round(blowoffSlope(thetaCentral), 4), 'pts per cm/s')
console.log('per material in-sample', JSON.stringify(Object.fromEntries(Object.entries(chosen.per_material.in_sample).map(([k, v]) => [k, `${v.wrong_side}/${v.n} wrong`]))))
console.log('per material LOTO     ', JSON.stringify(Object.fromEntries(Object.entries(chosen.per_material.leave_one_test_out).map(([k, v]) => [k, `acc ${v.accuracy}, brier ${v.brier} vs ${v.baseline_brier_prevalence}`]))))
console.log('\nNASA CHECKS'); for (const [k, v] of Object.entries(nasaChecks)) console.log(' ', k, JSON.stringify(v))
console.log('\nbrief figures (informational)', JSON.stringify(litVerdicts))
