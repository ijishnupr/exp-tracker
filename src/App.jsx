import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useRef } from 'react'
import { isConfigured } from './lib/firebase'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DataProvider } from './context/DataContext'
import { getOpenAddOnLaunch, isStandalone } from './lib/prefs'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Settings from './pages/Settings'
import Login from './pages/Login'
import SetupNeeded from './pages/SetupNeeded'

export default function App() {
  // A blank .env can only produce a login screen that fails, so say what is
  // missing instead.
  if (!isConfigured) return <SetupNeeded />

  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}

/** Auth initialisation depends on browser storage. When it never settles, say
 *  so and name the usual causes — a spinner that never stops teaches nobody. */
function AuthStalled() {
  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-lg font-semibold text-ink">Still trying to sign you in</h1>
      <p className="mt-2 text-sm text-ink-2">
        Firebase is taking longer than expected to read its saved sign-in state. That almost always
        means the browser is not letting it use local storage.
      </p>
      <ul className="mt-4 space-y-2 text-sm text-ink-2">
        <li>• Private or incognito windows often block it — try a normal window.</li>
        <li>• Check that cookies and site data are allowed for this site.</li>
        <li>• A privacy extension or content blocker may be interfering.</li>
      </ul>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="mt-5 rounded-lg bg-series px-4 py-2.5 text-sm font-semibold text-white"
      >
        Try again
      </button>
    </div>
  )
}

function Gate() {
  const { user, loading, stalled } = useAuth()

  if (loading) {
    return stalled ? (
      <AuthStalled />
    ) : (
      <div className="flex min-h-screen items-center justify-center">
        <span className="text-sm text-muted">Loading…</span>
      </div>
    )
  }

  if (!user) return <Login />

  return (
    <DataProvider>
      <LaunchIntoAdd />
      <Routes>
        {/* A real path for the sheet, so a phone shortcut or the manifest
            shortcut can target it directly. */}
        <Route path="/add" element={<Navigate to="/?add=1" replace />} />
        <Route element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="budgets" element={<Budgets />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </DataProvider>
  )
}

/** Opens the add sheet on a cold start of the installed app, when the user has
 *  asked for that. Runs once — reopening it after every navigation would trap
 *  you in the form. */
function LaunchIntoAdd() {
  const navigate = useNavigate()
  const location = useLocation()
  const done = useRef(false)

  useEffect(() => {
    if (done.current) return
    done.current = true
    if (!getOpenAddOnLaunch() || !isStandalone()) return
    // Only from a bare launch: a deep link or a restored tab keeps its place.
    if (location.pathname !== '/' || location.search) return
    navigate('/?add=1', { replace: true })
  }, [navigate, location.pathname, location.search])

  return null
}
