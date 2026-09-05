import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

// Apply the saved theme before first paint so there is no light flash on a
// dark-themed device.
try {
  const saved = localStorage.getItem('exp-tracker:theme')
  if (saved === 'light' || saved === 'dark') {
    document.documentElement.setAttribute('data-theme', saved)
  }
} catch {
  // Blocked site data — fall back to the OS preference.
}

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
