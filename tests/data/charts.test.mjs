// Every automatically built chart must carry axis titles, and every dataset with data must produce at least one chart.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { autoCharts } from '../../src/lib/autoCharts.js'

const D = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../public/data/')
const idx = JSON.parse(fs.readFileSync(D + 'datasets/index.json', 'utf8'))
const rowsOf = (ds) => { const n = ds.data?.[0]?.length || 0; return Array.from({ length: n }, (_, i) => Object.fromEntries(ds.cols.map((c, k) => [c, ds.data[k][i]]))) }
const NO_AXES = new Set(['treemap', 'pie', 'sunburst', 'table'])

for (const d of idx) {
  test(`${d.id} charts have axis titles`, () => {
    const ds = JSON.parse(fs.readFileSync(D + `datasets/${d.id}.json`, 'utf8'))
    const charts = autoCharts(ds, ds.kind === 'series' ? [] : rowsOf(ds))
    if (d.rows > 0) assert.ok(charts.length >= 1, 'dataset with data produced no charts')
    for (const c of charts) {
      const t = c.data[0]?.type
      if (NO_AXES.has(t)) continue
      assert.ok(c.layout?.xaxis?.title, `${c.id}: x axis title`)
      if (t !== 'histogram') assert.ok(c.layout?.yaxis?.title, `${c.id}: y axis title`)
      assert.ok(c.group, `${c.id}: group`)
    }
  })
}
