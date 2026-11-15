import { Suspense, lazy, useState, useEffect } from 'react'
import { NavLink, Route, Routes, Link, useLocation } from 'react-router-dom'
import { useTheme } from './lib/theme.js'
import AskDrawer from './components/AskDrawer.jsx'
import { Loading } from './components/ui.jsx'

const Home = lazy(() => import('./pages/Home.jsx'))
const Explore = lazy(() => import('./pages/Explore.jsx'))
const Guide = lazy(() => import('./pages/Guide.jsx'))
const Atlas = lazy(() => import('./pages/Atlas.jsx'))
const Investigations = lazy(() => import('./pages/Investigations.jsx'))
const Datasheet = lazy(() => import('./pages/Datasheet.jsx'))
const Analytics = lazy(() => import('./pages/Analytics.jsx'))
const Compare = lazy(() => import('./pages/Compare.jsx'))
const Models = lazy(() => import('./pages/Models.jsx'))
const Literature = lazy(() => import('./pages/Literature.jsx'))
const Studio = lazy(() => import('./pages/Studio.jsx'))
const Data = lazy(() => import('./pages/Data.jsx'))
const Method = lazy(() => import('./pages/Method.jsx'))

const NAV = [['/explore', 'Explore'], ['/investigations', 'Datasets'], ['/analytics', 'Analytics'], ['/compare', 'Compare'], ['/literature', 'Literature'], ['/guide', 'Guide']]
const TOOLS = [['/atlas', 'Flammability Atlas', 'Place an atmosphere on the map of everything tested'], ['/models', 'Models', 'Screening model with its validation'], ['/studio', 'Research Studio', 'Turn a question into a cited brief']]

export default function App() {
  const [theme, toggle] = useTheme()
  const [ask, setAsk] = useState({ open: false, seed: '' })
  const loc = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [loc.pathname])
  useEffect(() => {
    window.faAsk = (q) => setAsk({ open: true, seed: q || '', n: Date.now() })
    const k = (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setAsk((a) => ({ ...a, open: !a.open })) } }
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [])
  return (
    <>
      <header className="topbar"><div className="topbar-in">
        <Link to="/" className="brand">Flame in freefall</Link>
        <nav className="nav">
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>Ignis AI</NavLink>
          {NAV.map(([to, l]) => <NavLink key={to} to={to} className={({ isActive }) => (isActive || (to === '/investigations' && loc.pathname.startsWith('/i/') ? true : false) ? 'active' : '')}>{l}</NavLink>)}
          <details className={`menu ${TOOLS.some(([to]) => loc.pathname.startsWith(to)) ? 'on' : ''}`} key={loc.pathname}>
            <summary>Tools</summary>
            <div className="pop">{TOOLS.map(([to, l, d]) => <Link key={to} to={to}>{l}<small className="muted">{d}</small></Link>)}</div>
          </details>
        </nav>
        <div className="tools">
          {loc.pathname !== '/' && <button className="btn primary" onClick={() => setAsk((a) => ({ ...a, open: true }))}>Ask Ignis <span className="kbd" style={{ color: 'inherit', background: 'transparent', borderColor: 'rgba(255,255,255,.5)' }}>⌘K</span></button>}
          <button className="btn" onClick={toggle} aria-label="Toggle theme">{theme === 'dark' ? 'Light' : 'Dark'}</button>
        </div>
      </div></header>
      <main className="page">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/guide" element={<Guide />} />
            <Route path="/atlas" element={<Atlas />} />
            <Route path="/investigations" element={<Investigations />} />
            <Route path="/i/:id" element={<Datasheet />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/models" element={<Models />} />
            <Route path="/literature" element={<Literature />} />
            <Route path="/studio" element={<Studio />} />
            <Route path="/data" element={<Data />} />
            <Route path="/method" element={<Method />} />
            <Route path="*" element={<div className="card">Page not found.</div>} />
          </Routes>
        </Suspense>
      </main>
      <footer className="footer">Flame in Freefall, NASA Space Apps 2026. <Link to="/data">Data</Link> · <Link to="/method">Method</Link> · <a href="https://github.com/Interminh/flame-in-freefall/blob/main/SOURCES.md" target="_blank" rel="noreferrer">Sources</a>. Data: NASA Physical Sciences Informatics (CC0) and NASA NTRS. Derived values are labelled; nothing here is flight-certified.</footer>
      <AskDrawer open={ask.open} seed={ask.seed} nonce={ask.n} onClose={() => setAsk((a) => ({ ...a, open: false }))} />
    </>
  )
}
