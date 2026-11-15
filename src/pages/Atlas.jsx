import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAnalytics, getTests, pillarColor, PILLARS } from '../lib/data.js'
import { SCENARIOS, LOC_PRESETS, THETA_SOURCES, EARTH_AIR, P_REF, effectiveO2, ppO2, thetaStar, probBeats, verdict } from '../lib/scaling.js'
import { entropy, fmt } from '../lib/stats.js'
import { ChartCard, Interp, PageHead, useAsync, Loading } from '../components/ui.jsx'

const VERDICT_LABEL = { robust: 'Robust to the scaling assumption', depends: 'Assumption-dependent', contested: 'Contested by the data', outside: 'Outside the tested range' }

function Field({ label, value, children }) {
  return <div className="field"><label>{label} {value != null && <span className="val">{value}</span>}</label>{children}</div>
}

export default function Atlas() {
  const state = useAsync(() => Promise.all([getAnalytics(), getTests()]))
  const [sid, setSid] = useState('moon_cabin_10p2psi')
  const [x, setX] = useState(30)
  const [p, setP] = useState(70.33)
  const [src, setSrc] = useState('flex')
  const [custom, setCustom] = useState([0.05, 0.63])
  const [lid, setLid] = useState('earth_air')
  const [customL, setCustomL] = useState(18)

  const ready = state.data
  const analytics = ready?.[0], tests = ready?.[1]
  const srcs = useMemo(() => (analytics ? THETA_SOURCES(analytics) : null), [analytics])
  const [lo, hi] = useMemo(() => {
    if (!srcs) return [0, 1]
    if (src === 'custom') return custom
    if (src === 'full') return [0, 1]
    return srcs[src].ci
  }, [src, srcs, custom])
  const preset = LOC_PRESETS.find((l) => l.id === lid)
  const L = lid === 'custom' ? customL : preset.L
  const refLabel = lid === 'earth_air' ? 'Earth air' : lid === 'custom' ? `a ${L}% O₂ threshold` : preset.label.split(' (')[0]

  const v = useMemo(() => verdict(x, p, L, Math.max(0, lo), hi, refLabel), [x, p, L, lo, hi, refLabel])

  const heat = useMemo(() => {
    const xs = [], ps = []
    for (let a = 10; a <= 100; a += 1) xs.push(a)
    for (let b = 20; b <= 110; b += 1.5) ps.push(b)
    return { xs, ps, z: ps.map((pp) => xs.map((xx) => probBeats(xx, pp, L, Math.max(0, lo), hi))) }
  }, [L, lo, hi])

  const ranking = useMemo(() => {
    if (!tests) return []
    const cand = []
    for (let a = 24; a <= 40; a += 2) for (let b = 50; b <= 76; b += 2) cand.push([a, b])
    cand.push([100, 29.65], [100, 34.5], [34, 56.54], [30, 70.33], [26.5, 70.33])
    const SOLID = ['BASS', 'BASS-II', 'SAFFIRE-I', 'SAFFIRE-II', 'SAFFIRE-III']
    const rows = tests.filter((t) => SOLID.includes(t.experiment) && t.o2_percent != null && t.pressure_kpa != null)
    return cand.map(([a, b]) => {
      const pb = probBeats(a, b, L, Math.max(0, lo), hi)
      const near = rows.filter((t) => Math.abs(t.o2_percent - a) <= 3 && Math.abs(t.pressure_kpa - b) <= 8).length
      return { x: a, p: b, pb, h: entropy(pb), ts: thetaStar(a, b, L), near }
    }).sort((m, n) => Math.round(n.h * 10) - Math.round(m.h * 10) || m.near - n.near || n.h - m.h).slice(0, 8)
  }, [tests, L, lo, hi])

  if (state.loading) return <Loading />
  if (state.error) return <div className="callout bad">Could not load data: {String(state.error.message || state.error)}</div>
  const facts = analytics.facts

  const byPillar = Object.keys(PILLARS).map((k) => {
    const rows = tests.filter((t) => t.pillar === k && t.o2_percent != null && t.pressure_kpa != null)
    return { type: 'scatter', mode: 'markers', name: `${PILLARS[k].label} (${rows.length})`, x: rows.map((t) => t.o2_percent), y: rows.map((t) => t.pressure_kpa),
      text: rows.map((t) => `${t.psi_id} ${t.experiment || ''}<br>${t.fuel || t.material || ''}<br>outcome: ${t.outcome_class}`), hovertemplate: '%{text}<br>O₂ %{x}%  p %{y} kPa<extra></extra>',
      marker: { color: pillarColor(k), size: 7, opacity: 0.9, line: { width: 0.6, color: '#ffffff' } } }
  })
  const heatmap = { type: 'heatmap', x: heat.xs, y: heat.ps, z: heat.z, zmin: 0, zmax: 1, colorscale: [[0, '#8fb8d8'], [0.5, '#f4f1e8'], [1, '#e8a77a']], colorbar: { title: { text: 'P(more flammable)', side: 'right' }, thickness: 12, len: 0.7 }, hovertemplate: 'O₂ %{x}%  p %{y} kPa<br>P = %{z:.2f}<extra>Interpretation</extra>', opacity: 0.55 }
  const scen = { type: 'scatter', mode: 'markers+text', name: 'Scenarios', x: SCENARIOS.map((s) => s.x), y: SCENARIOS.map((s) => s.p), text: SCENARIOS.map((s) => s.short), textposition: 'top right', textfont: { size: 11 }, marker: { symbol: 'star', size: 13, color: '#15181d', line: { color: '#fff', width: 1 } }, hovertemplate: '%{text}<extra></extra>' }
  const you = { type: 'scatter', mode: 'markers', name: 'Selected', x: [x], y: [p], marker: { symbol: 'diamond', size: 16, color: '#fff', line: { color: '#c2410c', width: 3 } }, hovertemplate: 'Selected: %{x}% at %{y} kPa<extra></extra>' }
  const boxShape = { type: 'rect', x0: 26, x1: 100, y0: 20, y1: 75, line: { color: '#15181d', width: 1.5, dash: 'dot' }, fillcolor: 'rgba(0,0,0,0)' }

  const thetas = Array.from({ length: 51 }, (_, i) => i / 50)
  const curve = (sx, sp, name, color) => ({ type: 'scatter', mode: 'lines', name, x: thetas, y: thetas.map((t) => effectiveO2(sx, sp, t)), line: { color, width: 2 } })

  const pick = (id) => { const s = SCENARIOS.find((q) => q.id === id); setSid(id); if (s) { setX(s.x); setP(s.p) } }

  return (
    <>
      <PageHead eyebrow="Flagship" title="Flammability Atlas" lede="Where is the lunar cabin atmosphere, in oxygen and pressure, relative to everything NASA has actually tested, and how much does the answer depend on how oxygen scales with pressure?" />
      <div className="split">
        <aside className="card" style={{ position: 'sticky', top: 72 }}>
          <h3>Atmosphere</h3>
          <Field label="Scenario"><select value={sid} onChange={(e) => pick(e.target.value)}>{SCENARIOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}<option value="custom">Custom</option></select></Field>
          <Field label="O₂ fraction" value={`${x}%`}><input type="range" min="10" max="100" step="0.5" value={x} onChange={(e) => { setX(+e.target.value); setSid('custom') }} /></Field>
          <Field label="Total pressure" value={`${p} kPa (${(p * 0.145038).toFixed(1)} psi)`}><input type="range" min="20" max="110" step="0.5" value={p} onChange={(e) => { setP(+e.target.value); setSid('custom') }} /></Field>
          <Field label="Compare against"><select value={lid} onChange={(e) => setLid(e.target.value)}>{LOC_PRESETS.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select></Field>
          {lid === 'custom' && <Field label="Threshold O₂" value={`${customL}%`}><input type="range" min="10" max="30" step="0.1" value={customL} onChange={(e) => setCustomL(+e.target.value)} /></Field>}
          {preset.cite && <p className="small">Threshold source: <a href={preset.cite} target="_blank" rel="noreferrer">{preset.src}</a></p>}
          <h3 style={{ marginTop: 18 }}>Scaling exponent &theta;</h3>
          <Field label="Data-informed range">
            <select value={src} onChange={(e) => setSrc(e.target.value)}>
              {Object.entries(srcs).map(([k, s]) => <option key={k} value={k}>{s.label}: {fmt(s.ci[0], 2)} to {fmt(s.ci[1], 2)}</option>)}
              <option value="full">Unconstrained: 0 to 1</option><option value="custom">Custom range</option>
            </select>
          </Field>
          {src === 'custom' && <div className="row"><input type="number" step="0.05" min="0" max="1" value={custom[0]} onChange={(e) => setCustom([+e.target.value, custom[1]])} /><input type="number" step="0.05" min="0" max="1" value={custom[1]} onChange={(e) => setCustom([custom[0], +e.target.value])} /></div>}
          <p className="small">&theta; = 0: only the O&#8322; fraction matters. &theta; = 1: only the O&#8322; partial pressure matters. Effective O&#8322; = x (p / {P_REF})<sup>&theta;</sup>.</p>
        </aside>

        <div className="grid">
          <div className={`verdict ${v.kind}`}>
            <div className="label">{VERDICT_LABEL[v.kind]} <Interp /></div>
            <div className="headline">{v.head}</div>
            <p style={{ marginBottom: 6 }}>At {x}% O&#8322; and {p} kPa the O&#8322; partial pressure is <b className="num">{fmt(ppO2(x, p), 1)} kPa</b> against {fmt(ppO2(EARTH_AIR.x, P_REF), 1)} kPa in Earth air. Effective O&#8322; relative to the {fmt(L, 1)}% threshold ranges from <b className="num">{fmt(Math.min(v.eLo, v.eHi), 1)}%</b> to <b className="num">{fmt(Math.max(v.eLo, v.eHi), 1)}%</b> across &theta; in [{fmt(Math.max(0, lo), 2)}, {fmt(hi, 2)}]; at &theta; = 0 it is {fmt(v.e0, 1)}% and at &theta; = 1 it is {fmt(v.e1, 1)}%.</p>
            <p className="small" style={{ marginBottom: 4 }}>θ range source: liquid-droplet extinction data. Applying it to solid fuels is an assumption.</p>
            {v.ts != null && <p className="small" style={{ marginBottom: 0 }}>Break-even &theta;* = <b className="num">{fmt(v.ts, 3)}</b>. The atmosphere is {p < P_REF ? 'more' : 'less'} flammable than the threshold when &theta; is {p < P_REF ? 'below' : 'above'} this value.{v.survivesOnlyAtPpo2 ? '' : ''}</p>}
          </div>

          <div className="callout"><b>Why this matters</b>
            The solid-fuel experiments in the repository span {fmt(facts.solid_pressure_min_kpa, 1)} to {fmt(facts.solid_pressure_max_kpa, 1)} kPa and reach {fmt(facts.solid_max_o2_percent, 1)}% O&#8322;; {facts.solid_rows_at_or_above_24pct_o2} of {facts.solid_rows} solid-fuel rows sit at or above 24% O&#8322;. The cabin box (O&#8322; of at least 26% at 75 kPa or less) holds {facts.cabin_box_rows} rows, all {facts.cabin_box_experiments.join(', ')} droplet tests, with {facts.cabin_box_with_outcome} recorded outcomes. Any statement about solid materials in the lunar cabin is an extrapolation.</div>

          <ChartCard size="tall" title="Every tested condition, and the probability the selected threshold is beaten" sub={`${facts.rows_with_o2_and_pressure.toLocaleString()} of ${facts.rows_total.toLocaleString()} rows report both O₂ and pressure. Shading is an interpretation: θ treated as uniform over the chosen range.`}
            data={[heatmap, ...byPillar, scen, you]} layout={{ xaxis: { title: 'O₂ mole fraction (%)', range: [10, 100] }, yaxis: { title: 'Total pressure (kPa)', range: [20, 110] }, shapes: [boxShape], margin: { l: 60, r: 10, t: 10, b: 60 } }}
            notes="Dotted box: lunar-cabin box (O₂ of at least 26%, pressure of at most 75 kPa)." source="PSI-10 through PSI-159 tables, data/combined.csv; scenarios from the challenge brief and PSI-20" />

          <div className="grid g2">
            <ChartCard title="Effective O&#8322; versus &theta;" sub="Where each scenario crosses the threshold is its break-even &theta;*"
              data={[...SCENARIOS.filter((s) => s.id !== 'earth_air').map((s, i) => curve(s.x, s.p, s.short, ['#D55E00', '#0072B2', '#009E73', '#CC79A7'][i % 4])),
                { type: 'scatter', mode: 'lines', name: `Threshold ${fmt(L, 1)}%`, x: [0, 1], y: [L, L], line: { color: '#15181d', dash: 'dash', width: 1.5 } }]}
              layout={{ xaxis: { title: 'θ', range: [0, 1] }, yaxis: { title: 'Effective O₂ (%)', type: 'log' }, shapes: [{ type: 'rect', xref: 'x', yref: 'paper', x0: Math.max(0, lo), x1: hi, y0: 0, y1: 1, fillcolor: 'rgba(194,65,12,0.10)', line: { width: 0 } }] }}
              notes="Shaded: data-informed θ range." source="Atlas scaling framework, analytics.json" />
            <div className="card">
              <div className="card-head"><h3>Experiments worth running next</h3><Interp /></div>
              <p className="small">Candidate conditions ranked by the entropy of P(more flammable), the most informative first, then by how few solid-fuel tests (BASS, BASS-II, SAFFIRE) lie within &plusmn;3% O&#8322; and &plusmn;8 kPa.</p>
              {v.kind === 'robust' && ranking.every((r) => r.h < 0.05) && <p className="callout neutral">At this threshold the answer does not depend on &theta; anywhere in the candidate box, so no experiment is discriminating.</p>}
              <div className="tbl-wrap"><table><thead><tr><th>O&#8322; %</th><th>p kPa</th><th>&theta;*</th><th>P</th><th>H (bits)</th><th>Solid tests nearby</th></tr></thead>
                <tbody>{ranking.map((r, i) => <tr key={i}><td className="n">{r.x}</td><td className="n">{r.p}</td><td className="n">{r.ts == null ? '-' : fmt(r.ts, 2)}</td><td className="n">{fmt(r.pb, 2)}</td><td className="n">{fmt(r.h, 2)}</td><td className="n">{r.near}</td></tr>)}</tbody></table></div>
              <p className="small" style={{ marginTop: 8 }}>Ranking is a design heuristic, not a flight test plan. Pure-N&#8322; FLEX cannot identify &theta;, so only a solid-fuel run at these points would settle it. <Link to="/studio">Turn this into a research proposal</Link>.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
