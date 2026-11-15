// Applies the saved light or dark choice before the page paints, so there is no flash.
// With no saved choice the system setting decides (see brutal.css).
// A link like ?mode=dark overrides both, handy for checking or sharing one mode.
try {
  const q = new URLSearchParams(location.search).get('mode')
  const m = q || localStorage.getItem('mode')
  if (m === 'light' || m === 'dark') document.documentElement.dataset.mode = m
} catch { /* storage blocked: follow the system setting */ }
