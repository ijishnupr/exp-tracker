import { useEffect, useState } from 'react'

/** A keyboard taller than this share of the screen is not a keyboard — it is a
 *  reading we should not trust, so we fall back to no inset at all. */
const MAX_SHARE = 0.75
/** Below this the difference is browser chrome (a collapsing URL bar), not a
 *  keyboard, and shifting the sheet for it would just look like a twitch. */
const MIN_INSET = 60

function read() {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  if (!vv) return 0
  // The visual viewport sits at [offsetTop, offsetTop + height] inside the
  // layout viewport; whatever is left at the bottom is the keyboard. Computing
  // it this way is self-correcting: a stale or spurious offsetTop can only make
  // the inset smaller, never push a fixed element off the bottom of the screen.
  const inset = window.innerHeight - vv.height - vv.offsetTop
  if (!Number.isFinite(inset) || inset < MIN_INSET) return 0
  if (inset > window.innerHeight * MAX_SHARE) return 0
  return Math.round(inset)
}

/**
 * How many pixels of the layout viewport the on-screen keyboard covers.
 *
 * A `fixed inset-0` box and `100vh` both describe the layout viewport, which
 * does not shrink when the keyboard opens, so a bottom-anchored dialog sized
 * against them puts its last rows — and any sticky action bar — underneath the
 * keyboard. Returns 0 when the keyboard is closed, on desktop, and wherever the
 * visualViewport API is missing, so the CSS fallback simply stands.
 */
export default function useKeyboardInset() {
  const [inset, setInset] = useState(read)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    // iOS fires `scroll` continuously while the keyboard animates; only publish
    // a change when the number actually moved.
    const update = () => {
      const next = read()
      setInset((prev) => (prev === next ? prev : next))
    }
    // Dismissing the keyboard with the system back button does not always end
    // with a viewport event, so re-check shortly after the focus leaves too.
    let timer = 0
    const recheck = () => {
      update()
      clearTimeout(timer)
      timer = setTimeout(update, 300)
    }
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    window.addEventListener('focusout', recheck)
    return () => {
      clearTimeout(timer)
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      window.removeEventListener('focusout', recheck)
    }
  }, [])

  return inset
}
