import { useEffect, useRef } from 'react'
import useVisualViewport from '../lib/useVisualViewport'

/** Bottom sheet on phones, centred dialog on wider screens. Escape and a
 *  backdrop tap both close it; body scroll is locked while open.
 *
 *  The sheet is measured against the visual viewport rather than `vh`, so when
 *  a phone keyboard opens the panel shrinks to the space above it instead of
 *  running underneath — which is what used to hide the field being typed into
 *  and the sticky Add button at the bottom of the form. */
export default function Sheet({ title, onClose, children }) {
  const panelRef = useRef(null)
  const viewport = useVisualViewport()

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  // The browser scrolls a focused field into view against the pre-resize
  // layout, so once the keyboard has actually taken its space the field can be
  // behind it. Re-do it ourselves on every viewport change.
  useEffect(() => {
    if (!viewport) return
    const el = document.activeElement
    if (el && el !== document.body && panelRef.current?.contains(el)) {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [viewport])

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="anim-fade-in absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Sized and offset to the visible area; `100dvh` is the fallback where
          visualViewport is unavailable. Transparent to pointer events so a tap
          beside the panel still reaches the backdrop. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 flex h-[100dvh] items-end justify-center pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center"
        style={viewport ? { top: viewport.top, height: viewport.height } : undefined}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="anim-sheet pointer-events-auto relative max-h-full w-full overflow-y-auto overscroll-contain scroll-pb-24 rounded-t-2xl border border-hairline bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-h-[92%] sm:max-w-lg sm:rounded-2xl sm:pb-5"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-ink">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-2 flex h-11 w-11 items-center justify-center rounded-md text-lg leading-none text-muted hover:bg-wash"
            >
              ✕
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
