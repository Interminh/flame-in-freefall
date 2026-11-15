import { useMemo, useState } from 'react'
import { getAnalytics, getInvestigations, getTests, getLiterature, getDatasetIndex, getMeta, PILLARS, pillarColor } from '../lib/data.js'
import { OKABE, OUTCOME_COLORS } from '../lib/theme.js'
import { ChartCard, PageHead, Stat, Tabs, useAsync, Loading, Interp } from '../components/ui.jsx'
import { scenariosFrom, earthAirFrom, thetaStar, effectiveO2 } from '../lib/scaling.js'
import { fmt } from '../lib/stats.js'

export default function Analytics() {
  const st = useAsync(() => Promise.all([getAnalytics(), getInvestigations(), getTests(), getLiterature(), getDatasetIndex(), getMeta()]))
  const [tab, setTab] = useState('coverage')
  const c = useMemo(() => {
    if (!st.data) return null
    const [an, invs, tests, lit, idx, meta] = st.data
    const rowsById = Object.fromEntries(idx.map((d) => [d.id, d.rows]))
    const out = {}
    // Coverage heatmap
    const vars = an.fingerprint.variables
    const ids = Object.keys(an.fingerprint.by_investigation).sort((a, b) => parseInt(a.slice(4)) - parseInt(b.slice(4)))
    const val = { empty: 0, constant: 1, varies: 2 }
    out.cover = { vars, ids, z: ids.map((i) => vars.map((v) => val[an.fingerprint.by_investigation[i][v]?.status] ?? 0)),
      text: ids.map((i) => vars.map((v) => `${i} ${invs.find((x) => x.psi_id === i)?.name || ''}<br>${v}: ${an.fingerprint.by_investigation[i][v]?.status} (${an.fingerprint.by_investigation[i][v]?.n_unique} distinct)`)) }
    out.varCount = vars.map((v) => ({ v, varies: ids.filter((i) => an.fingerprint.by_investigation[i][v]?.status === 'varies').length }))
    // Theta forest
    const t = an.theta
    out.forest = [
      ['FLEX pooled (n=' + t.flex.n + ')', t.flex.pooled_with_diluent_terms], ['FLEX methanol (n=' + t.flex.methanol.n + ')', t.flex.methanol], ['FLEX heptane (n=' + t.flex.heptane.n + ')', t.flex.heptane],
      ['FLEX pure N₂ (n=' + t.flex.pure_n2_only.n + ')', t.flex.pure_n2_only], ['CFI hot flame (n=' + t.cfi.hot_flame.n + ')', t.cfi.hot_flame], ['CFI cool flame (n=' + t.cfi.cool_flame.n + ')', t.cfi.cool_flame],
    ].map(([name, r]) => ({ name, est: r.theta, lo: r.ci95[0], hi: r.ci95[1] }))
    out.gate = an.scaling_gate
    // Outcomes
    out.outcomes = an.outcome_by_experiment
    // Ranges
    const rg = new Map()
    for (const t of tests) {
      const k = t.psi_id
      if (!rg.has(k)) rg.set(k, { id: k, name: t.experiment || k, pillar: t.pillar, o: [Infinity, -Infinity, 0], p: [Infinity, -Infinity, 0] })
      const e = rg.get(k)
      if (t.o2_percent != null) { e.o[0] = Math.min(e.o[0], t.o2_percent); e.o[1] = Math.max(e.o[1], t.o2_percent); e.o[2]++ }
      if (t.pressure_kpa != null && t.pressure_kpa > 0) { e.p[0] = Math.min(e.p[0], t.pressure_kpa); e.p[1] = Math.max(e.p[1], t.pressure_kpa); e.p[2]++ }
    }
    out.ranges = [...rg.values()].filter((e) => e.o[2] > 2).map((e) => ({ id: e.id, name: e.name, lo: e.o[0], hi: e.o[1], pillar: e.pillar }))
    out.pranges = [...rg.values()].filter((e) => e.p[2] > 2).map((e) => ({ id: e.id, name: e.name, lo: e.p[0], hi: e.p[1], pillar: e.pillar }))
    out.timeline = invs.filter((i) => i.year_start).map((i) => ({ id: i.psi_id, name: i.name, a: i.year_start, b: i.year_end || i.year_start, pillar: i.pillar }))
    out.tree = invs.map((i) => ({ id: i.psi_id, name: i.name, hw: i.hardware || 'Other', pillar: i.pillar, rows: rowsById[i.psi_id] || 0 })).filter((x) => x.rows > 0)
    out.hws = [...new Set(out.tree.map((t) => t.hw))]
    // ECDF of O2 by pillar
    out.ecdf = Object.keys(PILLARS).map((k) => { const v = tests.filter((x) => x.pillar === k && x.o2_percent != null).map((x) => x.o2_percent).sort((a, b) => a - b); return { k, v } }).filter((e) => e.v.length)
    // Materials
    const mc = new Map(); for (const x of tests) { const m = x.material || 'unspecified'; mc.set(m, (mc.get(m) || 0) + 1) }
    out.materials = [...mc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 16)
    // Outcome class by pillar
    const oc = {}; for (const x of tests) { oc[x.pillar] ||= {}; oc[x.pillar][x.outcome_class] = (oc[x.pillar][x.outcome_class] || 0) + 1 }
    out.oc = oc
    // Literature
    const yrs = new Map(); for (const d of lit) yrs.set(+d.year, (yrs.get(+d.year) || 0) + 1)
    out.litYears = [...yrs.entries()].sort((a, b) => a[0] - b[0])
    const tp = new Map(); for (const d of lit) for (const tpc of d.topics || []) tp.set(tpc, (tp.get(tpc) || 0) + 1)
    out.topics = [...tp.entries()].sort((a, b) => b[1] - a[1])
    out.meta = meta
    out.nInv = invs.length
    out.scen = scenariosFrom(meta).filter((x) => x.id !== 'earth_air')
    out.earth = earthAirFrom(meta)
    out.target = out.scen.find((x) => x.id === 'moon_cabin_10p2psi') || out.scen[0]
    out.gravVaries = out.varCount.find((v) => v.v.toLowerCase().startsWith('gravity'))?.varies ?? 0
    out.outcomeKinds = [...new Set(Object.values(an.outcome_by_experiment).flatMap((o) => Object.keys(o)))]
    const yr = invs.filter((i) => i.year_start)
    out.yearRange = [Math.min(...yr.map((i) => i.year_start)) - 1, Math.max(...yr.map((i) => i.year_end || i.year_start)) + 1]
    out.facts = an.facts; out.cfi = an.cfi_pressure; out.theta = an.theta; out.nLit = lit.length; out.nTests = tests.length
    return out
  }, [st.data])
  if (st.loading) return <Loading />
  if (!c) return <div className="callout bad">Could not load analytics.</div>
  const f = c.facts
  const gateFuels = Object.keys(c.gate.fuels)
  const models = Object.keys(c.gate.fuels[gateFuels[0]].loo_rmse)
  const fl = (k) => c.forest.find((r) => r.name.startsWith(k))
  const flex = fl('FLEX pooled'), hot = fl('CFI hot'), n2 = fl('FLEX pure')
  const lo = flex.lo, hi = flex.hi
  const findings = [
    c.gravVaries === 0 ? `Gravity varies in none of the ${c.nInv} investigations, so no table compares gravity levels and partial-gravity flammability is extrapolated, not measured.` : `Gravity varies in ${c.gravVaries} of ${c.nInv} investigations; elsewhere partial-gravity flammability is extrapolated.`,
    `${f.cabin_box_rows} rows lie in the cabin box (O₂ of at least ${c.meta.cabin_box.o2_min_percent}% at ${c.meta.cabin_box.pressure_max_kpa} kPa or less); ${f.cabin_box_with_outcome} carry an outcome, and all are ${f.cabin_box_experiments.join(', ')} droplets.`,
    `${c.target.short}: effective O₂ is ${fmt(effectiveO2(c.target.x, c.target.p, hi), 1)} to ${fmt(effectiveO2(c.target.x, c.target.p, lo), 1)}% across the FLEX interval for θ, against ${fmt(c.earth.x, 1)}% for Earth air. Matching Earth air needs θ = ${fmt(thetaStar(c.target.x, c.target.p, c.earth.x), 2)}.`,
    `Pure-N₂ droplets give θ = ${fmt(n2.est, 2)} with an interval of ${fmt(n2.lo, 1)} to ${fmt(n2.hi, 1)}, so that subset does not identify θ.`,
  ]
  const honest = `FLEX pooled θ = ${fmt(flex.est, 3)} (95% interval ${fmt(flex.lo, 2)} to ${fmt(flex.hi, 2)}) ${flex.hi < 1 ? 'excludes θ = 1' : 'includes θ = 1'} and ${flex.lo <= 0.1 ? 'reaches close to 0' : 'excludes 0'}. CFI hot flame θ = ${fmt(hot.est, 3)} is tighter but rests on two O₂ levels. Both are liquid droplets, not solids: carrying θ to solid fuels is an assumption the Atlas labels everywhere. Intervals treat rows as independent.`
  return (
    <>
      <PageHead eyebrow="Cross-dataset analysis" title="Analytics" lede={`What the ${c.nInv} investigations say when read together. Every figure on this page is computed from the repository data files when the page loads.`} />
      <div className="grid g4" style={{ marginBottom: 14 }}>
        <Stat k="Test rows" v={f.rows_total.toLocaleString()} n={`${f.rows_with_o2_and_pressure} with O₂ and pressure`} />
        <Stat k="With a stated outcome" v={f.rows_with_o2_pressure_and_outcome} n="and O₂ and pressure" />
        <Stat k="Solid-fuel rows ≥ 24% O₂" v={f.solid_rows_at_or_above_24pct_o2} n={`of ${f.solid_rows} solid rows`} />
        <Stat k="Raw fuel labels" v={f.distinct_raw_fuel_labels} n="normalised to canonical materials" />
      </div>
      <div className="findings">
        <b>Key findings</b>
        <ul className="clean">{findings.map((t, i) => <li key={i}>{t}</li>)}</ul>
      </div>
      <Tabs value={tab} onChange={setTab} tabs={[{ id: 'coverage', label: 'Coverage' }, { id: 'outcomes', label: 'Outcomes' }, { id: 'scaling', label: 'Pressure scaling' }, { id: 'lit', label: 'Timeline and literature' }]} />
      {tab === 'coverage' && <div className="grid g2">
        <ChartCard size="tall" title="Which variables each investigation recorded" sub="Rows: investigations. Columns: the nine variables of a flammability map." data={[{ type: 'heatmap', x: c.cover.vars, y: c.cover.ids, z: c.cover.z, text: c.cover.text, hovertemplate: '%{text}<extra></extra>', xgap: 2, ygap: 2, zmin: 0, zmax: 2, colorscale: [[0, '#E9E6DC'], [0.34, '#E9E6DC'], [0.34, '#E69F00'], [0.67, '#E69F00'], [0.67, '#009E73'], [1, '#009E73']], showscale: false }]} layout={{ yaxis: { autorange: 'reversed', type: 'category' }, xaxis: { side: 'top', tickangle: -30 }, margin: { t: 70, l: 70 } }} notes="Green: varies. Amber: constant. Grey: empty. A flammability map needs fuel, O₂, pressure, flow and outcome to all vary in one table." source="analytics.json, fingerprint" />
        <ChartCard title="Hardware and rows" sub="Area is the number of stored rows" size="tall" data={[{ type: 'treemap', labels: ['All', ...c.hws, ...c.tree.map((t) => `${t.id} ${t.name}`)], parents: ['', ...c.hws.map(() => 'All'), ...c.tree.map((t) => t.hw)], values: [0, ...c.hws.map(() => 0), ...c.tree.map((t) => t.rows)], branchvalues: 'remainder', textinfo: 'label+value' }]} layout={{ margin: { l: 4, r: 4, t: 4, b: 4 } }} source="datasets/index.json" />
        <ChartCard title="Investigations in which each variable varies" data={[{ type: 'bar', x: c.varCount.map((v) => v.v), y: c.varCount.map((v) => v.varies), marker: { color: OKABE[0] } }]} layout={{ yaxis: { title: `Investigations (of ${c.nInv})` } }} notes={c.gravVaries === 0 ? 'No investigation varies gravity within its table; partial-gravity flammability is extrapolated, not measured.' : `Gravity varies in ${c.gravVaries} of ${c.nInv} investigations; elsewhere partial-gravity flammability is extrapolated, not measured.`} source="analytics.json, fingerprint" />
        <ChartCard title="Distribution of tested O₂ by pillar" sub="Empirical CDF over all rows that report O₂" data={c.ecdf.map((e) => ({ type: 'scatter', mode: 'lines', name: `${PILLARS[e.k].label} (${e.v.length})`, x: e.v, y: e.v.map((_, i) => (i + 1) / e.v.length), line: { color: PILLARS[e.k].color, shape: 'hv' } }))} layout={{ xaxis: { title: 'O₂ (%)' }, yaxis: { title: 'Cumulative share' } }} source="public/data/tests.json" />
        <ChartCard title="O₂ range tested per investigation" sub="Min to max over rows that report O₂, from the harmonised table" data={[{ type: 'bar', orientation: 'h', y: c.ranges.map((r) => `${r.id} ${r.name}`), base: c.ranges.map((r) => r.lo), x: c.ranges.map((r) => r.hi - r.lo), marker: { color: c.ranges.map((r) => pillarColor(r.pillar)) }, hovertemplate: '%{y}<br>%{base} to %{customdata}% O₂<extra></extra>', customdata: c.ranges.map((r) => r.hi) }]} layout={{ xaxis: { title: 'O₂ (%)' }, margin: { l: 130 }, shapes: [{ type: 'line', x0: c.target.x, x1: c.target.x, yref: 'paper', y0: 0, y1: 1, line: { color: '#c2410c', dash: 'dash' } }] }} notes={`Dashed line: ${c.target.x}% O₂, ${c.target.short}.`} source="public/data/tests.json" />
        <ChartCard title="Pressure range tested per investigation" sub="Min to max over rows with a positive pressure" data={[{ type: 'bar', orientation: 'h', y: c.pranges.map((r) => `${r.id} ${r.name}`), base: c.pranges.map((r) => r.lo), x: c.pranges.map((r) => r.hi - r.lo), marker: { color: c.pranges.map((r) => pillarColor(r.pillar)) } }]} layout={{ xaxis: { title: 'Total pressure (kPa)' }, margin: { l: 130 }, shapes: [{ type: 'line', x0: c.target.p, x1: c.target.p, yref: 'paper', y0: 0, y1: 1, line: { color: '#c2410c', dash: 'dash' } }] }} notes={`Dashed line: ${c.target.p} kPa (${(c.target.p * 0.145038).toFixed(1)} psi).`} source="public/data/tests.json" />
      </div>}
      {tab === 'outcomes' && <div className="grid g2">
        <ChartCard title="Outcomes by experiment" data={c.outcomeKinds.map((o, i) => ({ type: 'bar', name: o, x: Object.keys(c.outcomes), y: Object.keys(c.outcomes).map((e) => c.outcomes[e][o] || 0), marker: { color: OUTCOME_COLORS[o] || OKABE[i] } }))} layout={{ barmode: 'stack', yaxis: { title: 'Rows' }, xaxis: { tickangle: -30 } }} notes="'extinguished' means a flame went out by any mechanism, including flow blow-off, so it is not a limiting-oxygen outcome." source="analytics.json, outcome_by_experiment" />
        <ChartCard title="Most common canonical materials" sub="Raw labels normalised in scripts/pipeline/build_data.py" data={[{ type: 'bar', orientation: 'h', y: c.materials.map((m) => m[0]).reverse(), x: c.materials.map((m) => m[1]).reverse(), marker: { color: OKABE[2] } }]} layout={{ margin: { l: 190 }, xaxis: { title: 'Rows' } }} source="public/data/tests.json" />
      </div>}
      {tab === 'scaling' && <>
        <p className="lede" style={{ maxWidth: '80ch' }}>The lunar cabin proposal changes O₂ fraction and total pressure together. Whether flammability follows the O₂ fraction (&theta; = 0) or the O₂ partial pressure (&theta; = 1) decides whether the {c.target.short} cabin is as safe as Earth air. Only droplet-extinction data constrain &theta; in the repository. <Interp /></p>
        <div className="grid g2">
          <ChartCard title="Scaling exponent estimates with 95% bootstrap intervals" data={[{ type: 'scatter', mode: 'markers', x: c.forest.map((r) => r.est), y: c.forest.map((r) => r.name), error_x: { type: 'data', symmetric: false, array: c.forest.map((r) => r.hi - r.est), arrayminus: c.forest.map((r) => r.est - r.lo), color: '#15181d', thickness: 1.6 }, marker: { size: 10, color: c.forest.map((_, i) => OKABE[i % 8]) } }]} layout={{ xaxis: { title: 'θ', range: [-1, 2], zeroline: false }, yaxis: { autorange: 'reversed' }, margin: { l: 190 }, shapes: [0, 1].map((x) => ({ type: 'line', x0: x, x1: x, yref: 'paper', y0: 0, y1: 1, line: { color: '#c2410c', dash: 'dash' } })) }} notes="Dashed: θ = 0 (O₂ fraction) and θ = 1 (partial pressure). The pure-N₂ interval is too wide to identify θ. Intervals treat rows as independent." source="analytics.json, theta" />
          <ChartCard title="Leave-one-out error by scaling model" sub="Lower is better. Droplet extinction diameter, log scale." data={models.map((m, i) => ({ type: 'bar', name: m, x: gateFuels, y: gateFuels.map((k) => c.gate.fuels[k].loo_rmse[m]), marker: { color: OKABE[i] } }))} layout={{ barmode: 'group', yaxis: { title: 'LOO RMSE of ln(D)' } }} notes="The O₂-fraction-only and ppO₂-only models are indistinguishable by prediction error; the bootstrap, not the error, rejects ppO₂-only." source="analytics.json, scaling_gate" />
        </div>
        <div className="callout"><b>Reading this honestly</b>{honest}</div>
      </>}
      {tab === 'lit' && <div className="grid g2">
        <ChartCard title="Investigation periods" sub="As listed on each PSI record" data={[{ type: 'bar', orientation: 'h', y: c.timeline.map((t) => `${t.id} ${t.name}`), base: c.timeline.map((t) => t.a), x: c.timeline.map((t) => Math.max(1, t.b - t.a)), marker: { color: c.timeline.map((t) => pillarColor(t.pillar)) } }]} layout={{ xaxis: { title: 'Year', range: c.yearRange }, margin: { l: 200 }, yaxis: { autorange: 'reversed' } }} size="tall" source="data/investigations.json" />
        <div className="grid">
          <ChartCard size="short" title="NTRS reports in the corpus by year" data={[{ type: 'bar', x: c.litYears.map((y) => y[0]), y: c.litYears.map((y) => y[1]), marker: { color: OKABE[0] } }]} layout={{ yaxis: { title: 'Reports' } }} source="public/data/literature.json" />
          <ChartCard size="short" title="Topics across the corpus" data={[{ type: 'bar', orientation: 'h', y: c.topics.map((t) => t[0]).reverse(), x: c.topics.map((t) => t[1]).reverse(), marker: { color: OKABE[4] } }]} layout={{ margin: { l: 140 } }} source="public/data/literature.json" />
        </div>
      </div>}
    </>
  )
}
