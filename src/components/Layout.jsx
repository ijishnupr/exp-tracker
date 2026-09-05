import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useSwipeNav } from '../lib/useSwipeNav'
import OfflineBanner from './OfflineBanner'
import UpdatePrompt from './UpdatePrompt'
import InstallPrompt from './InstallPrompt'

const TABS = [
  { to: '/', label: 'Dashboard', icon: '◧' },
  { to: '/transactions', label: 'Transactions', icon: '☰' },
  { to: '/budgets', label: 'Budgets', icon: '◑' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

const indexOfPath = (pathname) => {
  const i = TABS.findIndex((t) => (t.to === '/' ? pathname === '/' : pathname.startsWith(t.to)))
  return i === -1 ? 0 : i
}

export default function Layout() {
  const { user, logOut } = useAuth()
  const { error, dismissError } = useData()
  const navigate = useNavigate()
  const location = useLocation()

  const index = indexOfPath(location.pathname)
  // Which way the next page should slide in from. Kept in state rather than
  // derived, because the direction belongs to the transition, not the route.
  const [direction, setDirection] = useState(1)
  const prevIndex = useRef(index)

  useEffect(() => {
    if (index !== prevIndex.current) {
      setDirection(index > prevIndex.current ? 1 : -1)
      prevIndex.current = index
    }
  }, [index])

  const go = (next) => {
    if (next < 0 || next >= TABS.length) return
    setDirection(next > index ? 1 : -1)
    prevIndex.current = next
    navigate(TABS[next].to)
  }

  const swipeRef = useSwipeNav({
    onNext: () => go(index + 1),
    onPrev: () => go(index - 1),
  })

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
            className="press flex h-10 items-center rounded-md border border-hairline px-3 text-xs font-medium text-ink-2 hover:bg-wash"
          >
            Sign out
          </button>
        </div>
      </header>

      <OfflineBanner />

      {error && (
        <div
          role="alert"
          className="anim-fade-in flex items-start justify-between gap-3 border-b px-4 py-2 text-xs"
          style={{ background: 'var(--wash)', color: 'var(--status-critical)', borderColor: 'var(--border)' }}
        >
          <span>{error}</span>
          <button type="button" onClick={dismissError} aria-label="Dismiss" className="shrink-0">
            ✕
          </button>
        </div>
      )}

      {/*
        pan-y hands vertical scrolling back to the browser, so the swipe hook
        only ever sees horizontal intent. Bottom padding clears the tab bar.
      */}
      <main ref={swipeRef} className="flex-1 touch-pan-y pb-24">
        <div key={location.pathname} className={direction >= 0 ? 'page-in-right' : 'page-in-left'}>
          <Outlet />
        </div>
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
                  `press flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors duration-150 ${
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
                        it never rests on colour alone. */}
                    <span
                      aria-hidden="true"
                      className="h-0.5 rounded-full transition-all duration-200 ease-out"
                      style={{
                        width: isActive ? '1.25rem' : '0.25rem',
                        background: isActive ? 'var(--series-1)' : 'transparent',
                      }}
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
