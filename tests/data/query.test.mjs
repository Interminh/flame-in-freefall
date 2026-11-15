// Tests for the query layer used by Explore and Ignis AI. Expected values are recomputed from tests.json
// independently of the code under test, so a change in the data does not break them.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import * as Q from '../../src/lib/query.js'

const t = JSON.parse(fs.readFileSync(new URL('../../public/data/tests.json', import.meta.url)))
const rows = Array.from({ length: t.n }, (_, i) => Object.fromEntries(t.cols.map((c, j) => [c, t.data[j][i]])))
const V = Q.buildVocab(rows)
const parse = (s) => Q.resolvePsi(Q.parseQuery(s, V), rows)

test('facet counts sum to the row count for every facet', () => {
  const fc = Q.facetCounts(rows, Q.emptyState())
  for (const f of Q.FACETS) assert.equal(fc[f.key].reduce((s, [, n]) => s + n, 0), rows.length, f.key)
})

test('an experiment name filters to exactly its rows', () => {
  const exp = V.experiments[0]
  const p = parse(exp)
  assert.deepEqual(p.state.cat.experiment, [exp])
  assert.equal(Q.applyFilters(rows, p.state).length, rows.filter((r) => r.experiment === exp).length)
})

test('PSI ids resolve to their experiment', () => {
  const r = rows[0]
  const p = parse(r.psi_id.toLowerCase())
  assert.ok(p.state.cat.experiment?.includes(r.experiment))
})

test('relative and between constraints produce the right bounds and only satisfying rows', () => {
  const a = parse('tests above 21% oxygen')
  assert.deepEqual(a.state.range.o2_percent, [21, null])
  assert.ok(Q.applyFilters(rows, a.state).every((r) => r.o2_percent >= 21))
  const b = parse('between 15 and 25 % oxygen')
  assert.deepEqual(b.state.range.o2_percent, [15, 25])
  const c = Q.applyFilters(rows, b.state)
  assert.equal(c.length, rows.filter((r) => r.o2_percent != null && r.o2_percent >= 15 && r.o2_percent <= 25).length)
})

test('psi is converted to kPa', () => {
  const p = parse('pressure below 10 psi')
  assert.ok(Math.abs(p.state.range.pressure_kpa[1] - 68.95) < 0.01)
})

test('a sentence with no known term produces no filters', () => {
  assert.equal(parse('smoke detection in spacecraft').matched.length, 0)
})

test('URL serialisation round-trips', () => {
  const st = parse('FLEX droplets extinguished above 21% oxygen with outcome').state
  const back = Q.fromParams(Q.toParams(st))
  assert.deepEqual(back, { ...st, text: '' })
})

test('an empty result names the condition that removes every row', () => {
  const st = parse('PMMA below 70 kPa').state
  const f = Q.applyFilters(rows, st)
  if (f.length === 0) {
    const ex = Q.explainEmpty(rows, st)
    assert.ok(ex.length > 0)
    for (const e of ex) assert.ok(e.rowsWithout > 0)
  }
})

test('summaries agree with direct counts', () => {
  const s = Q.summarize(rows)
  assert.equal(s.n, rows.length)
  assert.equal(s.both, rows.filter((r) => r.o2_percent != null && r.pressure_kpa != null).length)
  assert.equal(s.stated, rows.filter((r) => r.outcome_class !== 'unknown').length)
})

test('Spearman matrix is symmetric and uses pairwise counts', () => {
  const { z } = Q.corrMatrix(rows)
  for (let i = 0; i < z.length; i++) for (let j = 0; j < z.length; j++) {
    assert.equal(z[i][j].n, z[j][i].n)
    if (z[i][j].r != null) assert.ok(Math.abs(z[i][j].r - z[j][i].r) < 1e-9)
  }
})

test('CSV export has one line per row plus a header and quotes embedded commas', () => {
  const csv = Q.toCsv([{ a: 'x,y', b: 1 }, { a: null, b: 2 }], ['a', 'b'])
  assert.equal(csv, 'a,b\n"x,y",1\n,2\n')
})
