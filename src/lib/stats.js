export const sum = (a) => a.reduce((s, x) => s + x, 0)
export const mean = (a) => (a.length ? sum(a) / a.length : NaN)
export function quantile(a, q) {
  const s = [...a].sort((x, y) => x - y)
  if (!s.length) return NaN
  const pos = (s.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos)
  return s[lo] + (s[hi] - s[lo]) * (pos - lo)
}
export const median = (a) => quantile(a, 0.5)
export function sd(a) {
  if (a.length < 2) return NaN
  const m = mean(a)
  return Math.sqrt(sum(a.map((x) => (x - m) ** 2)) / (a.length - 1))
}
export function pearson(x, y) {
  const n = x.length
  if (n < 3) return NaN
  const mx = mean(x), my = mean(y)
  let sxy = 0, sxx = 0, syy = 0
  for (let i = 0; i < n; i++) { const dx = x[i] - mx, dy = y[i] - my; sxy += dx * dy; sxx += dx * dx; syy += dy * dy }
  return sxx && syy ? sxy / Math.sqrt(sxx * syy) : NaN
}
export function rank(a) {
  const idx = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0])
  const r = new Array(a.length)
  for (let i = 0; i < idx.length; ) {
    let j = i
    while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++
    const avg = (i + j) / 2 + 1
    for (let k = i; k <= j; k++) r[idx[k][1]] = avg
    i = j + 1
  }
  return r
}
export const spearman = (x, y) => pearson(rank(x), rank(y))
export const entropy = (p) => (p <= 0 || p >= 1 ? 0 : -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p)))
export const fmt = (v, d = 2) => (v == null || Number.isNaN(v) ? 'n/a' : Number(v).toLocaleString('en-US', { maximumFractionDigits: d }))
export function ols(x, y) {
  const n = x.length, mx = mean(x), my = mean(y)
  let sxy = 0, sxx = 0
  for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2 }
  const b = sxx ? sxy / sxx : NaN
  return { slope: b, intercept: my - b * mx, r: pearson(x, y) }
}
