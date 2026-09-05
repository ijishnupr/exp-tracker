import { getTheme, setTheme } from './prefs'

/** What the phone's status bar / browser chrome should be in each mode. These
 *  match --plane, so the system chrome reads as an extension of the page. */
export const THEME_COLORS = { light: '#f9f9f7', dark: '#000000' }

/**
 * Which mode is actually on screen right now.
 *
 * The rendered `data-theme` attribute wins over the stored preference: it is
 * what the CSS reads, so anything that sets the theme by another route keeps
 * the system chrome in step instead of drifting out of sync with the page.
 * With no attribute, the preference is 'system' and the OS decides.
 */
export function resolveTheme(pref = getTheme()) {
  try {
    const attr = document.documentElement.getAttribute('data-theme')
    if (attr === 'light' || attr === 'dark') return attr
  } catch {
    // No DOM (SSR, tests) — fall through to the preference.
  }
  if (pref === 'light' || pref === 'dark') return pref
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

/**
 * Paints the browser/system chrome to match the app.
 *
 * A `<meta name="theme-color" media="...">` pair can only follow the OS
 * setting, so on a dark phone with the app set to Light the status bar would
 * stay black. Driving a single tag from JS makes it follow the app's own
 * theme, which is what the toggle in Settings implies.
 */
export function applyThemeColor(pref = getTheme()) {
  const resolved = resolveTheme(pref)
  let meta = document.querySelector('meta[name="theme-color"]:not([media])')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    document.head.appendChild(meta)
  }
  meta.setAttribute('content', THEME_COLORS[resolved])
  return resolved
}

/** Sets the theme everywhere it needs to be set: the document attribute the
 *  CSS reads, the stored preference, and the system chrome. */
export function applyTheme(pref) {
  if (pref === 'system') document.documentElement.removeAttribute('data-theme')
  else document.documentElement.setAttribute('data-theme', pref)
  setTheme(pref)
  applyThemeColor(pref)
}

/** While the preference is 'system', the chrome has to follow the OS flipping
 *  underneath us. Returns an unsubscribe. */
export function watchSystemTheme() {
  try {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => {
      if (getTheme() === 'system') applyThemeColor('system')
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  } catch {
    return () => {}
  }
}
