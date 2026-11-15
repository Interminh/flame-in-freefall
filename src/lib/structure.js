// How the NASA data is organised, computed from the repository data files only.
// Nothing here is typed in: counts come from investigations.json, datasets/index.json, tests.json and analytics.json.

export const hasOutcome = (t) => t.outcome_class && t.outcome_class !== 'unknown'
export const hasBoth = (t) => t.o2_percent != null && t.pressure_kpa != null

export function structure({ invs, idx, tests, analytics }) {
  const byId = Object.fromEntries(idx.map((d) => [d.id, d]))
  const rowsBy = new Map()
  for (const t of tests) { if (!rowsBy.has(t.psi_id)) rowsBy.set(t.psi_id, []); rowsBy.get(t.psi_id).push(t) }
  const vars = analytics.fingerprint.variables
  const items = invs.map((inv) => {
    const d = byId[inv.psi_id]
    const r = rowsBy.get(inv.psi_id) || []
    const fp = analytics.fingerprint.by_investigation[inv.psi_id] || {}
    const kind = !d || d.rows === 0 ? 'empty' : d.kind
    const out = r.filter(hasOutcome).length
    const both = r.filter(hasBoth).length
    const all3 = r.filter((t) => hasBoth(t) && hasOutcome(t)).length
    return { inv, d, kind, rows: d?.rows || 0, harmonised: r.length, out, both, all3, fp, varied: vars.filter((v) => fp[v]?.status === 'varies') }
  })
  const withData = items.filter((i) => i.kind !== 'empty')
  const harmonised = items.filter((i) => i.harmonised > 0)
  const seriesItems = items.filter((i) => i.kind === 'series')
  const totals = {
    investigations: items.length,
    withData: withData.length,
    tables: items.filter((i) => i.kind === 'table').length,
    series: seriesItems.length,
    seriesPoints: seriesItems.reduce((s, i) => s + i.rows, 0),
    empty: items.filter((i) => i.kind === 'empty'),
    harmonisedInvs: harmonised.length,
    harmonisedRows: tests.length,
    withOutcome: tests.filter(hasOutcome).length,
    withBoth: tests.filter(hasBoth).length,
    withAll3: tests.filter((t) => hasBoth(t) && hasOutcome(t)).length,
  }
  const outside = {
    series: seriesItems,
    empty: totals.empty,
    notMerged: items.filter((i) => i.kind === 'table' && i.harmonised === 0),
  }
  return { items, byId: Object.fromEntries(items.map((i) => [i.inv.psi_id, i])), totals, outside, vars, harmonised }
}

// Picks one real harmonised row to explain the schema: among rows with an outcome, the one with the most filled fields.
export function exampleRow(tests, keys) {
  let best = null, score = -1
  for (const t of tests) {
    if (!hasOutcome(t)) continue
    const s = keys.filter((k) => t[k] != null && t[k] !== '').length
    if (s > score) { best = t; score = s }
  }
  return best
}
