import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { useSwipeNav } from '../lib/useSwipeNav'
import OfflineBanner from './OfflineBanner'
import InstallPrompt from './InstallPrompt'

const TABS = [
  { to: '/', label: 'Dashboard', icon: '◧' },
  { to: '/transactions', label: 'Transactions', icon: '☰' },
  { to: '/budgets', label: 'Budgets', icon: '◑' },
  { to: '/settings', label: 'Settings', icon: '⚙' },
]

/** The tab a path belongs to, or -1 for a page reached from inside one
 *  (Reports, a category): swiping there would jump to an unrelated tab. */
const indexOfPath = (pathname) =>
  TABS.findIndex((t) => (t.to === '/' ? pathname === '/' : pathname.startsWith(t.to)))

export default function Layout() {
  const { user } = useAuth()
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
      // A sub-page (-1) is deeper than any tab: it comes in from the right,
      // and going back out to a tab comes in from the left.
      const prev = prevIndex.current
      setDirection(index === -1 ? 1 : prev === -1 ? -1 : index > prev ? 1 : -1)
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
    enabled: index !== -1,
  })

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col">
      {/* Hidden on phones: the name is decoration, and Sign out now lives in
          Settings, so the row was costing vertical space for nothing. */}
      <header className="sticky top-0 z-30 hidden items-center justify-between gap-3 border-b border-hairline bg-plane px-4 py-3 sm:flex">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="text-lg">📊</span>
          <span className="text-sm font-semibold text-ink">Expense Tracker</span>
        </div>
        {/* Sign out lives in Settings — one place, on every screen size. */}
        {user?.photoURL && (
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            className="h-7 w-7 rounded-full border border-hairline"
          />
        )}
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
        overflow-x-clip: the page slides in from 18px to the right, and on a
        phone that brief overflow widened the layout viewport, stretching the
        fixed tab bar and leaving the page scrollable sideways. `clip` rather
        than `hidden`, so no scroll container is created.
      */}
      <main ref={swipeRef} className="flex-1 touch-pan-y overflow-x-clip pb-24">
        <div key={location.pathname} className={direction >= 0 ? 'page-in-right' : 'page-in-left'}>
          <Outlet />
        </div>
      </main>

      <InstallPrompt />

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
