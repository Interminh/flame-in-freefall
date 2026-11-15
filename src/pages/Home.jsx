import { Link } from 'react-router-dom'
import { getAnalytics, getInvestigations, getLiterature, PILLARS } from '../lib/data.js'
import { thetaStar, effectiveO2, THETA_SOURCES } from '../lib/scaling.js'
import { fmt } from '../lib/stats.js'
import { Stat, useAsync, Loading } from '../components/ui.jsx'

const TILES = [
  ['/atlas', 'Flammability Atlas', 'Place any atmosphere on the map of everything NASA tested; see the verdict and how it depends on pressure scaling.'],
  ['/investigations', 'Investigations', 'All 24 PSI investigations with datasheets, auto-generated chart suites and linked reports.'],
  ['/analytics', 'Analytics', 'Cross-dataset coverage, outcomes, scaling-exponent estimates and literature statistics.'],
  ['/studio', 'Research Studio', 'Turn a question into a cited brief with OpenAlex, Crossref, Zenodo and arXiv context.'],
  ['/models', 'Models', 'The PMMA and SIBAL screening model, with its validation stated first.'],
  ['/literature', 'Literature', 'Passage-level search over NASA technical reports.'],
]

export default function Home() {
  const st = useAsync(() => Promise.all([getAnalytics(), getInvestigations(), getLiterature()]))
  if (st.loading) return <Loading />
  const [an, invs, lit] = st.data
  const f = an.facts, s = THETA_SOURCES(an), [lo, hi] = s.flex.ci
  const cabin = an.scenarios.moon_cabin_10p2psi
  const ts = thetaStar(cabin.o2_percent, cabin.pressure_kpa, 20.9)
  return (
    <>
      <section className="hero">
        <div>
          <div className="eyebrow mono" style={{ color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.1em', fontSize: '.75rem', marginBottom: 10 }}>NASA Space Apps 2026 · Flame in Freefall</div>
          <h1>A <em>30% oxygen</em> Moon cabin matches Earth air only if partial pressure alone governs flammability.</h1>
          <p className="lede">Flame Atlas reads all {invs.length} NASA PSI microgravity combustion investigations and {lit.length} NASA technical reports together, maps what has and has not been tested, and shows how the safety verdict depends on one unresolved quantity: how oxygen scales with pressure. The data that exist point away from partial-pressure-only scaling, but only for liquid droplets; for solids nobody has tested.</p>
          <div className="row"><Link to="/atlas" className="btn primary">Open the Atlas</Link><button className="btn" onClick={() => window.faAsk('What do we know about flame extinction at reduced pressure?')}>Ask the corpus</button></div>
        </div>
        <div className="card">
          <h3>The finding in three lines</h3>
          <ul className="clean">
            <li><b>Gap.</b> Of {f.solid_rows} solid-fuel rows, {f.solid_rows_at_or_above_24pct_o2} reach 24% O₂; the maximum is {fmt(f.solid_max_o2_percent, 1)}%. The {f.cabin_box_rows} rows in the cabin box are all droplets with {f.cabin_box_with_outcome} outcomes.</li>
            <li><b>Sensitivity.</b> The cabin ({cabin.o2_percent}% at {cabin.pressure_kpa} kPa) matches Earth air only if θ = {fmt(ts, 2)}, i.e. only if partial pressure alone governs. Across the FLEX range θ ∈ [{fmt(lo, 2)}, {fmt(hi, 2)}], effective O₂ is {fmt(effectiveO2(cabin.o2_percent, cabin.pressure_kpa, hi), 1)}% to {fmt(effectiveO2(cabin.o2_percent, cabin.pressure_kpa, lo), 1)}% against 20.9%. <span className="chip interp">interpretation</span></li>
            <li><b>Caveat.</b> That range comes from liquid droplets. Extending it to solids is an assumption, and the experiment that tests it has not been run.</li>
          </ul>
        </div>
      </section>
      <div className="grid g4" style={{ margin: '12px 0 30px' }}>
        <Stat k="Investigations" v={invs.length} n="NASA PSI, CC0" />
        <Stat k="Test rows" v={f.rows_total.toLocaleString()} n={`${f.rows_with_o2_and_pressure} with O₂ and pressure`} />
        <Stat k="Report pages indexed" v="3,681" n={`${lit.length} NTRS records`} />
        <Stat k="Series points" v="60,369" n="PSI-47, 117, 142" />
      </div>
      <div className="grid g3">{TILES.map(([to, t, d]) => <Link key={to} to={to} className="card" style={{ color: 'inherit', textDecoration: 'none' }}><h3>{t}</h3><p className="small" style={{ color: 'var(--ink-2)', marginBottom: 0 }}>{d}</p></Link>)}</div>
      <h2 style={{ marginTop: 34 }}>Three pillars of spacecraft fire safety</h2>
      <div className="grid g3">{['prevention', 'detection', 'suppression'].map((k) => <div className="card" key={k} style={{ borderTop: `3px solid ${PILLARS[k].color}` }}><h3>{PILLARS[k].label}</h3><p className="small">{PILLARS[k].blurb}</p><Link to="/investigations">{invs.filter((i) => i.pillar === k).length} investigations</Link></div>)}</div>
    </>
  )
}
