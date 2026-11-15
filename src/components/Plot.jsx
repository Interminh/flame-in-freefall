import { useEffect, useRef, useState } from 'react'
import { cssVar } from '../lib/theme.js'

let plotlyPromise
const getPlotly = () => (plotlyPromise ||= import('plotly.js-dist-min').then((m) => m.default || m))

function baseLayout() {
  const ink = cssVar('--ink-2') || '#454b55', grid = cssVar('--line') || '#e2dfd6'
  return {
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'IBM Plex Sans Condensed, Arial Narrow, system-ui, sans-serif', size: 12, color: ink },
    margin: { l: 56, r: 18, t: 34, b: 48 },
    xaxis: { gridcolor: grid, zerolinecolor: grid, linecolor: grid, automargin: true },
    yaxis: { gridcolor: grid, zerolinecolor: grid, linecolor: grid, automargin: true },
    legend: { orientation: 'h', x: 0, y: 1.02, yanchor: 'bottom', font: { size: 11 } },
    hoverlabel: { font: { family: 'IBM Plex Mono, monospace', size: 11 } },
  }
}

function merge(a, b) {
  const out = { ...a }
  for (const k of Object.keys(b || {})) {
    out[k] = a[k] && typeof a[k] === 'object' && !Array.isArray(a[k]) && typeof b[k] === 'object' && !Array.isArray(b[k]) ? merge(a[k], b[k]) : b[k]
  }
  return out
}

export default function Plot({ data, layout, onClick, name = 'chart', height }) {
  const ref = useRef(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const h = () => setTick((t) => t + 1)
    window.addEventListener('fa-theme', h)
    return () => window.removeEventListener('fa-theme', h)
  }, [])
  useEffect(() => {
    let alive = true
    let ro
    getPlotly().then((Plotly) => {
      if (!alive || !ref.current) return
      const lay = merge(baseLayout(), layout || {})
      if (height) lay.height = height
      Plotly.react(ref.current, data, lay, { responsive: true, displaylogo: false, toImageButtonOptions: { format: 'png', filename: name, scale: 3 }, modeBarButtonsToRemove: ['lasso2d', 'select2d'] })
      if (onClick && ref.current.removeAllListeners) { ref.current.removeAllListeners('plotly_click'); ref.current.on('plotly_click', onClick) }
      ro = new ResizeObserver(() => ref.current && Plotly.Plots.resize(ref.current))
      ro.observe(ref.current)
    })
    return () => { alive = false; ro && ro.disconnect() }
  }, [data, layout, tick, height, name, onClick])
  useEffect(() => () => { const el = ref.current; getPlotly().then((P) => el && P.purge(el)) }, [])
  return <div ref={ref} className="plot" />
}
