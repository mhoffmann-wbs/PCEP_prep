import { Suspense } from 'react'
import { Link, NavLink, Outlet } from 'react-router'

const NAV = [
  { to: '/learn', label: 'Learn' },
  { to: '/practice', label: 'Practice' },
  { to: '/questions', label: 'Questions' },
  { to: '/mock', label: 'Mock exam' },
  { to: '/playground', label: 'Playground' },
  { to: '/progress', label: 'Progress' },
]

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-page text-slate-900">
      <header className="bg-header text-chalk print:hidden">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
          <Link to="/" className="text-lg font-bold tracking-tight">
            PCEP<span className="text-accent">101</span>
          </Link>
          {NAV.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'font-semibold underline underline-offset-4' : 'text-chalk/80')}>
              {label}
            </NavLink>
          ))}
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
