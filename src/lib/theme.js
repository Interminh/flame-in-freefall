import { useEffect, useState } from 'react'

export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('fa-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') } catch { return 'light' }
  })
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem('fa-theme', theme) } catch { /* storage unavailable */ }
    window.dispatchEvent(new Event('fa-theme'))
  }, [theme])
  return [theme, () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))]
}

export function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

// Okabe-Ito categorical palette (colour-blind safe).
export const OKABE = ['#0072B2', '#D55E00', '#009E73', '#CC79A7', '#E69F00', '#56B4E9', '#F0E442', '#000000']
export const OUTCOME_COLORS = {
  flame: '#D55E00', no_flame: '#0072B2', burned_out: '#7A7F88', unknown: '#BDBDBD',
  ignited: '#D55E00', extinguished: '#0072B2', no_ignition: '#56B4E9',
}
