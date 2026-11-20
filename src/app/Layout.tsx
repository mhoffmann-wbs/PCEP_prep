import { NavLink, Outlet } from 'react-router'
import { PE1_URL } from '../content/blueprint'

const NAV = [
  { to: '/learn', label: 'Learn' },
  { to: '/check', label: 'Check' },
  { to: '/do', label: 'Do' },
]

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <header className="border-b border-slate-200">
        <nav className="mx-auto flex max-w-4xl items-center gap-6 px-4 py-3">
          <NavLink to="/" className="font-bold">
            PCEP101
          </NavLink>
          {NAV.map(({ to, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? 'font-semibold text-blue-700' : 'text-slate-600')}>
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 px-4 py-4 text-center text-sm text-slate-500">
        <p>Not affiliated with or endorsed by the Python Institute. PCEP is a trademark of the Python Institute.</p>
        <p>
          Free extra course: <a className="underline" href={PE1_URL}>Python Essentials 1</a>
        </p>
      </footer>
    </div>
  )
}
