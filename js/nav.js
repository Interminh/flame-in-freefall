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

const picker = document.createElement('select')
picker.className = 'theme-picker'
picker.setAttribute('aria-label', 'Theme')
picker.innerHTML = `
  <option value="lab">Lab sheet</option>
  <option value="apple">Apple</option>
  <option value="anthropic">Anthropic</option>
  <option value="tech">Tech</option>`
picker.value = document.documentElement.dataset.theme
picker.addEventListener('change', () => {
  const v = picker.value
  document.documentElement.dataset.theme = v
  try { localStorage.setItem('theme', v) } catch {}
})
document.querySelector('.site-nav__inner').appendChild(picker)
