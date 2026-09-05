import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import OfflineBanner from './OfflineBanner'
import UpdatePrompt from './UpdatePrompt'
import InstallPrompt from './InstallPrompt'

const TABS = [
  { to: '/', label: 'Dashboard', icon: '◧' },
  { to: '/transactions', label: 'Transactions', icon: '☰' },
  { to: '/budgets', label: 'Budgets', icon: '◑' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

export default function Layout() {
  const { user, logOut } = useAuth()
  const { error, dismissError } = useData()

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-hairline bg-plane px-4 py-3">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-lg">📊</span>
          <span className="text-sm font-semibold text-ink">Expense Tracker</span>
        </div>
        <div className="flex items-center gap-2">
          {user?.photoURL && (
            <img
              src={user.photoURL}
              alt=""
              referrerPolicy="no-referrer"
              className="h-7 w-7 rounded-full border border-hairline"
            />
          )}
          <button
            type="button"
            onClick={logOut}
            className="rounded-md border border-hairline px-2.5 py-1 text-xs font-medium text-ink-2 hover:bg-wash"
          >
            Sign out
          </button>
        </div>
      </header>

      <OfflineBanner />

      {error && (
        <div
          role="alert"
          className="flex items-start justify-between gap-3 border-b px-4 py-2 text-xs"
          style={{ background: 'var(--wash)', color: 'var(--status-critical)', borderColor: 'var(--border)' }}
        >
          <span>{error}</span>
          <button type="button" onClick={dismissError} aria-label="Dismiss" className="shrink-0">
            ✕
          </button>
        </div>
      )}

      {/* Bottom padding clears the fixed tab bar. */}
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      <InstallPrompt />
      <UpdatePrompt />

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-hairline bg-surface"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <ul className="mx-auto flex w-full max-w-3xl">
          {TABS.map((t) => (
            <li key={t.to} className="flex-1">
              <NavLink
                to={t.to}
                end={t.to === '/'}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                    isActive ? 'text-series' : 'text-muted'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span aria-hidden="true" className="text-base leading-none">
                      {t.icon}
                    </span>
                    <span>{t.label}</span>
                    {/* Active tab is marked by weight and an underline too, so
                        it never rests on color alone. */}
                    <span
                      aria-hidden="true"
                      className="h-0.5 w-5 rounded-full"
                      style={{ background: isActive ? 'var(--series-1)' : 'transparent' }}
                    />
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  )
}
