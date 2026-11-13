import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { applyThemeColor, watchSystemTheme } from './lib/theme'

// Apply the saved theme before first paint so there is no light flash on a
// dark-themed device, and paint the system chrome to match.
try {
  const saved = localStorage.getItem('exp-tracker:theme')
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.setAttribute('data-theme', saved)
  }
} catch {
  // Blocked site data — fall back to the OS preference.
}
applyThemeColor()

// Everything offline lives in browser storage: the Firestore cache and queued
// writes and the saved sign-in (IndexedDB), plus the app shell (Cache Storage).
// That storage is "best effort" by default, so the browser may clear it under
// storage pressure, or after a week without use. When that happens the app
// cannot start offline. Asking for persistent storage stops the clearing. Chrome
// grants it without a prompt to installed or frequently used sites; where it
// is refused, nothing changes.
navigator.storage?.persist?.().catch(() => {})
watchSystemTheme()

// Vite injects the build's `base`; strip the trailing slash React Router
// does not want. '/' becomes '', which is the correct root basename.
const basename = import.meta.env.BASE_URL.replace(/\/$/, '')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// Fade out the launch logo from index.html once the app has drawn its first
// frame. It stays at least long enough for the bars to finish rising (about
// half a second from launch), so it reads as a deliberate mark, not a flicker,
// but never holds back an app that is ready. Reduced motion: removed at once.
const boot = document.getElementById('boot')
if (boot) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const wait = reduce ? 0 : Math.max(0, 520 - performance.now())
  requestAnimationFrame(() =>
    setTimeout(() => {
      boot.classList.add('boot-out')
      setTimeout(() => boot.remove(), 220)
    }, wait),
  )
}
