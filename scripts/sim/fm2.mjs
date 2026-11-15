// Writes data/derived/fm2-predictions.csv from the fitted draws in data/derived/sim-params.json.
// The page builds the same table in the browser with the same module, so the two always agree.
// Run after calibrate.mjs:  node scripts/sim/fm2.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { thetaFromPacked } from '../../src/sim/model.js'
import { fm2Predictions, fm2ToCsv } from '../../src/sim/fm2.js'

const params = JSON.parse(readFileSync('data/derived/sim-params.json', 'utf8'))
const rows = fm2Predictions(params.draws.map(thetaFromPacked))
writeFileSync('data/derived/fm2-predictions.csv', fm2ToCsv(rows))
console.log(`${rows.length} predictions written`)
for (const r of rows) console.log(r.id, r.material, `O2 ${r.o2_percent}%`, `${r.forced_flow_cm_s} cm/s`, r.predicted_outcome, `p=${r.p_burn} [${r.p_burn_q05}, ${r.p_burn_q95}] 1g=${r.p_burn_at_1g} hidden=${r.hidden_risk}`)
