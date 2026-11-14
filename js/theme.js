// Applies the saved theme before first paint. Storage can throw, so guard it.
try {
  const saved = localStorage.getItem('theme')
  if (saved) document.documentElement.dataset.theme = saved
} catch {}
