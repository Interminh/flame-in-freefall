// Applies the saved theme before first paint. Storage can throw, so guard it.
let theme = 'anthropic'
try {
  theme = localStorage.getItem('theme') || theme
} catch {}
document.documentElement.dataset.theme = theme
