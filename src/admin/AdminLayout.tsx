import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { useAuth } from './auth/AuthProvider'

const links = [
  { to: '/', label: 'Pasangan', end: true },
  { to: '/backup', label: 'Cadangan', end: false },
]

/** Header, preview-phase banner and page outlet for every logged-in page. */
export function AdminLayout() {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function onLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  const navLinks = links.map((l) => (
    <NavLink
      key={l.to}
      to={l.to}
      end={l.end}
      onClick={() => setMenuOpen(false)}
      className={({ isActive }) =>
        `inline-flex min-h-11 items-center rounded-full px-4 font-bold ${
          isActive ? 'bg-highlight text-highlight-text' : 'text-muted hover:bg-surface-alt'
        }`
      }
    >
      {l.label}
    </NavLink>
  ))

  return (
    <div className="min-h-dvh bg-bg">
      <header className="sticky top-0 z-40 border-b border-accent/30 bg-surface/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2">
          <NavLink to="/" className="font-script text-3xl text-text">
            Undangan
          </NavLink>
          <span className="hidden text-xs font-bold tracking-wide text-muted uppercase sm:inline">
            Admin
          </span>
          <nav aria-label="Menu admin" className="ml-auto hidden items-center gap-1 md:flex">
            {navLinks}
          </nav>
          <span className="hidden max-w-48 truncate text-sm text-muted lg:inline">
            {session?.email}
          </span>
          <button
            type="button"
            className="btn-outline hidden px-4 py-1 text-sm md:inline-flex"
            onClick={onLogout}
          >
            Keluar
          </button>
          <button
            type="button"
            className="btn-outline ml-auto px-3 py-1 text-sm md:hidden"
            aria-expanded={menuOpen}
            aria-controls="admin-mobile-menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            Menu
          </button>
        </div>
        {menuOpen && (
          <nav
            id="admin-mobile-menu"
            aria-label="Menu admin"
            className="flex flex-col gap-1 border-t border-accent/20 px-4 py-2 md:hidden"
          >
            {navLinks}
            <button type="button" className="btn-outline mt-1" onClick={onLogout}>
              Keluar
            </button>
          </nav>
        )}
      </header>

      <div role="note" className="bg-highlight px-4 py-2 text-center text-sm text-highlight-text">
        <strong>Mode pratinjau:</strong> data hanya tersimpan di browser ini dan belum tampil di
        website publik. Rutin unduh cadangan.
      </div>

      <main className="mx-auto max-w-6xl px-4 py-6 md:py-8">
        <Outlet />
      </main>
    </div>
  )
}
