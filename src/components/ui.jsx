import { useState, useEffect } from 'react'
import Plot from './Plot.jsx'
import { PILLARS } from '../lib/data.js'

export function ChartCard({ title, sub, data, layout, notes, source, size, onClick, name, children }) {
  return (
    <section className={`chart-card ${size || ''}`}>
      <header><h4>{title}</h4>{sub && <div className="sub">{sub}</div>}</header>
      <Plot data={data} layout={layout} onClick={onClick} name={name || title.replace(/\W+/g, '_').toLowerCase()} />
      {children}
      {(notes || source) && <footer>{notes && <span>{notes}</span>}{source && <span>Source: {source}</span>}</footer>}
    </section>
  )
}
export const Stat = ({ k, v, n }) => (<div className="card stat"><div className="k">{k}</div><div className="v">{v}</div>{n && <div className="n">{n}</div>}</div>)
export const PillarChip = ({ pillar }) => <span className={`chip ${pillar}`}>{(PILLARS[pillar] || PILLARS.context).label}</span>
export const Interp = () => <span className="chip interp" title="A judgement drawn from the data, not a measured value">interpretation</span>
export const Loading = () => <div className="skeleton" style={{ minHeight: 240 }} />
export function Tabs({ tabs, value, onChange }) {
  return <div className="tabs" role="tablist">{tabs.map((t) => <button key={t.id} role="tab" aria-selected={value === t.id} className={value === t.id ? 'active' : ''} onClick={() => onChange(t.id)}>{t.label}</button>)}</div>
}
export function PageHead({ eyebrow, title, lede, children }) {
  return <div className="page-head">{eyebrow && <div className="eyebrow">{eyebrow}</div>}<h1>{title}</h1>{lede && <p className="lede">{lede}</p>}{children}</div>
}
export function useAsync(fn, deps = []) {
  const [s, setS] = useState({ loading: true })
  useEffect(() => {
    let ok = true
    setS({ loading: true })
    fn().then((d) => ok && setS({ data: d }), (e) => ok && setS({ error: e }))
    return () => { ok = false }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  return s
}
