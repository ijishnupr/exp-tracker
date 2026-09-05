/** Per-device preferences. These describe how the app opens on *this* phone or
 *  laptop, so they belong in localStorage rather than the synced profile. */

const KEYS = {
  theme: 'exp-tracker:theme',
  openAddOnLaunch: 'exp-tracker:open-add-on-launch',
  lastSyncedAt: 'exp-tracker:last-synced-at',
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

/** When on, opening the app on a phone goes straight to the add-entry sheet —
 *  the point of reaching for it is almost always to log something. Defaults to
 *  on. */
export const getOpenAddOnLaunch = () => read(KEYS.openAddOnLaunch, '1') === '1'
export const setOpenAddOnLaunch = (on) => write(KEYS.openAddOnLaunch, on ? '1' : '0')

const media = (q) => {
  try {
    return window.matchMedia(q).matches
  } catch {
    return false
  }
}

/** True when running as an installed app rather than a browser tab. */
export function isStandalone() {
  try {
    return media('(display-mode: standalone)') || window.navigator.standalone === true
  } catch {
    return false
  }
}

/** A touch-primary device: the main pointer is a finger and there is no hover.
 *
 *  Feature queries rather than user-agent sniffing, so this does not rot. The
 *  `hover: none` half is what excludes a touchscreen laptop, whose primary
 *  pointer is still a trackpad. Deliberately *not* a viewport-width test —
 *  a large phone in landscape is wider than any sensible breakpoint, and the
 *  form should still open there. */
export const isMobileDevice = () => media('(pointer: coarse)') && media('(hover: none)')

/** Whether a bare launch should open the add sheet. True on a phone whether or
 *  not the app is installed, and in the installed app on any device — opening
 *  it there is a deliberate "log something" gesture. A desktop browser tab is
 *  left alone. */
export const shouldOpenAddOnLaunch = () =>
  getOpenAddOnLaunch() && (isStandalone() || isMobileDevice())

/** Timestamp of the last snapshot that came from the server with nothing
 *  queued — i.e. the last moment this device was provably up to date. */
export const getLastSyncedAt = () => {
  const v = Number(read(KEYS.lastSyncedAt, '0'))
  return Number.isFinite(v) && v > 0 ? v : null
}
export const setLastSyncedAt = (ms) => write(KEYS.lastSyncedAt, String(ms))
