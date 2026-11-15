// TEMPORARY theme lab for tuning the neo-brutalist style. Not part of the product.
// To remove it: delete this file and the "theme-lab.js" loader at the end of js/nav.js.
// It only sets CSS custom properties on <html>, so nothing else needs to change.
// Choices are kept in this browser's localStorage so they survive page changes. Nothing is sent anywhere.
(() => {
  const KEY = 'theme-lab-v1'

  // Colour palettes. --blue and --amber carry cream text, keep them dark in light palettes.
  const P = (name, paper, surface, ink, muted, rule, blue, amber, yellow, sky, pink, extra = {}) =>
    ({ name, vars: { paper, surface, ink, muted, rule, blue, amber, yellow, sky, pink }, extra })

  const PALETTES = [
    P('Cream', '#FFF9E0', '#FFFFFF', '#111111', '#4A4638', '#D9D1AC', '#C73512', '#1B5FA8', '#FFE04A', '#9EE3FF', '#F7B2DA'),
    P('Mint', '#E6F7EA', '#FFFFFF', '#0F1A14', '#3B4A41', '#BFDCC8', '#C2290F', '#1B5FA8', '#FFD84A', '#8FD3FF', '#FF9EC4'),
    P('Lilac', '#EFE9FF', '#FFFFFF', '#15101F', '#4B4560', '#CFC4EE', '#B3261E', '#3A4FC4', '#FFE45E', '#A8E6FF', '#FFB3E6'),
    P('Peach', '#FFE9DC', '#FFFAF5', '#1A0F0A', '#5A4337', '#EBC9B5', '#B7260E', '#165E8C', '#FFC93C', '#8EDCE6', '#FF9AA2'),
    P('Ocean', '#DFF3FA', '#FFFFFF', '#08202B', '#35505C', '#B3D8E5', '#C2410C', '#0B5EA8', '#FFD23F', '#5CC8FF', '#FFA8C8'),
    P('Concrete', '#E8E8E6', '#FFFFFF', '#101010', '#444444', '#C4C4C0', '#D13A12', '#1D4ED8', '#FF9F1C', '#7CC4FF', '#FF7AA2'),
    P('Mono', '#F4F4F0', '#FFFFFF', '#000000', '#3A3A3A', '#CCCCCC', '#D0021B', '#0033A0', '#FFE600', '#DADADA', '#FFFFFF'),
    P('Night', '#14110F', '#211C19', '#FFF3DC', '#BDB29C', '#3A322C', '#FF7A59', '#5CB8FF', '#FFD23F', '#4CC3FF', '#FF7EB6',
      { '--hl-yellow': 'rgba(255, 210, 63, 0.4)', '--hl-pink': 'rgba(255, 126, 182, 0.4)', '--scrim': 'rgba(0, 0, 0, 0.7)' }),
    P('Midnight', '#0E1630', '#16224A', '#F2F5FF', '#AAB6DA', '#2B3A70', '#FF8A5C', '#6CC4FF', '#FFE066', '#6FD3FF', '#FF8FC7',
      { '--hl-yellow': 'rgba(255, 224, 102, 0.4)', '--hl-pink': 'rgba(255, 143, 199, 0.4)', '--scrim': 'rgba(0, 0, 0, 0.7)' }),
  ]

  const BORDERS = { Thin: '1px', Normal: '2px', Bold: '3px', Heavy: '4px' }
  // Shadow offsets: large, medium, small, extra small, dialog
  const SHADOWS = {
    None: [0, 0, 0, 0, 0],
    Soft: [3, 2, 2, 1, 5],
    Hard: [6, 4, 3, 2, 10],
    Chunky: [10, 7, 5, 3, 14],
  }
  const CORNERS = { Square: ['0', '0'], Default: ['6px', '0'], Soft: ['10px', '12px'], Round: ['24px', '24px'] }
  const BODY = {
    Itim: "'Itim', 'Segoe UI', system-ui, sans-serif",
    Plex: "'IBM Plex Sans Condensed', 'Arial Narrow', sans-serif",
    Newsreader: "'Newsreader', Georgia, serif",
    Mono: "'JetBrains Mono', ui-monospace, Consolas, monospace",
  }
  const HEAD = {
    Grandstander: "'Grandstander', 'Itim', system-ui, sans-serif",
    Plex: "'IBM Plex Sans Condensed', 'Arial Narrow', sans-serif",
    Newsreader: "'Newsreader', Georgia, serif",
    Mono: "'JetBrains Mono', ui-monospace, Consolas, monospace",
  }

  const DEFAULTS = { palette: 'Cream', border: 'Normal', shadow: 'Hard', corners: 'Default', body: 'Itim', head: 'Grandstander' }

  let state = { ...DEFAULTS }
  try { Object.assign(state, JSON.parse(localStorage.getItem(KEY) || '{}')) } catch { /* private mode: run without saving */ }

  // A link like ?palette=Night&shadow=Chunky&open=1 sets a look directly, handy for sharing one.
  const qs = new URLSearchParams(location.search)
  for (const k of Object.keys(DEFAULTS)) if (qs.has(k)) state[k] = qs.get(k)

  const root = document.documentElement
  const ALL_PROPS = new Set()
  const setVar = (k, v) => { root.style.setProperty(k, v); ALL_PROPS.add(k) }

  function apply() {
    for (const k of ALL_PROPS) root.style.removeProperty(k)
    const pal = PALETTES.find((p) => p.name === state.palette) || PALETTES[0]
    for (const [k, v] of Object.entries(pal.vars)) setVar(`--${k}`, v)
    for (const [k, v] of Object.entries(pal.extra)) setVar(k, v)
    // Dark palettes keep dark text on accent fills, cream text on the red and blue fills becomes the page colour.
    setVar('--bw', BORDERS[state.border] || '2px')
    const [l, m, s, xs, d] = SHADOWS[state.shadow] || SHADOWS.Hard
    setVar('--so', `${l}px`); setVar('--so-m', `${m}px`); setVar('--so-s', `${s}px`); setVar('--so-xs', `${xs}px`); setVar('--so-l', `${d}px`)
    const [rc, rk] = CORNERS[state.corners] || CORNERS.Default
    setVar('--radius-control', rc); setVar('--radius-card', rk)
    setVar('--font-read', BODY[state.body] || BODY.Itim)
    setVar('--font-display', HEAD[state.head] || HEAD.Grandstander)
    try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* ignore */ }
    refresh()
  }

  // The panel carries its own fixed colours so it stays readable in every palette.
  const css = `
  .tl, .tl * { box-sizing: border-box; font-family: 'JetBrains Mono', ui-monospace, Consolas, monospace; letter-spacing: 0; }
  .tl { position: fixed; top: 96px; right: 0; z-index: 9999; display: flex; align-items: flex-start; font-size: 12px; line-height: 1.4; color: #111; }
  .tl__tab { writing-mode: vertical-rl; padding: 12px 6px; background: #FFE04A; color: #111; border: 2px solid #111; border-right: 0; font-weight: 500; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; cursor: pointer; box-shadow: none; border-radius: 0; }
  .tl__panel { display: none; width: 268px; max-height: calc(100vh - 120px); overflow-y: auto; background: #fff; border: 2px solid #111; border-right: 0; padding: 12px; }
  .tl[data-open='true'] .tl__panel { display: block; }
  .tl h2 { all: unset; display: block; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; margin: 0 0 2px; color: #111; }
  .tl__note { margin: 0 0 12px; color: #555; font-size: 11px; max-width: none; }
  .tl h3 { all: unset; display: block; margin: 12px 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #555; }
  .tl__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .tl__opt { all: unset; box-sizing: border-box; display: block; padding: 5px 6px; border: 2px solid #111; background: #fff; color: #111; cursor: pointer; font-size: 11px; text-align: left; }
  .tl__opt:hover { background: #F2F2F2; }
  .tl__opt[aria-pressed='true'] { background: #111; color: #fff; }
  .tl__opt:focus-visible, .tl__tab:focus-visible { outline: 3px solid #1B5FA8; outline-offset: 2px; }
  .tl__sw { display: flex; margin-top: 4px; height: 10px; border: 1px solid currentColor; }
  .tl__sw i { flex: 1; }
  .tl__row { display: flex; gap: 6px; margin-top: 12px; }
  .tl__row .tl__opt { flex: 1; text-align: center; background: #FFE04A; color: #111; }
  .tl__out { display: none; width: 100%; margin-top: 8px; height: 110px; font-size: 11px; border: 2px solid #111; padding: 4px; color: #111; background: #fff; }
  @media (max-width: 720px) { .tl { top: auto; bottom: 12px; } .tl__panel { max-height: 60vh; } }
  `

  const style = document.createElement('style')
  style.textContent = css
  document.head.append(style)

  const wrap = document.createElement('aside')
  wrap.className = 'tl'
  wrap.dataset.open = 'false'
  wrap.setAttribute('aria-label', 'Temporary theme lab')

  const tab = Object.assign(document.createElement('button'), { type: 'button', className: 'tl__tab', textContent: 'Themes' })
  tab.setAttribute('aria-expanded', 'false')
  tab.addEventListener('click', () => {
    const open = wrap.dataset.open !== 'true'
    wrap.dataset.open = String(open)
    tab.setAttribute('aria-expanded', String(open))
  })

  const panel = document.createElement('div')
  panel.className = 'tl__panel'
  panel.innerHTML = '<h2>Theme lab</h2><p class="tl__note">Temporary. Saved in this browser only.</p>'

  const groups = []
  function group(title, key, options, swatches) {
    const h = document.createElement('h3'); h.textContent = title
    const g = document.createElement('div'); g.className = 'tl__grid'
    for (const name of options) {
      const b = Object.assign(document.createElement('button'), { type: 'button', className: 'tl__opt' })
      b.append(name)
      if (swatches) {
        const sw = document.createElement('span'); sw.className = 'tl__sw'
        const pal = PALETTES.find((p) => p.name === name)
        for (const c of ['paper', 'yellow', 'sky', 'pink', 'blue']) {
          const i = document.createElement('i'); i.style.background = pal.vars[c]; sw.append(i)
        }
        b.append(sw)
      }
      b.addEventListener('click', () => { state[key] = name; apply() })
      g.append(b)
      groups.push({ b, key, name })
    }
    panel.append(h, g)
  }

  group('Palette', 'palette', PALETTES.map((p) => p.name), true)
  group('Borders', 'border', Object.keys(BORDERS))
  group('Shadows', 'shadow', Object.keys(SHADOWS))
  group('Corners', 'corners', Object.keys(CORNERS))
  group('Heading font', 'head', Object.keys(HEAD))
  group('Body font', 'body', Object.keys(BODY))

  const out = Object.assign(document.createElement('textarea'), { className: 'tl__out', readOnly: true })
  const row = document.createElement('div'); row.className = 'tl__row'
  const mk = (label, fn) => {
    const b = Object.assign(document.createElement('button'), { type: 'button', className: 'tl__opt', textContent: label })
    b.addEventListener('click', fn); return b
  }
  row.append(
    mk('Random', () => {
      const pick = (o) => o[Math.floor(Math.random() * o.length)]
      state = { palette: pick(PALETTES).name, border: pick(Object.keys(BORDERS)), shadow: pick(Object.keys(SHADOWS)),
        corners: pick(Object.keys(CORNERS)), head: pick(Object.keys(HEAD)), body: pick(Object.keys(BODY)) }
      apply()
    }),
    mk('Reset', () => { state = { ...DEFAULTS }; apply() }),
    mk('Copy', () => {
      const text = JSON.stringify(state, null, 2)
      out.value = text; out.style.display = 'block'; out.select()
      if (navigator.clipboard) navigator.clipboard.writeText(text).catch(() => {})
    }),
  )
  panel.append(row, out)

  function refresh() {
    for (const { b, key, name } of groups) b.setAttribute('aria-pressed', String(state[key] === name))
    if (out.style.display === 'block') out.value = JSON.stringify(state, null, 2)
  }

  wrap.append(tab, panel)
  if (qs.get('open') === '1') { wrap.dataset.open = 'true'; tab.setAttribute('aria-expanded', 'true') }
  document.body.append(wrap)
  apply()
})()
