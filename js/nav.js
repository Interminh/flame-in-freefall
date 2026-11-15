// Shared nav, injected into <div id="nav"> so it is written once.
const links = [
  { href: 'index.html', label: 'Overview' },
  { href: 'investigations.html', label: 'Investigations' },
  { href: 'simulation.html', label: 'Simulation' },
  { href: 'ai.html', label: 'Ignis AI' },
  { href: 'presentation.html', label: 'Presentation' },
  { href: 'sources.html', label: 'Our sources' },
]

const here = location.pathname.split('/').pop() || 'index.html'

const items = links
  .map(({ href, label }) => {
    const current = href === here ? ' aria-current="page"' : ''
    return `<li><a href="${href}"${current}>${label}</a></li>`
  })
  .join('')

const gear = '<svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'

document.getElementById('nav').outerHTML = `
<div class="util">
  <div class="util__inner">
    <span class="util__label">NASA Space Apps 2026 · Flame in Freefall</span>
    <span class="util__right">
      <button type="button" class="util__btn" data-open-settings aria-haspopup="dialog">${gear}Settings</button>
      <a class="util__cta" href="investigations.html">Browse investigations</a>
    </span>
  </div>
</div>
<header class="site-nav">
  <nav class="site-nav__inner" aria-label="Main">
    <a href="index.html" class="site-nav__brand"><img src="img/starburst.svg" alt="" width="40" height="40" />Ignis-0G</a>
    <ul class="site-nav__links">
      ${items}
    </ul>
  </nav>
</header>`;

// The settings drawer loads after the nav so it can bind to the Settings button.
document.body.append(Object.assign(document.createElement('script'), { src: 'js/settings.js' }))
