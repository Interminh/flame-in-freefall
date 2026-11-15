// Pressure-scaling framework for the oxygen effect.
//   effective O2 = x * (p / P_REF)^theta
//   theta = 0: only the O2 mole fraction matters.  theta = 1: only the O2 partial pressure matters.
// Break-even theta* for a reference threshold L: the atmosphere (x, p) beats L iff theta < theta*.
// theta intervals come from public/data/analytics.json (bootstrap on droplet extinction diameters).
// Applying them to solid fuels is an ASSUMPTION and is labelled so wherever it is used.
import { entropy } from './stats.js'

export const P_REF = 101.325

export const effectiveO2 = (x, p, theta) => x * (p / P_REF) ** theta
export const ppO2 = (x, p) => (x / 100) * p

// theta* such that effectiveO2(x, p, theta*) = L. Returns null when p equals P_REF.
export function thetaStar(x, p, L) {
  const lp = Math.log(p / P_REF)
  if (Math.abs(lp) < 1e-9) return null
  return Math.log(L / x) / lp
}

// Probability (interpretation) that the atmosphere is at least as flammable as the reference,
// taking theta uniform over the data-informed interval [lo, hi].
export function probBeats(x, p, L, lo, hi) {
  const ts = thetaStar(x, p, L)
  if (ts == null) return x >= L ? 1 : 0
  const lp = Math.log(p / P_REF)
  // For p < P_REF: beats iff theta < ts. For p > P_REF: beats iff theta > ts.
  const clamp = (v) => Math.max(0, Math.min(1, v))
  const frac = clamp((ts - lo) / (hi - lo))
  return lp < 0 ? frac : 1 - frac
}

export const THETA_SOURCES = (analytics) => {
  const t = analytics.theta
  return {
    flex: { label: 'FLEX droplet extinction (PSI-69)', est: t.flex.pooled_with_diluent_terms.theta, ci: t.flex.pooled_with_diluent_terms.ci95, n: t.flex.n },
    cfiHot: { label: 'CFI hot flame (PSI-39)', est: t.cfi.hot_flame.theta, ci: t.cfi.hot_flame.ci95, n: t.cfi.hot_flame.n },
    cfiCool: { label: 'CFI cool flame (PSI-39)', est: t.cfi.cool_flame.theta, ci: t.cfi.cool_flame.ci95, n: t.cfi.cool_flame.n },
  }
}

// Verdict for atmosphere (x, p) against reference L over theta interval [lo, hi].
export function verdict(x, p, L, lo, hi, refLabel) {
  const ts = thetaStar(x, p, L)
  const e0 = effectiveO2(x, p, 0), e1 = effectiveO2(x, p, 1)
  const eLo = effectiveO2(x, p, lo), eHi = effectiveO2(x, p, hi)
  const lowP = p < P_REF
  const eMin = Math.min(eLo, eHi), eMax = Math.max(eLo, eHi)
  let kind, head
  if (eMin >= L) { kind = 'robust'; head = `More flammable than ${refLabel} for every theta in the data-informed range` }
  else if (eMax < L) { kind = 'robust'; head = `Less flammable than ${refLabel} for every theta in the data-informed range` }
  else { kind = 'depends'; head = `Verdict depends on theta: break-even at theta* = ${ts == null ? 'n/a' : ts.toFixed(2)}` }
  // Contested: the conclusion only survives under a theta value the data reject (theta = 1 rejected by FLEX bootstrap).
  const survivesOnlyAtPpo2 = !(eMin >= L) && e1 < L && e0 >= L
  return { kind, head, ts, e0, e1, eLo, eHi, lowP, survivesOnlyAtPpo2, interval: [lo, hi] }
}

// Scenarios and thresholds come from public/data/meta.json, written by scripts/pipeline/build_meta.py.
const sub2 = (t) => String(t).replace(/O2/g, 'O\u2082')
export function scenariosFrom(meta) {
  return meta.scenarios.map((s) => ({ id: s.id, label: sub2(s.label), short: s.short, x: s.o2_percent, p: s.pressure_kpa, ppo2: s.ppo2_kpa, src: s.src }))
}
export function earthAirFrom(meta) {
  const e = meta.scenarios.find((s) => s.id === 'earth_air')
  return { x: e.o2_percent, p: e.pressure_kpa }
}
// Sourced thresholds: Earth air plus literature anchors. Other materials have no sourced value in the repository,
// so a custom threshold is offered and labelled as user-defined.
export function presetsFrom(meta) {
  const e = earthAirFrom(meta)
  return [
    { id: 'earth_air', label: `Earth air (${e.x}% at ${e.p} kPa)`, L: e.x, src: 'Reference atmosphere', cite: null },
    ...meta.loc_presets.map((l) => ({ id: l.id, label: `${l.label} (${l.o2_percent}%)`, L: l.o2_percent, src: l.src, cite: l.url, quote: l.quote })),
    { id: 'custom', label: 'Custom threshold', L: e.x, src: 'User defined', cite: null },
  ]
}
