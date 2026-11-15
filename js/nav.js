// Shared nav, injected into <div id="nav"> so it is written once.
const links = [
  { href: 'index.html', label: 'Overview' },
  { href: 'ranking.html', label: 'List of investigations' },
  { href: 'simulation.html', label: 'Simulation' },
  { href: 'ai.html', label: 'Ignis AI' },
  { href: 'presentation.html', label: 'Presentation' },
  { href: 'sources.html', label: 'Our sources' },
  { href: 'novelty.html', label: 'Novelty' },
]

const here = location.pathname.split('/').pop() || 'index.html'

const items = links
  .map(({ href, label }) => {
    const current = href === here ? ' aria-current="page"' : ''
    return `<li><a href="${href}"${current}>${label}</a></li>`
  })
  .join('')

document.getElementById('nav').outerHTML = `
<header class="site-nav">
  <nav class="site-nav__inner" aria-label="Main">
    <a href="index.html" class="site-nav__brand">Flame in freefall</a>
    <ul class="site-nav__links">
      ${items}
    </ul>
  </nav>
</header>`
