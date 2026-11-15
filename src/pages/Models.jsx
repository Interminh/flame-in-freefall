import { useMemo, useState } from 'react'
import { loadJson } from '../lib/data.js'
import { MATERIALS, thetaFromPacked, burnProbability, summarizeProbability, summarizeLOC, classify, hiddenRisk, nearestPoints, rangeWarnings, knownMisses, makeTheta } from '../sim/model.js'
import { fm2Predictions, fm2ToCsv, FM2_GRAVITY } from '../sim/fm2.js'
import { P_REF } from '../lib/scaling.js'
import { ChartCard, PageHead, Stat, useAsync, Loading, Interp } from '../components/ui.jsx'
import { OKABE } from '../lib/theme.js'

const GRAV = [['0 g (orbit)', 0], ['Moon, 0.165 g', 0.165], ['Mars, 0.38 g', 0.38], ['Earth, 1 g', 1]]
const pct = (v) => `${(100 * v).toFixed(0)}%`

function Field({ label, value, children }) { return <div className="field"><label>{label} {value != null && <span className="val">{value}</span>}</label>{children}</div> }

export default function Models() {
  const st = useAsync(() => Promise.all([loadJson('sim-params.json'), loadJson('sim-validation.json')]))
  const [m, setM] = useState('pmma_rod')
  const [o2, setO2] = useState(21)
  const [p, setP] = useState(101.325)
  const [u, setU] = useState(5)
  const [g, setG] = useState(0.165)
  const [dir, setDir] = useState('opposed')
  const [th, setTh] = useState(0)
  const [theta, setTheta] = useState(0.285)
  const model = useMemo(() => {
    if (!st.data) return null
    const [params] = st.data
    const draws = params.draws.map(thetaFromPacked)
    return { params, draws, mapDraws: draws.filter((_, i) => i % 5 === 0), points: params.points.map((q) => ({ ...q })), used: params.points.filter((q) => q.useInFit) }
  }, [st.data])
  const calc = useMemo(() => {
    if (!model) return null
    // The model treats O2 equivalent as o2*p/P_REF (theta = 1). Pre-scale to apply a chosen theta instead.
    const o2eff = o2 * (p / P_REF) ** theta
    const inp = { o2: o2eff, p: P_REF, uForced: u, direction: dir, g, material: m, thickness: th }
    const here = summarizeProbability(inp, model.draws), one = summarizeProbability({ ...inp, g: 1 }, model.draws)
    const loc = summarizeLOC(inp, model.draws), loc1 = summarizeLOC({ ...inp, g: 1 }, model.draws)
    const t0 = makeTheta()
    const o2s = Array.from({ length: 61 }, (_, i) => 8 + i * 0.5)
    const curves = GRAV.map(([n, gg]) => ({ n, gg, y: o2s.map((x) => summarizeProbability({ ...inp, o2: x, g: gg }, model.mapDraws).mean) }))
    const band = o2s.map((x) => { const s = summarizeProbability({ ...inp, o2: x }, model.mapDraws); return [s.q05, s.q95] })
    const xs = Array.from({ length: 45 }, (_, i) => 8 + i * 0.6), us = Array.from({ length: 36 }, (_, i) => Math.exp(Math.log(0.3) + (i * (Math.log(80) - Math.log(0.3))) / 35))
    const z = us.map((uu) => xs.map((x) => summarizeProbability({ ...inp, o2: x, uForced: uu }, model.mapDraws).mean))
    const locs = GRAV.map(([n, gg]) => ({ n, ...summarizeLOC(inp, model.draws.map((d) => ({ ...d, zG: 0 }))) , g: gg, v: summarizeLOC({ ...inp, g: gg }, model.draws) }))
    return { inp, here, one, loc, loc1, cls: classify(here.mean, t0), hidden: hiddenRisk(here.mean, one.mean, t0), o2s, curves, band, xs, us, z, locs,
      near: nearestPoints({ ...inp, o2: o2eff }, model.used, 5), warn: [...rangeWarnings({ ...inp, o2: o2 }, model.params.ranges), ...knownMisses(inp)], fm2: fm2Predictions(model.draws) }
  }, [model, m, o2, p, u, g, dir, th, theta])
  if (st.loading || !calc) return <Loading />
  const val = st.data[1]
  const download = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([fm2ToCsv(calc.fm2)], { type: 'text/csv' })); a.download = 'fm2-predictions.csv'; a.click() }
  return (
    <>
      <PageHead eyebrow="Screening model" title="Flammability model: PMMA and SIBAL" lede="A small, calibrated, fully inspectable model of solid-fuel flammability versus oxygen, flow and gravity, fitted to BASS-II flow points and anchored to NASA-published limits. It is an estimate, not a fire prediction." />
      <div className="callout bad"><b>Read the validation first</b>Fitted on {val.points_used} points, the model gets {pct(val.in_sample.accuracy)} right in-sample and {pct(val.leave_one_test_out.accuracy)} leaving one test out, against {pct(val.leave_one_test_out.baseline_accuracy_majority)} for always guessing the commoner outcome. Leaving one <i>material</i> out it gets {pct(val.leave_one_material_out.accuracy)} with a Brier score of {val.leave_one_material_out.brier}, which is worse than the {val.leave_one_material_out.baseline_brier_prevalence} of the baseline. It does not generalise to a new material, and there is no outcome data above 0 g.</div>
      <div className="split">
        <aside className="card" style={{ position: 'sticky', top: 72 }}>
          <Field label="Material"><select value={m} onChange={(e) => setM(e.target.value)}>{MATERIALS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}</select></Field>
          <Field label="O₂ fraction" value={`${o2}%`}><input type="range" min="8" max="40" step="0.5" value={o2} onChange={(e) => setO2(+e.target.value)} /></Field>
          <Field label="Total pressure" value={`${p} kPa`}><input type="range" min="40" max="101.325" step="0.5" value={p} onChange={(e) => setP(+e.target.value)} /></Field>
          <Field label="Pressure scaling θ" value={theta}><input type="range" min="0" max="1" step="0.05" value={theta} onChange={(e) => setTheta(+e.target.value)} /></Field>
          <Field label="Forced airflow" value={`${u} cm/s`}><input type="range" min="0" max="50" step="0.5" value={u} onChange={(e) => setU(+e.target.value)} /></Field>
          <Field label="Gravity"><select value={g} onChange={(e) => setG(+e.target.value)}>{GRAV.map(([n, v]) => <option key={v} value={v}>{n}</option>)}</select></Field>
          <Field label="Flow direction"><select value={dir} onChange={(e) => setDir(e.target.value)}><option value="opposed">Opposed</option><option value="concurrent">Concurrent</option></select></Field>
          {(m === 'pmma_film' || m === 'pmma_slab') && <Field label="Thickness" value={th ? `${th} mm` : 'default'}><input type="range" min="0" max="5" step="0.1" value={th} onChange={(e) => setTh(+e.target.value)} /></Field>}
          <p className="small">The model's own oxygen term is the O₂ partial pressure (θ = 1). This page applies your θ before the model, so below 101 kPa the result depends on a quantity the data constrain only for droplets. <Interp /></p>
        </aside>
        <div className="grid">
          <div className="grid g3">
            <Stat k="P(burn) here" v={pct(calc.here.mean)} n={`5–95%: ${pct(calc.here.q05)} to ${pct(calc.here.q95)}`} />
            <Stat k="P(burn) at 1 g" v={pct(calc.one.mean)} n={calc.hidden ? 'Burns here but not at 1 g: hidden risk' : `Verdict here: ${calc.cls}`} />
            <Stat k="Limiting O₂ here" v={`${calc.loc.median.toFixed(1)}%`} n={`1 g: ${calc.loc1.median.toFixed(1)}% (5–95%: ${calc.loc.q05.toFixed(1)} to ${calc.loc.q95.toFixed(1)})`} />
          </div>
          {calc.warn.map((w, i) => <div className="callout neutral" key={i}>{w}</div>)}
          <ChartCard title="P(burn) versus O₂ at four gravity levels" sub="Posterior-style mean over 40 parameter draws; band is 5–95% at the selected gravity" notes="Only 0 g has outcome data. The other gravities are anchored to NASA buoyant-flow numbers." source="src/sim/model.js, data/derived/sim-params.json"
            data={[{ type: 'scatter', x: [...calc.o2s, ...[...calc.o2s].reverse()], y: [...calc.band.map((b) => b[1]), ...[...calc.band].reverse().map((b) => b[0])], fill: 'toself', fillcolor: 'rgba(194,65,12,0.12)', line: { width: 0 }, name: 'Band, selected g', hoverinfo: 'skip' },
              ...calc.curves.map((c, i) => ({ type: 'scatter', mode: 'lines', name: c.n, x: calc.o2s, y: c.y, line: { color: OKABE[i], width: 2.2 } }))]}
            layout={{ xaxis: { title: 'Effective O₂ (%)' }, yaxis: { title: 'P(burn)', range: [0, 1] } }} />
          <div className="grid g2">
            <ChartCard title="Burn map: airflow against O₂" sub="At the selected gravity, direction and material" data={[{ type: 'heatmap', x: calc.xs, y: calc.us, z: calc.z, zmin: 0, zmax: 1, colorscale: [[0, '#0072B2'], [0.5, '#F4F1E8'], [1, '#D55E00']], colorbar: { title: { text: 'P(burn)' }, thickness: 10 } },
              { type: 'scatter', mode: 'markers', x: [calc.inp.o2], y: [Math.max(u, 0.3)], marker: { symbol: 'diamond', size: 14, color: '#fff', line: { color: '#15181d', width: 2 } }, name: 'Selected', hoverinfo: 'skip' },
              { type: 'scatter', mode: 'markers', name: 'Fitted burn', x: model.used.filter((q) => q.material === m && q.label === 'burn').map((q) => q.o2), y: model.used.filter((q) => q.material === m && q.label === 'burn').map((q) => Math.max(q.flow, 0.3)), marker: { color: '#D55E00', size: 6, line: { color: '#fff', width: 1 } } },
              { type: 'scatter', mode: 'markers', name: 'Fitted no burn', x: model.used.filter((q) => q.material === m && q.label !== 'burn').map((q) => q.o2), y: model.used.filter((q) => q.material === m && q.label !== 'burn').map((q) => Math.max(q.flow, 0.3)), marker: { color: '#0072B2', size: 6, symbol: 'x' } }]}
              layout={{ xaxis: { title: 'Effective O₂ (%)' }, yaxis: { title: 'Forced flow (cm/s)', type: 'log' } }} notes="Dots are the fitted BASS-II points for this material." source="data/derived/sim-params.json" />
            <ChartCard title="Limiting O₂ by gravity" sub="Median with 5–95% interval" data={[{ type: 'bar', x: calc.locs.map((l) => l.n), y: calc.locs.map((l) => l.v.median), error_y: { type: 'data', symmetric: false, array: calc.locs.map((l) => l.v.q95 - l.v.median), arrayminus: calc.locs.map((l) => l.v.median - l.v.q05) }, marker: { color: OKABE.slice(0, 4) } }]} layout={{ yaxis: { title: 'Limiting O₂ (%)' } }} source="src/sim/model.js" />
          </div>
          <div className="card"><h3>Nearest real experiments</h3><p className="small">The five fitted BASS-II points closest to this condition. If none is close, the model is extrapolating.</p>
            <div className="tbl-wrap"><table><thead><tr><th>Test</th><th>Material</th><th>O₂ %</th><th>Flow cm/s</th><th>Outcome</th><th>Distance</th></tr></thead><tbody>{calc.near.map(({ pt, d }) => <tr key={pt.id}><td>{pt.testId}</td><td>{pt.materialText}</td><td className="n">{pt.o2}</td><td className="n">{pt.flow}</td><td>{pt.label}</td><td className="n">{d.toFixed(2)}</td></tr>)}</tbody></table></div></div>
          <div className="card"><div className="card-head"><h3>FM2 pre-registered predictions</h3><button className="btn sm" onClick={download}>Download CSV</button></div><p className="small">Predictions for a proposed lunar-gravity ({FM2_GRAVITY} g) flammability run, with the result that would refute each. Written before any such data exist.</p>
            <div className="tbl-wrap"><table><thead><tr><th>Id</th><th>Material</th><th>O₂ %</th><th>Flow</th><th>Prediction</th><th>P(burn)</th><th>At 1 g</th><th>Refuted if</th></tr></thead><tbody>{calc.fm2.map((r) => <tr key={r.id}><td>{r.id}</td><td>{r.material}</td><td className="n">{r.o2_percent}</td><td className="n">{r.forced_flow_cm_s}</td><td>{r.predicted_outcome}</td><td className="n">{r.p_burn}</td><td className="n">{r.p_burn_at_1g}</td><td className="small">{r.refuted_if}</td></tr>)}</tbody></table></div></div>
        </div>
      </div>
    </>
  )
}
