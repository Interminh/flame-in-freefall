import { useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Nav from './Nav.jsx'

// Scroll to the hash target, or to the top on a plain page change.
function useScrollOnNavigate() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])
}

export default function Layout() {
  useScrollOnNavigate()
  return (
    <>
      <Nav />
      <main className="page">
        <Outlet />
      </main>
    </>
  )
}
