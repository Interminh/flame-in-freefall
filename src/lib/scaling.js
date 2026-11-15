// Pressure-scaling framework for the oxygen effect.
//   effective O2 = x * (p / P_REF)^theta
//   theta = 0: only the O2 mole fraction matters.  theta = 1: only the O2 partial pressure matters.
// Break-even theta* for a reference threshold L: the atmosphere (x, p) beats L iff theta < theta*.
// theta intervals come from public/data/analytics.json (bootstrap on droplet extinction diameters).
// Applying them to solid fuels is an ASSUMPTION and is labelled so wherever it is used.
import { entropy } from './stats.js'

export const P_REF = 101.325
export const EARTH_AIR = { x: 20.9, p: P_REF }

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

export const SCENARIOS = [
  { id: 'earth_air', label: 'Earth air', short: 'Earth air', x: 20.9, p: 101.325, note: 'Sea-level air, 14.7 psi', src: 'Reference atmosphere' },
  { id: 'moon_cabin_10p2psi', label: 'Moon cabin, 30% O₂ at 10.2 psi', short: 'Moon cabin 30% / 10.2 psi', x: 30, p: 70.33, note: 'Challenge brief: cabin of at most 10.2 psi with at least 30% O₂', src: 'Challenge brief' },
  { id: 'moon_cabin_8p2psi', label: 'Cabin, 34% O₂ at 8.2 psia', short: '34% / 8.2 psia', x: 34, p: 56.54, note: 'Highest-O₂ ACME BRE record', src: 'PSI-20 ACME BRE' },
  { id: 'moon_cabin_26_5', label: 'Cabin, 26.5% O₂ at 10.2 psi', short: '26.5% / 10.2 psi', x: 26.5, p: 70.33, note: 'ACME BRE record', src: 'PSI-20 ACME BRE' },
  { id: 'suit_4p3psi', label: 'Suit, 100% O₂ at 4.3 psi', short: 'Suit 100% / 4.3 psi', x: 100, p: 29.65, note: 'Pure-O₂ suit loop', src: 'Challenge brief' },
]

// Sourced microgravity limits for PMMA rods (see data/derived/nasa_1g_anchors.csv). Other materials have no
// sourced value in this repository, so the Atlas lets the user enter a custom limit and says so.
export const LOC_PRESETS = [
  { id: 'earth_air', label: 'Earth air (20.9% at 101.3 kPa)', L: 20.9, src: 'Reference atmosphere', cite: null },
  { id: 'pmma_rod_ug', label: 'PMMA rod, zero-stretch limit (13.4%)', L: 13.4, src: 'NTRS 20170006615, p. 7', cite: 'https://ntrs.nasa.gov/citations/20170006615' },
  { id: 'pmma_rod_1g', label: 'PMMA rod, 1 g blow-off limit (16%)', L: 16, src: 'NTRS 20160000593, p. 18', cite: 'https://ntrs.nasa.gov/citations/20160000593' },
  { id: 'custom', label: 'Custom threshold', L: 18, src: 'User defined', cite: null },
]
