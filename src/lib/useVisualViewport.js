import { useEffect, useState } from 'react'

function read() {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  if (!vv) return null
  return { height: vv.height, top: vv.offsetTop }
}

/**
 * Tracks the *visual* viewport — the slice of the screen the on-screen keyboard
 * leaves visible. Both `100vh` and a `fixed inset-0` box describe the *layout*
 * viewport, which does not shrink when the keyboard opens, so a bottom-anchored
 * dialog sized against them puts its last rows (and any sticky action bar)
 * underneath the keyboard, off-screen.
 *
 * Returns null where the API is missing, so callers can fall back to CSS.
 */
export default function useVisualViewport() {
  const [rect, setRect] = useState(read)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    // iOS fires `scroll` continuously while the keyboard animates in; only
    // publish a new object when a number actually moved, or every frame of that
    // animation re-renders the sheet.
    const update = () =>
      setRect((prev) => {
        const next = read()
        if (prev && next && prev.height === next.height && prev.top === next.top) return prev
        return next
      })
    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return rect
}
