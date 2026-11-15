// Testable predictions for a lunar-gravity (0.165 g) flammability experiment.
// "FM2" here means Flammability of Materials on the Moon. Nothing below describes the real
// experiment hardware or schedule. These are model outputs a lunar test could confirm or refute.
import { MATERIALS, P_REF_KPA, PARAMS, summarizeProbability, classify, hiddenRisk, makeTheta } from './model.js'

export const FM2_GRAVITY = 0.165

const O2_GRID = [15, 16, 17, 18, 19, 20, 21, 22]
const FLOW_GRID = [2, 3, 5, 8, 10, 15, 20]
const MAX_PREDICTIONS = 8

// Candidates stay inside the BASS-II oxygen and flow range, so the main open question is gravity.
function candidates(draws, theta) {
  const out = []
  for (const m of MATERIALS) {
    for (const direction of m.id === 'sibal' ? ['concurrent'] : ['opposed']) {
      for (const o2 of O2_GRID) {
        for (const uForced of FLOW_GRID) {
          const thickness = PARAMS.defaultThickness.value[m.id] ?? null
          const base = { o2, p: P_REF_KPA, uForced, direction, material: m.id, thickness }
          const moon = summarizeProbability({ ...base, g: FM2_GRAVITY }, draws)
          const earth = summarizeProbability({ ...base, g: 1 }, draws)
          out.push({ ...base, label: m.label, moon, earth, hidden: hiddenRisk(moon.mean, earth.mean, theta) })
        }
      }
    }
  }
  return out
}

// Two kinds of prediction, at most one of each per material:
//   hidden-risk : burns at 0.165 g although the same inputs would not burn at 1 g. Largest gap first.
//   boundary    : mean P(burn) closest to 0.5 at 0.165 g, at a different O2 than the hidden-risk pick,
//                 so a test there is most informative about where the lunar boundary sits.
function pick(draws, theta) {
  const all = candidates(draws, theta)
  const chosen = []
  for (const m of MATERIALS) {
    const mine = all.filter((c) => c.material === m.id)
    const hidden = mine
      .filter((c) => c.hidden)
      .sort((a, b) => b.moon.mean - b.earth.mean - (a.moon.mean - a.earth.mean))[0]
    if (hidden) chosen.push(hidden)
    const boundary = mine
      .filter((c) => !hidden || c.o2 !== hidden.o2)
      .sort((a, b) => Math.abs(a.moon.mean - 0.5) - Math.abs(b.moon.mean - 0.5))[0]
    if (boundary) chosen.push(boundary)
  }
  return chosen.slice(0, MAX_PREDICTIONS)
}

export function fm2Predictions(draws) {
  const theta = makeTheta()
  return pick(draws, theta).map((c, i) => {
    const outcome = classify(c.moon.mean, theta)
    return {
      id: `FM2-${String(i + 1).padStart(2, '0')}`,
      material: c.label,
      thickness_mm: c.thickness ?? '',
      o2_percent: c.o2,
      pressure_kpa: c.p,
      forced_flow_cm_s: c.uForced,
      flow_direction: c.direction,
      gravity_g: FM2_GRAVITY,
      predicted_outcome: outcome,
      p_burn: round(c.moon.mean),
      p_burn_q05: round(c.moon.q05),
      p_burn_q95: round(c.moon.q95),
      p_burn_at_1g: round(c.earth.mean),
      hidden_risk: c.hidden ? 'yes' : 'no',
      refuted_if:
        outcome === 'burns'
          ? 'The flame does not sustain on the Moon at these conditions.'
          : outcome === 'extinguishes'
            ? 'A flame sustains on the Moon at these conditions.'
            : 'Either result is consistent with the model. The outcome sets the boundary.',
    }
  })
}

const round = (x) => Math.round(x * 100) / 100

const COLUMNS = [
  'id', 'material', 'thickness_mm', 'o2_percent', 'pressure_kpa', 'forced_flow_cm_s', 'flow_direction', 'gravity_g',
  'predicted_outcome', 'p_burn', 'p_burn_q05', 'p_burn_q95', 'p_burn_at_1g', 'hidden_risk', 'refuted_if',
]

export function fm2ToCsv(rows) {
  const esc = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replaceAll('"', '""')}"` : String(v))
  return [COLUMNS.join(','), ...rows.map((r) => COLUMNS.map((c) => esc(r[c])).join(','))].join('\n') + '\n'
}
