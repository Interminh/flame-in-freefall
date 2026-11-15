import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { getTests, pillarColor, PILLARS } from '../lib/data.js'
import { scenariosFrom, presetsFrom, earthAirFrom, THETA_SOURCES, P_REF, effectiveO2, ppO2, thetaStar, probBeats, verdict } from '../lib/scaling.js'
import { entropy, fmt } from '../lib/stats.js'
import { ChartCard, Interp, PageHead, useAsync, Loading, Stat } from '../components/ui.jsx'
import { useAtlas } from '../lib/useAtlas.js'

const KIND = { robust: 'Robust to the scaling assumption', depends: 'Depends on the scaling assumption', contested: 'Contested by the data', outside: 'Outside the tested range' }

function Field({ label, value, children }) {
  return <div className="field"><label>{label} {value != null && <span className="val">{value}</span>}</label>{children}</div>
}

export default function Atlas() {
  const A = useAtlas()
  const T = useAsync(() => getTests())
  if (A.loading || T.loading) return <Loading />
  if (A.error || T.error) return <div className="callout bad">Could not load data.</div>
  return <AtlasView {...A} tests={T.data} />
}

function AtlasView({ meta, analytics, tests }) {
  const [sp, setSp] = useSearchParams()
  const scenarios = useMemo(() => scenariosFrom(meta), [meta])
  const presets = useMemo(() => presetsFrom(meta), [meta])
  const earth = earthAirFrom(meta)
  const srcs = useMemo(() => THETA_SOURCES(analytics), [analytics])
  const def = scenarios.find((s) => s.id === 'moon_cabin_10p2psi') || scenarios[1]
  const x = +(sp.get('x') ?? def.x), p = +(sp.get('p') ?? def.p)
  const lid = sp.get('ref') ?? 'earth_air', src = sp.get('th') ?? meta.theta_default_source
  const customL = +(sp.get('L') ?? earth.x), cLo = +(sp.get('lo') ?? 0), cHi = +(sp.get('hi') ?? 1)
  const set = (o) => { const n = new URLSearchParams(sp); for (const [k, v] of Object.entries(o)) n.set(k, v); setSp(n, { replace: true }) }
  const [copied, setCopied] = useState('')

  const preset = presets.find((l) => l.id === lid) || presets[0]
  const L = lid === 'custom' ? customL : preset.L
  const [lo, hi] = src === 'custom' ? [cLo, cHi] : src === 'full' ? [0, 1] : srcs[src].ci
  const lo0 = Math.max(0, lo)
  const refLabel = lid === 'earth_air' ? 'Earth air' : lid === 'custom' ? `a ${fmt(L, 1)}% O₂ threshold` : preset.label.replace(/ \(.*\)$/, '')
  const v = useMemo(() => verdict(x, p, L, lo0, hi, refLabel), [x, p, L, lo0, hi, refLabel])
  const f = analytics.facts
  const scenId = scenarios.find((s) => Math.abs(s.x - x) < 1e-9 && Math.abs(s.p - p) < 1e-9)?.id || 'custom'

  const axis = useMemo(() => {
    const o = tests.filter((t) => t.o2_percent != null && t.pressure_kpa != null).map((t) => t.o2_percent).sort((a, b) => a - b)
    const q99 = o[Math.floor(0.99 * (o.length - 1))]
    const px = tests.filter((t) => t.pressure_kpa > 0).map((t) => t.pressure_kpa).sort((m, n) => m - n)
    const q97 = px[Math.floor(0.97 * (px.length - 1))]
    const xmax = Math.ceil((q99 + 2) / 5) * 5
    const ymin = Math.floor((Math.min(...scenarios.map((s) => s.p), ...px.filter((v) => v > 30)) - 5) / 10) * 10
    return { x: [Math.floor(Math.min(...o) / 5) * 5, xmax], y: [Math.max(0, ymin), Math.ceil((Math.max(q97, P_REF) + 5) / 10) * 10] }
  }, [tests, scenarios])
  const inWin = (s) => s.x <= axis.x[1] && s.x >= axis.x[0] && s.p >= axis.y[0] && s.p <= axis.y[1]
  const hidden = scenarios.filter((s) => !inWin(s))
  const offWin = useMemo(() => tests.filter((t) => t.o2_percent != null && t.pressure_kpa != null && (t.o2_percent > axis.x[1] || t.pressure_kpa > axis.y[1] || t.pressure_kpa < axis.y[0])).length, [tests, axis])
  const heat = useMemo(() => {
    const xs = [], ps = []
    for (let a = axis.x[0]; a <= axis.x[1]; a += 1) xs.push(a)
    for (let b = axis.y[0]; b <= axis.y[1]; b += 1.5) ps.push(b)
    return { xs, ps, z: ps.map((pp) => xs.map((xx) => probBeats(xx, pp, L, lo0, hi))) }
  }, [axis, L, lo0, hi])

  const ranking = useMemo(() => {
    const R = meta.ranking
    const rows = tests.filter((t) => meta.solid_experiments.includes(t.experiment) && t.o2_percent != null && t.pressure_kpa != null)
    const cand = []
    for (let a = R.o2_range[0]; a <= R.o2_range[1]; a += R.o2_range[2]) for (let b = R.pressure_range_kpa[0]; b <= R.pressure_range_kpa[1]; b += R.pressure_range_kpa[2]) cand.push([a, b])
    for (const s of scenarios) if (s.id !== 'earth_air') cand.push([s.x, s.p])
    return cand.map(([a, b]) => {
      const pb = probBeats(a, b, L, lo0, hi)
      const near = rows.filter((t) => Math.abs(t.o2_percent - a) <= R.near_o2_percent && Math.abs(t.pressure_kpa - b) <= R.near_pressure_kpa).length
      return { x: a, p: b, pb, h: entropy(pb), ts: thetaStar(a, b, L), near }
    }).sort((m, n) => Math.round(n.h * 10) - Math.round(m.h * 10) || m.near - n.near || n.h - m.h).slice(0, 6)
  }, [tests, meta, scenarios, L, lo0, hi])

  const box = meta.cabin_box
  const pillarTraces = Object.keys(PILLARS).map((k) => {
    const rows = tests.filter((t) => t.pillar === k && t.o2_percent != null && t.pressure_kpa != null)
    return { type: 'scatter', mode: 'markers', name: `${PILLARS[k].label} (${rows.length})`, x: rows.map((t) => t.o2_percent), y: rows.map((t) => t.pressure_kpa),
      text: rows.map((t) => `${t.psi_id} ${t.experiment || ''}<br>${t.fuel || t.material || ''}<br>outcome: ${t.outcome_class}`), hovertemplate: '%{text}<br>O₂ %{x}%  p %{y} kPa<extra></extra>',
      marker: { color: pillarColor(k), size: 7, opacity: 0.9, line: { width: 0.6, color: '#ffffff' } } }
  })
  const heatmap = { type: 'heatmap', x: heat.xs, y: heat.ps, z: heat.z, zmin: 0, zmax: 1, colorscale: [[0, '#8fb8d8'], [0.5, '#f4f1e8'], [1, '#e8a77a']], colorbar: { title: { text: 'P(more flammable)', side: 'right' }, thickness: 10, len: 0.6 }, hovertemplate: 'O₂ %{x}%  p %{y} kPa<br>P = %{z:.2f}<extra>interpretation</extra>', opacity: 0.55 }
  const starTrace = { type: 'scatter', mode: 'markers+text', name: 'Scenarios', x: scenarios.filter(inWin).map((s) => s.x), y: scenarios.filter(inWin).map((s) => s.p), text: scenarios.filter(inWin).map((s) => s.short), textposition: scenarios.filter(inWin).map((_, i) => (i % 2 ? 'bottom right' : 'top right')), textfont: { size: 11 }, marker: { symbol: 'star', size: 13, color: '#15181d', line: { color: '#fff', width: 1 } }, hovertemplate: '%{text}<extra></extra>' }
  const you = { type: 'scatter', mode: 'markers', name: 'Selected', x: [x], y: [p], marker: { symbol: 'diamond', size: 16, color: '#fff', line: { color: '#c2410c', width: 3 } }, hovertemplate: 'Selected: %{x}% at %{y} kPa<extra></extra>' }
  const boxShape = { type: 'rect', x0: box.o2_min_percent, x1: axis.x[1], y0: axis.y[0], y1: box.pressure_max_kpa, line: { color: '#15181d', width: 1.5, dash: 'dot' }, fillcolor: 'rgba(0,0,0,0)' }
  const thetas = Array.from({ length: 51 }, (_, i) => i / 50)
  const curves = scenarios.filter((s) => s.id !== 'earth_air').map((s, i) => ({ type: 'scatter', mode: 'lines', name: s.short, x: thetas, y: thetas.map((t) => effectiveO2(s.x, s.p, t)), line: { color: ['#D55E00', '#0072B2', '#009E73', '#CC79A7'][i % 4], width: 2 } }))

  const caption = () => {
    const t = src === 'custom' || src === 'full' ? 'a user-chosen range' : `${srcs[src].label}, n = ${srcs[src].n}`
    const txt = `Atmosphere: ${x}% O2 at ${p} kPa (O2 partial pressure ${fmt(ppO2(x, p), 2)} kPa). Reference: ${refLabel}, threshold ${fmt(L, 2)}% O2${preset.cite ? ` (${preset.src}, ${preset.cite})` : ''}. Effective O2 = x (p / ${P_REF})^theta, with theta in [${fmt(lo0, 3)}, ${fmt(hi, 3)}] from ${t}; break-even theta* = ${v.ts == null ? 'n/a' : fmt(v.ts, 3)}. Effective O2 spans ${fmt(Math.min(v.eLo, v.eHi), 2)} to ${fmt(Math.max(v.eLo, v.eHi), 2)}%. Verdict: ${KIND[v.kind]}. theta is estimated from liquid-droplet extinction data; applying it to solid fuels is an assumption. Data: ${f.rows_with_o2_and_pressure} of ${f.rows_total} NASA PSI rows report O2 and pressure. Flame Atlas, ${window.location.origin}${window.location.pathname}${window.location.search}`
    navigator.clipboard?.writeText(txt).then(() => { setCopied('caption'); setTimeout(() => setCopied(''), 1600) })
  }
  const share = () => navigator.clipboard?.writeText(window.location.href).then(() => { setCopied('link'); setTimeout(() => setCopied(''), 1600) })

  return (
    <>
      <PageHead eyebrow="Flagship" title="Flammability Atlas" lede="Where an atmosphere sits relative to everything NASA has tested, and how much the verdict depends on how oxygen scales with pressure." />
      <div className="split">
        <aside className="card flat panel">
          <h4>Atmosphere</h4>
          <Field label="Scenario"><select value={scenId} onChange={(e) => { const s = scenarios.find((q) => q.id === e.target.value); if (s) set({ x: s.x, p: s.p }) }}>{scenarios.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}<option value="custom" disabled>Custom</option></select></Field>
          <Field label="O₂ fraction" value={`${x}%`}><input type="range" min={axis.x[0]} max={Math.max(axis.x[1], ...scenarios.map((q) => q.x))} step="0.5" value={x} onChange={(e) => set({ x: e.target.value })} /></Field>
          <Field label="Total pressure" value={`${p} kPa · ${(p * 0.145038).toFixed(1)} psi`}><input type="range" min={Math.min(axis.y[0], ...scenarios.map((q) => q.p))} max={axis.y[1]} step="0.5" value={p} onChange={(e) => set({ p: e.target.value })} /></Field>
          <h4 style={{ marginTop: 18 }}>Question</h4>
          <Field label="Is it more flammable than"><select value={lid} onChange={(e) => set({ ref: e.target.value })}>{presets.map((l) => <option key={l.id} value={l.id}>{l.label}</option>)}</select></Field>
          {lid === 'custom' && <Field label="Threshold O₂" value={`${fmt(customL, 1)}%`}><input type="range" min="5" max="30" step="0.1" value={customL} onChange={(e) => set({ L: e.target.value })} /></Field>}
          {preset.cite && <p className="small">Source: <a href={preset.cite} target="_blank" rel="noreferrer">{preset.src}</a></p>}
          <h4 style={{ marginTop: 18 }}>Pressure scaling θ</h4>
          <Field label="Range of θ">
            <select value={src} onChange={(e) => set({ th: e.target.value })}>
              {Object.entries(srcs).map(([k, s]) => <option key={k} value={k}>{s.label}: {fmt(s.ci[0], 2)} to {fmt(s.ci[1], 2)}</option>)}
              <option value="full">Unconstrained: 0 to 1</option><option value="custom">Custom range</option>
            </select>
          </Field>
          {src === 'custom' && <div className="row"><input type="number" step="0.05" min="0" max="1" value={cLo} onChange={(e) => set({ lo: e.target.value })} /><input type="number" step="0.05" min="0" max="1" value={cHi} onChange={(e) => set({ hi: e.target.value })} /></div>}
          <p className="small">θ = 0: only the O₂ fraction matters. θ = 1: only the O₂ partial pressure matters. Effective O₂ = x (p / {P_REF})<sup>θ</sup>.</p>
        </aside>

        <div className="stack">
          <div className={`verdict ${v.kind}`}>
            <div className="row spread"><span className="label">{KIND[v.kind]}</span><Interp /></div>
            <div className="headline">{v.head}</div>
            <div className="kv">
              <div><span>O₂ partial pressure</span><b className="num">{fmt(ppO2(x, p), 1)} kPa</b><small>Earth air {fmt(ppO2(earth.x, earth.p), 1)} kPa</small></div>
              <div><span>Effective O₂ across θ range</span><b className="num">{fmt(Math.min(v.eLo, v.eHi), 1)}–{fmt(Math.max(v.eLo, v.eHi), 1)}%</b><small>threshold {fmt(L, 1)}%</small></div>
              <div><span>Break-even θ*</span><b className="num">{v.ts == null ? 'n/a' : fmt(v.ts, 2)}</b><small>{v.ts == null ? '' : `flips ${p < P_REF ? 'above' : 'below'} this value`}</small></div>
              <div><span>θ range used</span><b className="num">{fmt(lo0, 2)}–{fmt(hi, 2)}</b><small>{src === 'full' ? 'unconstrained' : src === 'custom' ? 'custom' : `n = ${srcs[src].n}, droplets`}</small></div>
            </div>
          </div>

          <div className="grid g3">
            <Stat k="Solid-fuel rows ≥ 24% O₂" v={f.solid_rows_at_or_above_24pct_o2} n={`of ${f.solid_rows}; maximum ${fmt(f.solid_max_o2_percent, 1)}%`} />
            <Stat k="Cabin-box rows" v={f.cabin_box_rows} n={`all ${f.cabin_box_experiments.join(', ')} droplets; ${f.cabin_box_with_outcome} outcomes`} />
            <Stat k="Rows with O₂ and pressure" v={f.rows_with_o2_and_pressure.toLocaleString()} n={`of ${f.rows_total.toLocaleString()} test rows`} />
          </div>

          <ChartCard size="tall" title="Every tested condition against the question" sub="Shading is an interpretation: θ treated as uniform over the chosen range. Hover a point for its test."
            data={[heatmap, ...pillarTraces, starTrace, you]} layout={{ xaxis: { title: 'O₂ mole fraction (%)', range: axis.x }, yaxis: { title: 'Total pressure (kPa)', range: axis.y }, shapes: [boxShape], margin: { l: 60, r: 10, t: 40, b: 50 } }}
            notes={`Dotted box: cabin box, O₂ of at least ${box.o2_min_percent}% at ${box.pressure_max_kpa} kPa or less.${hidden.length ? ` Scenarios outside the window: ${hidden.map((h) => h.short).join(', ')}.` : ''}${offWin ? ` ${offWin} test rows lie outside the plotted window.` : ''}`} source="NASA PSI tables (public/data/tests.json)" />

          <div className="grid g2">
            <ChartCard title="Effective O₂ against θ" sub="A scenario crosses the threshold at its break-even θ*" data={[...curves, { type: 'scatter', mode: 'lines', name: `Threshold ${fmt(L, 1)}%`, x: [0, 1], y: [L, L], line: { color: '#15181d', dash: 'dash', width: 1.5 } }]}
              layout={{ xaxis: { title: 'θ', range: [0, 1] }, yaxis: { title: 'Effective O₂ (%)', type: 'log' }, shapes: [{ type: 'rect', xref: 'x', yref: 'paper', x0: lo0, x1: hi, y0: 0, y1: 1, fillcolor: 'rgba(194,65,12,0.10)', line: { width: 0 } }] }} notes="Shaded: θ range in use." />
            <div className="card flat">
              <div className="card-head"><h4>Experiments worth running</h4><Interp /></div>
              <p className="small">Candidates where the verdict is least certain (highest entropy of P), then where the fewest solid-fuel tests exist within ±{meta.ranking.near_o2_percent}% O₂ and ±{meta.ranking.near_pressure_kpa} kPa.</p>
              <div className="tbl-wrap flush"><table><thead><tr><th>O₂ %</th><th>p kPa</th><th>θ*</th><th>H bits</th><th>Solid tests nearby</th></tr></thead>
                <tbody>{ranking.map((r, i) => <tr key={i}><td className="n">{r.x}</td><td className="n">{r.p}</td><td className="n">{r.ts == null ? '–' : fmt(r.ts, 2)}</td><td className="n">{fmt(r.h, 2)}</td><td className="n">{r.near}</td></tr>)}</tbody></table></div>
              {ranking.every((r) => r.h < 0.05) && <p className="small">At this threshold the verdict does not depend on θ anywhere in the candidate grid, so no run is discriminating.</p>}
            </div>
          </div>

          <div className="row">
            <button className="btn" onClick={caption}>{copied === 'caption' ? 'Copied' : 'Copy methods caption'}</button>
            <button className="btn" onClick={share}>{copied === 'link' ? 'Copied' : 'Copy link to this view'}</button>
            <Link className="btn primary" to="/studio">Turn this into a proposal</Link>
          </div>
        </div>
      </div>
    </>
  )
}
