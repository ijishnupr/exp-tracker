import { useEffect, useRef } from 'react'

/** Minimum horizontal travel before a drag counts as a swipe. */
const DISTANCE = 60

/** A gesture more vertical than this is a scroll, not a swipe. */
const VERTICAL_TOLERANCE = 0.6

/** Slower than this and it is a drag, not a flick. */
const MAX_DURATION_MS = 900

/** Elements a swipe must never start inside: text fields swallow the gesture,
 *  a chart owns its own pointer handling for tooltips, and anything that
 *  scrolls sideways needs its own axis. */
const BLOCKED = 'input, select, textarea, [role="dialog"], .recharts-wrapper, [data-no-swipe]'

/**
 * Horizontal swipe navigation for touch devices.
 *
 * Deliberately touch-only: dragging a mouse sideways is not a gesture anyone
 * expects to change pages, and binding it would break text selection.
 *
 * The container sets `touch-action: pan-y`, so the browser keeps ownership of
 * vertical scrolling and only horizontal movement reaches this hook — that is
 * what stops a swipe from stealing a scroll halfway down a long list.
 */
export function useSwipeNav({ onNext, onPrev, enabled = true }) {
  const ref = useRef(null)
  // Kept in a ref so changing handlers never re-binds mid-gesture.
  const handlers = useRef({ onNext, onPrev })
  handlers.current = { onNext, onPrev }

  useEffect(() => {
    const el = ref.current
    if (!el || !enabled) return

    let startX = 0
    let startY = 0
    let startedAt = 0
    let tracking = false

    const start = (e) => {
      if (e.pointerType === 'mouse') return
      if (e.target.closest?.(BLOCKED)) return
      tracking = true
      startX = e.clientX
      startY = e.clientY
      startedAt = performance.now()
    }

    const end = (e) => {
      if (!tracking) return
      tracking = false
      const dx = e.clientX - startX
      const dy = e.clientY - startY
      if (performance.now() - startedAt > MAX_DURATION_MS) return
      if (Math.abs(dx) < DISTANCE) return
      if (Math.abs(dy) > Math.abs(dx) * VERTICAL_TOLERANCE) return
      if (dx < 0) handlers.current.onNext?.()
      else handlers.current.onPrev?.()
    }

    const cancel = () => {
      tracking = false
    }

    el.addEventListener('pointerdown', start, { passive: true })
    el.addEventListener('pointerup', end, { passive: true })
    el.addEventListener('pointercancel', cancel, { passive: true })
    return () => {
      el.removeEventListener('pointerdown', start)
      el.removeEventListener('pointerup', end)
      el.removeEventListener('pointercancel', cancel)
    }
  }, [enabled])

  return ref
}
