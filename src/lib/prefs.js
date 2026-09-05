/** Per-device preferences. These describe how the app opens on *this* phone or
 *  laptop, so they belong in localStorage rather than the synced profile. */

const KEYS = {
  theme: 'exp-tracker:theme',
  openAddOnLaunch: 'exp-tracker:open-add-on-launch',
}

const read = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v == null ? fallback : v
  } catch {
    // Private mode or blocked site data — fall back and carry on.
    return fallback
  }
}

const write = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Non-fatal: the choice simply does not persist.
  }
}

export const getTheme = () => read(KEYS.theme, 'system')
export const setTheme = (value) => write(KEYS.theme, value)

/** When on, launching the installed app goes straight to the add-entry sheet —
 *  the point of a home-screen gesture is to log something in one motion.
 *  Defaults to on. */
export const getOpenAddOnLaunch = () => read(KEYS.openAddOnLaunch, '1') === '1'
export const setOpenAddOnLaunch = (on) => write(KEYS.openAddOnLaunch, on ? '1' : '0')

/** True when running as an installed app rather than a browser tab. */
export function isStandalone() {
  try {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    )
  } catch {
    return false
  }
}
