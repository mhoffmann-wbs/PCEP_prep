import { Suspense, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router'

const NAV = [
  { to: '/learn', label: 'Learn' },
  { to: '/practice', label: 'Practice' },
  { to: '/questions', label: 'Questions' },
  { to: '/mock', label: 'Mock exam' },
  { to: '/exercises', label: 'Exercises' },
  { to: '/playground', label: 'Playground' },
  { to: '/progress', label: 'Progress' },
  { to: '/guides/cheat-sheet', label: 'Cheat sheet' },
  { to: '/guides/exam-day', label: 'Exam day' },
]

export function Layout() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="flex min-h-screen flex-col bg-page text-slate-900">
      <header className="bg-header text-chalk print:hidden">
        <nav aria-label="Main" className="mx-auto max-w-5xl px-4 py-3 sm:flex sm:flex-wrap sm:items-center sm:gap-x-6 sm:gap-y-2">
          <div className="flex items-center justify-between">
            <Link to="/" onClick={() => setMenuOpen(false)} className="text-lg font-bold tracking-tight">
              PCEP<span className="text-accent">101</span>
            </Link>
            {/* Phones get a menu button instead of three rows of links. */}
            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="main-links"
              onClick={() => setMenuOpen((open) => !open)}
              className="rounded border border-chalk/40 px-3 py-1 text-sm sm:hidden"
            >
              {menuOpen ? 'Close' : 'Menu'}
            </button>
          </div>
          <ul id="main-links" className={`${menuOpen ? 'mt-3 grid grid-cols-2 gap-2' : 'hidden'} sm:contents`}>
            {NAV.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) => `block py-1 sm:py-0 ${isActive ? 'font-semibold underline underline-offset-4' : 'text-chalk/80'}`}
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <Suspense fallback={<p className="text-slate-500">Loading…</p>}>
          <Outlet />
        </Suspense>
      </main>
      <footer className="border-t border-slate-200 px-4 py-4 text-center text-sm text-slate-500 print:hidden">
        <p>Not affiliated with or endorsed by the Python Institute. PCEP is a trademark of the Python Institute.</p>
        <p>
          Free extra course:{' '}
          <a className="underline" href="https://edube.org/study/pe1">
            Python Essentials 1
          </a>
        </p>
      </footer>
    </div>
  )
}
