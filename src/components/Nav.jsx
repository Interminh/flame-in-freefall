import { NavLink, Link } from 'react-router-dom'

const links = [
  { to: '/', label: 'Summary', end: true },
  { to: '/ranking', label: 'Ranking' },
  { to: '/novelty', label: 'Novelty' },
  { to: '/presentation', label: 'Presentation' },
  { to: '/sources', label: 'Sources' },
]

export default function Nav() {
  return (
    <header className="site-nav">
      <nav className="site-nav__inner" aria-label="Main">
        <Link to="/" className="site-nav__brand">Flame in freefall</Link>
        <ul className="site-nav__links">
          {links.map(({ to, label, end }) => (
            <li key={to}>
              <NavLink to={to} end={end}>{label}</NavLink>
            </li>
          ))}
          <li><Link to="/#edge">Our edge</Link></li>
        </ul>
      </nav>
    </header>
  )
}
