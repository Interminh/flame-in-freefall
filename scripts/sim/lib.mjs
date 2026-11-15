// Small helpers for the calibration scripts: CSV reading, a seeded random generator, and a
// Nelder-Mead optimiser. No dependencies.
import { readFileSync } from 'node:fs'

// RFC 4180 style parser: quoted fields, doubled quotes, CRLF or LF.
export function parseCsv(text) {
  const rows = []
  let row = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.length > 1 || row[0] !== '') rows.push(row)
      row = []
    } else cell += c
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row) }
  return rows
}

export function readCsvObjects(path) {
  const [head, ...body] = parseCsv(readFileSync(path, 'utf8'))
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i] ?? ''])))
}

// mulberry32: small, fast, seedable. Fixed seed makes the bootstrap reproducible.
export function rng(seed) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    uniform: (lo, hi) => lo + (hi - lo) * next(),
    logUniform: (lo, hi) => Math.exp(Math.log(lo) + (Math.log(hi) - Math.log(lo)) * next()),
    normal: () => Math.sqrt(-2 * Math.log(1 - next())) * Math.cos(2 * Math.PI * next()),
    int: (n) => Math.floor(next() * n),
  }
}

// Minimise f over R^n. Standard Nelder-Mead with restarts from the best point.
export function nelderMead(f, x0, { step = 0.4, maxIter = 1500, tol = 1e-10, restarts = 2 } = {}) {
  let best = x0.slice()
  let bestVal = f(best)
  for (let r = 0; r <= restarts; r++) {
    const n = best.length
    let simplex = [best.slice()]
    for (let i = 0; i < n; i++) {
      const p = best.slice()
      p[i] += step * (r + 1) * 0.5 * (i % 2 ? 1 : -1)
      simplex.push(p)
    }
    let vals = simplex.map(f)
    for (let it = 0; it < maxIter; it++) {
      const order = vals.map((v, i) => i).sort((a, b) => vals[a] - vals[b])
      simplex = order.map((i) => simplex[i])
      vals = order.map((i) => vals[i])
      if (Math.abs(vals[n] - vals[0]) < tol) break
      const centroid = Array.from({ length: n }, (_, j) => simplex.slice(0, n).reduce((s, p) => s + p[j], 0) / n)
      const at = (t) => centroid.map((c, j) => c + t * (simplex[n][j] - c))
      const xr = at(-1)
      const fr = f(xr)
      if (fr < vals[0]) {
        const xe = at(-2)
        const fe = f(xe)
        if (fe < fr) { simplex[n] = xe; vals[n] = fe } else { simplex[n] = xr; vals[n] = fr }
      } else if (fr < vals[n - 1]) { simplex[n] = xr; vals[n] = fr }
      else {
        const xc = fr < vals[n] ? at(-0.5) : at(0.5)
        const fc = f(xc)
        if (fc < Math.min(fr, vals[n])) { simplex[n] = xc; vals[n] = fc }
        else {
          for (let i = 1; i <= n; i++) {
            simplex[i] = simplex[i].map((v, j) => simplex[0][j] + 0.5 * (v - simplex[0][j]))
            vals[i] = f(simplex[i])
          }
        }
      }
    }
    if (vals[0] < bestVal) { bestVal = vals[0]; best = simplex[0].slice() }
  }
  return { x: best, value: bestVal }
}
