// Site settings, applied before first paint so there is no flash.
// Everything is saved in this browser only (localStorage). Nothing is sent anywhere.
// The settings drawer in js/settings.js reads and writes through window.sitePrefs.
(() => {
  const KEY = 'site-settings'
  const DEFAULTS = { mode: 'system', size: '100', contrast: 'standard', motion: 'system', links: 'default', font: 'default' }
  const root = document.documentElement
  const dark = matchMedia('(prefers-color-scheme: dark)')

  let state = { ...DEFAULTS }
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    if (saved) Object.assign(state, saved)
    else {
      // Carry over the earlier light and dark choice if there is one.
      const old = localStorage.getItem('mode')
      if (old === 'light' || old === 'dark') state.mode = old
    }
  } catch { /* storage blocked: use defaults */ }

  // A link like ?mode=dark overrides the saved choice, handy for checking or sharing one mode.
  try {
    const q = new URLSearchParams(location.search).get('mode')
    if (q === 'light' || q === 'dark' || q === 'system') state.mode = q
  } catch { /* ignore */ }

  const setAttr = (name, on, value) => (on ? root.setAttribute(name, value) : root.removeAttribute(name))

  function apply() {
    root.dataset.mode = state.mode === 'system' ? (dark.matches ? 'dark' : 'light') : state.mode
    setAttr('data-contrast', state.contrast === 'high', 'high')
    setAttr('data-motion', state.motion === 'reduce', 'reduce')
    setAttr('data-links', state.links === 'underline', 'underline')
    setAttr('data-font', state.font === 'plain', 'plain')
    // Browser-style zoom, so every size on the page scales together.
    if (state.size === '100') root.style.removeProperty('zoom')
    else root.style.zoom = String(Number(state.size) / 100)
  }

  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ } }

  dark.addEventListener('change', () => { if (state.mode === 'system') apply() })

  window.sitePrefs = {
    defaults: DEFAULTS,
    get: () => ({ ...state }),
    set(key, value) { state[key] = value; save(); apply() },
    reset() { state = { ...DEFAULTS }; save(); apply() },
  }
  apply()
})()
