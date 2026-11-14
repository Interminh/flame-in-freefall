// Shared nav, injected into <div id="nav"> so it is written once.
const links = [
  { href: 'index.html', label: 'Summary' },
  { href: 'ranking.html', label: 'Ranking' },
  { href: 'novelty.html', label: 'Novelty' },
  { href: 'presentation.html', label: 'Presentation' },
  { href: 'sources.html', label: 'Sources' },
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
      <li><a href="index.html#edge">Our edge</a></li>
    </ul>
  </nav>
</header>`
