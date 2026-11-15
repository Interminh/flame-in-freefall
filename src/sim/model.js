// Screening-level flammability model for solid fuels as a function of oxygen, airflow,
// material and gravity. Pure functions, no DOM, so it runs in the browser and under Node.
//
// This is an ESTIMATE from a simplified model. It is not a prediction of a real fire.
//
// Structure
//   1. Gravity enters only through a buoyant flow U_b = U_1g * sqrt(g), with g in units of Earth gravity.
//      The sqrt(g) scaling and the size of U_1g come from NASA-hosted papers (see data/derived/nasa_1g_anchors.csv).
//   2. Forced and buoyant flow combine as a power mean, U_eff = (U_f^n + U_b^n)^(1/n).
//      n = 4 is the rule derived in NTRS 20200000557 (Eq. 6). n = 1 is the empirical linear sum in NTRS 20170006615.
//   3. A burn window in flow. The flame starves below a quench flow U_q (exponential in oxygen, fitted to BASS-II)
//      and blows off above U_bo (a straight line in oxygen, anchored to NASA numbers).
//      P(burn) = sigmoid(sq*ln(U/U_q)) * sigmoid(sb*ln(U_bo/U)).
//   4. The limiting oxygen concentration (LOC) is the O2 at which P(burn) = 0.5.

export const P_REF_KPA = 101.325 // kPa, one standard atmosphere (definition)
export const O2_REF = 21 // percent, reference oxygen level for the quench-flow oxygen term (modelling choice)
export const LOC_SCAN_MAX = 60 // percent O2, upper end of the LOC search

export const MATERIALS = [
  { id: 'pmma_film', label: 'PMMA, thin film' },
  { id: 'pmma_slab', label: 'PMMA, thick slab' },
  { id: 'pmma_rod', label: 'PMMA, rod' },
  { id: 'sibal', label: 'SIBAL fabric (cotton and fiberglass)' },
]

// Only these two materials have a sample thickness in the BASS-II data, so only they get the thickness term.
export const THICKNESS_MATERIALS = ['pmma_film', 'pmma_slab']
export const THICKNESS_REF_MM = 1 // mm, reference thickness for the thickness term (modelling choice)

// Every constant lives here. `kind` says where the value comes from:
//   definition : a unit or standard value
//   anchored   : taken from a NASA-hosted source. The row in data/derived/nasa_1g_anchors.csv has the quote and page.
//   assumed    : chosen by the authors, no measurement constrains it. `range` is the sampling range.
//   calibrated : starting value or prior only. The fitted value is written to data/derived/sim-params.json.
export const PARAMS = {
  ub1g: {
    value: 20,
    range: [15, 25],
    kind: 'anchored',
    note: 'Buoyant flow at 1 g in cm/s. NTRS 20170006615 gives about 20 cm/s (anchor A1) and 17 cm/s for the smallest rod (A2). Rods only.',
  },
  mixExponent: {
    value: 4,
    range: [1, 4],
    kind: 'anchored',
    note: 'Exponent n in U_eff = (U_f^n + U_b^n)^(1/n). 4 from the derivation in NTRS 20200000557 (S1), 1 from the linear sum in NTRS 20170006615 (S2). Sampled between them.',
  },
  o2Int: {
    value: 13.4,
    range: [13.3, 13.6],
    kind: 'anchored',
    note: 'Oxygen where the blow-off line reaches zero flow, percent. 13.3 (A5), 13.4 (A6), lowest BASS-II test point 13.6. PMMA rods.',
  },
  o2Blowoff1g: {
    value: 16,
    kind: 'anchored',
    note: 'Oxygen at the 1 g blow-off limit, percent (A3, quarter-inch PMMA rod). Fixes the slope of the blow-off line, so the 1 g limit for rods is 16% by construction.',
  },
  sb: {
    value: 2.5,
    range: [1, 4],
    kind: 'assumed',
    note: 'Sharpness of the blow-off edge, per unit of ln(flow).',
  },
  uFloor: {
    value: 0.3,
    kind: 'assumed',
    note: 'Smallest effective flow in cm/s, so ln(U) stays finite when forced flow and gravity are both zero.',
  },
  uZeroReading: {
    value: 0.5,
    kind: 'assumed',
    note: 'cm/s assigned to BASS-II extinctions where the air display read 0 or <1. Used only when building the data points.',
  },
  gamma: {
    value: 0.3,
    kind: 'calibrated',
    note: 'Rise of ln(U_q) per percentage point of O2 below the reference. Fitted to BASS-II points.',
  },
  sq: {
    value: 2.5,
    kind: 'calibrated',
    note: 'Sharpness of the low-flow edge, per unit of ln(flow). Fitted to BASS-II points.',
  },
  lnUq0: {
    value: Math.log(5),
    kind: 'calibrated',
    note: 'ln of the quench flow in cm/s at the reference O2, per material. Fitted to BASS-II points.',
  },
  dirShift: {
    value: 0,
    kind: 'calibrated',
    note: 'Shift of ln(U_q) for concurrent versus opposed flow. Fitted with a penalty toward zero.',
  },
  beta: {
    value: 0,
    kind: 'calibrated',
    note: 'Change in ln(U_q) per unit of ln(thickness in mm), shared by PMMA film and slab. Thicker samples quench at higher flow when positive.',
  },
  defaultThickness: {
    value: { pmma_film: 0.1, pmma_slab: 3 },
    kind: 'assumed',
    note: 'mm, used when no thickness is given. Close to the middle of the thicknesses in the data.',
  },
  gravSigmaMax: {
    value: 0.5,
    kind: 'assumed',
    note: 'Extra log-normal spread on U_b at high gravity. No outcome data exists at any gravity above zero, so the band widens with g.',
  },
  gravSigmaScale: {
    value: 0.1,
    kind: 'assumed',
    note: 'Gravity in g at which the extra spread reaches 63% of its maximum.',
  },
  burnThreshold: { value: 0.65, kind: 'assumed', note: 'Mean P(burn) at or above this is labelled "burns".' },
  extinguishThreshold: { value: 0.35, kind: 'assumed', note: 'Mean P(burn) at or below this is labelled "extinguishes". In between is "marginal".' },
}

// Flat parameter object used by the functions below.
export function makeTheta(overrides = {}) {
  const theta = {
    ub1g: PARAMS.ub1g.value,
    mixExponent: PARAMS.mixExponent.value,
    o2Int: PARAMS.o2Int.value,
    o2Blowoff1g: PARAMS.o2Blowoff1g.value,
    sb: PARAMS.sb.value,
    uFloor: PARAMS.uFloor.value,
    gamma: PARAMS.gamma.value,
    sq: PARAMS.sq.value,
    dirShift: PARAMS.dirShift.value,
    beta: PARAMS.beta.value,
    gravSigmaMax: PARAMS.gravSigmaMax.value,
    gravSigmaScale: PARAMS.gravSigmaScale.value,
    burnThreshold: PARAMS.burnThreshold.value,
    extinguishThreshold: PARAMS.extinguishThreshold.value,
    lnUq0: Object.fromEntries(MATERIALS.map((m) => [m.id, PARAMS.lnUq0.value])),
    zG: 0,
  }
  return { ...theta, ...overrides, lnUq0: { ...theta.lnUq0, ...(overrides.lnUq0 || {}) } }
}

// Rebuild a full parameter object from the compact form written to sim-params.json,
// where lnUq0 is an array in MATERIALS order.
export function thetaFromPacked(p) {
  return makeTheta({
    ub1g: p.ub1g,
    mixExponent: p.mixExponent,
    o2Int: p.o2Int,
    sb: p.sb,
    gamma: p.gamma,
    sq: p.sq,
    dirShift: p.dirShift,
    beta: p.beta ?? 0,
    zG: p.zG ?? 0,
    lnUq0: Object.fromEntries(MATERIALS.map((m, i) => [m.id, p.lnUq0[i]])),
  })
}

const sigmoid = (z) => 1 / (1 + Math.exp(-z))

// Buoyant flow in cm/s. g is in units of Earth gravity. U_b = U_1g * sqrt(g).
export function buoyantVelocity(g, theta = makeTheta()) {
  if (!(g > 0)) return 0
  return theta.ub1g * Math.sqrt(g)
}

// Extra log-normal spread on U_b. Zero at g = 0, where the fit data lives, and widening with g.
export function gravitySigma(g, theta = makeTheta()) {
  if (!(g > 0)) return 0
  return theta.gravSigmaMax * (1 - Math.exp(-g / theta.gravSigmaScale))
}

// Power mean of forced and buoyant flow. n = 2 is root-sum-square, n = 1 a plain sum, large n approaches the larger one.
export function effectiveFlow(uForced, uBuoy, floor = PARAMS.uFloor.value, n = PARAMS.mixExponent.value) {
  if (!(uBuoy > 0)) return Math.max(floor, uForced)
  if (!(uForced > 0)) return Math.max(floor, uBuoy)
  return Math.max(floor, (uForced ** n + uBuoy ** n) ** (1 / n))
}

// Percent O2 at the reference pressure with the same oxygen partial pressure.
export function oxygenEquivalent(o2, pressureKpa) {
  return (o2 * pressureKpa) / P_REF_KPA
}

export function directionTerm(direction) {
  if (direction === 'concurrent') return 1
  if (direction === 'opposed') return 0
  return 0.5 // not recorded in the source row
}

// Thickness shifts the quench flow for PMMA film and slab only. Other materials have no thickness in the data.
export function thicknessTerm(inp, theta) {
  if (!THICKNESS_MATERIALS.includes(inp.material)) return 0
  const tau = inp.thickness > 0 ? inp.thickness : PARAMS.defaultThickness.value[inp.material]
  return theta.beta * Math.log(tau / THICKNESS_REF_MM)
}

// Blow-off line: O2 = o2Int + k*U. It passes through (o2Blowoff1g at U = ub1g) and reaches zero flow at o2Int.
export function blowoffSlope(theta) {
  return (theta.o2Blowoff1g - theta.o2Int) / theta.ub1g // percentage points of O2 per cm/s
}

// Flow in cm/s above which the flame blows off at this oxygen equivalent. Zero at or below the intercept.
export function blowoffFlow(o2e, theta) {
  return o2e > theta.o2Int ? (o2e - theta.o2Int) / blowoffSlope(theta) : 0
}

function effectiveFlowFor(inp, theta, zG) {
  const ub = buoyantVelocity(inp.g, theta) * Math.exp(gravitySigma(inp.g, theta) * zG)
  return { ub, u: effectiveFlow(inp.uForced, ub, theta.uFloor, theta.mixExponent) }
}

export function flowScales(inp, theta = makeTheta()) {
  return effectiveFlowFor(inp, theta, theta.zG || 0)
}

// P(burn) for one parameter set. inp = { o2, p, uForced, direction, g, material, thickness }.
export function burnProbability(inp, theta = makeTheta()) {
  const o2e = oxygenEquivalent(inp.o2, inp.p)
  if (!(o2e > 0)) return 0
  const { u } = effectiveFlowFor(inp, theta, theta.zG || 0)
  const x = O2_REF - o2e
  const lnUq =
    theta.lnUq0[inp.material] +
    theta.gamma * x +
    theta.dirShift * directionTerm(inp.direction) +
    thicknessTerm(inp, theta)
  const lnUbo = Math.log(Math.max(o2e - theta.o2Int, 1e-9) / blowoffSlope(theta))
  const lnU = Math.log(u)
  return sigmoid(theta.sq * (lnU - lnUq)) * sigmoid(theta.sb * (lnUbo - lnU))
}

// Lowest O2 (percent, at the input pressure) with P(burn) >= 0.5. P rises with O2, so bisect.
// Returns Infinity when even LOC_SCAN_MAX does not burn.
export function locO2(inp, theta = makeTheta()) {
  const at = (o2) => burnProbability({ ...inp, o2 }, theta)
  if (at(LOC_SCAN_MAX) < 0.5) return Infinity
  let lo = 0.5
  let hi = LOC_SCAN_MAX
  if (at(lo) >= 0.5) return lo
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2
    if (at(mid) >= 0.5) hi = mid
    else lo = mid
  }
  return hi
}

export function quantile(sortedAsc, q) {
  if (!sortedAsc.length) return NaN
  const pos = (sortedAsc.length - 1) * q
  const i = Math.floor(pos)
  const f = pos - i
  return i + 1 < sortedAsc.length ? sortedAsc[i] * (1 - f) + sortedAsc[i + 1] * f : sortedAsc[i]
}

const sortNum = (a) => [...a].sort((x, y) => x - y)

// Ensemble summaries. `draws` is an array of full parameter objects, each with its own zG.
export function summarizeProbability(inp, draws) {
  const ps = draws.map((d) => burnProbability(inp, d))
  const s = sortNum(ps)
  return { mean: ps.reduce((a, b) => a + b, 0) / ps.length, q05: quantile(s, 0.05), q95: quantile(s, 0.95) }
}

export function summarizeLOC(inp, draws) {
  const locs = sortNum(draws.map((d) => locO2(inp, d)))
  return { median: quantile(locs, 0.5), q05: quantile(locs, 0.05), q95: quantile(locs, 0.95) }
}

export function classify(pMean, theta = makeTheta()) {
  if (pMean >= theta.burnThreshold) return 'burns'
  if (pMean <= theta.extinguishThreshold) return 'extinguishes'
  return 'marginal'
}

// The condition burns at the chosen gravity but the same inputs at 1 g would not.
export function hiddenRisk(pMeanHere, pMean1g, theta = makeTheta()) {
  return classify(pMeanHere, theta) === 'burns' && classify(pMean1g, theta) !== 'burns'
}

// Nearest real experiments. Distance mixes O2, log flow, material class, flow direction and thickness.
// Each test appears once, at its nearest point.
export function nearestPoints(inp, points, k = 5) {
  const lf = (u) => Math.log(Math.max(u, 0.5))
  const scored = points.map((pt) => {
    const dO2 = (inp.o2 - pt.o2) / 3
    const dF = (lf(inp.uForced) - lf(pt.flow)) / Math.log(2)
    const dMat = pt.material === inp.material ? 0 : 2
    const dDir = !pt.direction || pt.direction === inp.direction ? 0 : 0.5
    // Thickness only counts when both sides have one (film and slab).
    const dTh = inp.thickness > 0 && pt.thickness > 0 ? Math.log(inp.thickness / pt.thickness) / Math.log(2) / 2 : 0
    return { pt, d: Math.sqrt(dO2 * dO2 + dF * dF + dMat * dMat + dDir * dDir + dTh * dTh) }
  })
  scored.sort((a, b) => a.d - b.d)
  const seen = new Set()
  const out = []
  for (const s of scored) {
    if (seen.has(s.pt.testId)) continue
    seen.add(s.pt.testId)
    out.push(s)
    if (out.length === k) break
  }
  return out
}

// Cases where a NASA source says this model is wrong. Shown as a warning next to the result.
export function knownMisses(inp) {
  const w = []
  if (inp.material === 'sibal' && inp.direction === 'opposed' && inp.g >= 0.5 && oxygenEquivalent(inp.o2, inp.p) <= 23)
    w.push('Known miss: NASA reports that downward (opposed-flow) flame spread over SIBAL does not happen in normal-gravity air (NTRS 20130012832), but this model says it can. Treat opposed-flow SIBAL results at high gravity as unreliable.')
  return w
}

// ranges = { o2: [min, max], flow: [min, max], pressure: [min, max], thickness: { material: [min, max] } } from the data.
export function rangeWarnings(inp, ranges) {
  const w = []
  const tr = ranges.thickness?.[inp.material]
  if (tr && inp.thickness > 0 && (inp.thickness < tr[0] || inp.thickness > tr[1]))
    w.push(`Thickness ${inp.thickness} mm is outside the ${tr[0]} to ${tr[1]} mm used to fit this material.`)
  if (inp.o2 < ranges.o2[0] || inp.o2 > ranges.o2[1])
    w.push(`Oxygen ${inp.o2}% is outside the BASS-II range of ${ranges.o2[0]} to ${ranges.o2[1]}%.`)
  if (inp.uForced < ranges.flow[0] || inp.uForced > ranges.flow[1])
    w.push(`Airflow ${inp.uForced} cm/s is outside the range of the extracted BASS-II flow points, ${ranges.flow[0]} to ${ranges.flow[1]} cm/s.`)
  if (inp.p < ranges.pressure[0] || inp.p > ranges.pressure[1])
    w.push(`Pressure ${inp.p} kPa is outside the recorded BASS range of ${ranges.pressure[0]} to ${ranges.pressure[1]} kPa. BASS-II recorded no pressure at all.`)
  if (inp.g > 0)
    w.push(`Gravity ${inp.g} g has almost no outcome data. Every test used to fit the model was in microgravity, so this is an extrapolation anchored to published NASA numbers and checked against one set of 1 g ground tests.`)
  return w
}
