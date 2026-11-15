// Recomputes every headline number from the raw tables and compares it with what the interface reads.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { thetaStar, effectiveO2, probBeats } from '../../src/lib/scaling.js'

const D = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../public/data')
const J = (f) => JSON.parse(fs.readFileSync(path.join(D, f), 'utf8'))
const meta = J('meta.json'), an = J('analytics.json'), t = J('tests.json'), invs = J('investigations.json'), lit = J('literature.json'), corpus = J('corpus.json').chunks, idx = J('datasets/index.json')
const rows = Array.from({ length: t.n }, (_, i) => Object.fromEntries(t.cols.map((c, k) => [c, t.data[k][i]])))

test('test table shape', () => { assert.equal(rows.length, t.n); assert.ok(t.data.every((c) => c.length === t.n)) })

test('facts recompute from tests.json', () => {
  const both = rows.filter((r) => r.o2_percent != null && r.pressure_kpa != null)
  const solid = rows.filter((r) => meta.solid_experiments.includes(r.experiment))
  const box = both.filter((r) => r.o2_percent >= meta.cabin_box.o2_min_percent && r.pressure_kpa <= meta.cabin_box.pressure_max_kpa)
  const f = an.facts
  assert.equal(f.rows_total, rows.length)
  assert.equal(f.rows_with_o2_and_pressure, both.length)
  assert.equal(f.rows_with_o2_pressure_and_outcome, both.filter((r) => r.outcome_class !== 'unknown').length)
  assert.equal(f.cabin_box_rows, box.length)
  assert.equal(f.cabin_box_with_outcome, box.filter((r) => r.outcome_class !== 'unknown').length)
  assert.equal(f.solid_rows, solid.length)
  assert.equal(f.solid_rows_at_or_above_24pct_o2, solid.filter((r) => r.o2_percent >= 24).length)
  assert.ok(Math.abs(f.solid_max_o2_percent - Math.max(...solid.map((r) => r.o2_percent).filter((v) => v != null))) < 0.01)
})

test('meta counts match the files', () => {
  const c = meta.counts
  assert.equal(c.investigations, invs.length)
  assert.equal(c.literature_records, lit.length)
  assert.equal(c.corpus_chunks, corpus.length)
  assert.equal(c.test_rows, rows.length)
  assert.equal(c.series_points, idx.filter((d) => d.kind === 'series').reduce((s, d) => s + d.rows, 0))
  assert.equal(c.literature_full_text, new Set(corpus.filter((x) => x.src === 'ntrs').map((x) => x.doc)).size)
  assert.equal(Object.values(c.pillars).reduce((a, b) => a + b, 0), invs.length)
})

test('dataset files match their index', () => {
  for (const d of idx) {
    const ds = J(`datasets/${d.id}.json`)
    assert.equal(ds.rows, d.rows, d.id)
    if (ds.kind === 'table' && ds.cols.length) assert.ok(ds.data.every((col) => col.length === ds.rows), `${d.id} columns have equal length`)
  }
})

test('every literature record maps to known investigations and has a URL', () => {
  const ids = new Set(invs.map((i) => i.psi_id))
  for (const d of lit) { assert.ok(d.url.startsWith('https://ntrs.nasa.gov/')); for (const i of d.investigations || []) assert.ok(ids.has(i), `${d.id} -> ${i}`) }
})

test('threshold presets are parsed from cited anchors', () => {
  for (const p of meta.loc_presets) { assert.ok(p.o2_percent > 5 && p.o2_percent < 30); assert.ok(p.url.includes('ntrs.nasa.gov')); assert.ok(p.quote.length > 10) }
})

test('theta estimates are ordered and plausible', () => {
  for (const r of [an.theta.flex.pooled_with_diluent_terms, an.theta.cfi.hot_flame, an.theta.cfi.cool_flame]) {
    assert.ok(r.ci95[0] < r.theta && r.theta < r.ci95[1])
    assert.equal(r.bootstrap_valid_fraction, 1)
  }
  assert.ok(an.theta.flex.pooled_with_diluent_terms.ci95[1] < 1, 'FLEX interval excludes theta = 1')
})

test('scaling math: break-even theta reproduces the threshold', () => {
  for (const s of meta.scenarios) {
    if (Math.abs(s.pressure_kpa - 101.325) < 1e-6) continue
    const ts = thetaStar(s.o2_percent, s.pressure_kpa, 20.9)
    assert.ok(Math.abs(effectiveO2(s.o2_percent, s.pressure_kpa, ts) - 20.9) < 1e-9, s.id)
  }
  assert.equal(probBeats(30, 70.33, 20.9, 0.05, 0.63), 1)
  assert.equal(probBeats(10, 101.325, 20.9, 0.05, 0.63), 0)
})

import { structure, hasOutcome, hasBoth } from '../../src/lib/structure.js'

test('dataset structure counts are internally consistent', () => {
  const S = structure({ invs, idx, tests: rows, analytics: an })
  assert.equal(S.totals.investigations, meta.counts.investigations)
  assert.equal(S.totals.tables + S.totals.series + S.totals.empty.length, S.totals.investigations)
  assert.equal(S.items.reduce((s, i) => s + i.harmonised, 0), rows.length)
  assert.equal(S.totals.harmonisedRows, meta.counts.test_rows)
  assert.equal(S.totals.withBoth, meta.counts.rows_o2_and_pressure)
  assert.ok(S.totals.withAll3 <= Math.min(S.totals.withBoth, S.totals.withOutcome))
  assert.equal(S.totals.withOutcome, rows.filter(hasOutcome).length)
  assert.equal(S.totals.withBoth, rows.filter(hasBoth).length)
})

test('every harmonised column has a definition in dictionary.json', () => {
  const dict = J('dictionary.json')
  const keys = new Set([...dict.unified, ...dict.derived].map((c) => c.key))
  assert.deepEqual(t.cols.filter((c) => !keys.has(c)), [])
  assert.ok(dict.unified.length >= 15)
})
