import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import useKeyboardInset from '../lib/useKeyboardInset'

/** Focusable descendants, in tab order. */
const FOCUSABLE =
  'a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),' +
  'button:not([disabled]),[tabindex]:not([tabindex="-1"])'

/** Bottom sheet on phones, centred dialog on wider screens. Escape and a
 *  backdrop tap both close it; body scroll is locked and focus is kept inside
 *  while it is open.
 *
 *  It renders through a portal to <body> for a reason that is easy to lose:
 *  `position: fixed` is fixed to the nearest *transformed* ancestor, not the
 *  viewport, and the page-transition wrapper this used to sit inside is exactly
 *  that. A short page hid the bug; once the dashboard filled with entries the
 *  sheet was pinned to the bottom of the page instead, far below the fold, and
 *  all that was left on screen was its backdrop.
 *
 *  The panel is bottom-anchored to the *visible* area rather than to `100vh`,
 *  so an open keyboard shrinks it instead of hiding its last rows — the field
 *  being typed into, and the form's sticky action bar — underneath itself.
 */
export default function Sheet({ title, onClose, children }) {
  const rootRef = useRef(null)
  const panelRef = useRef(null)
  const keyboardInset = useKeyboardInset()

  // Callers rebuild `onClose` on every render, so it is read through a ref:
  // the effect below owns the lifetime of the *sheet*, and must not re-run —
  // and re-run its focus restoration — every time the form's state changes.
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const opener = document.activeElement
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKey = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null)
      if (!items.length) {
        e.preventDefault()
        panel.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const current = document.activeElement
      if (!panel.contains(current)) {
        e.preventDefault()
        ;(e.shiftKey ? last : first).focus()
      } else if (e.shiftKey && current === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && current === last) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)

    // The form focuses its first field itself; if nothing did, focus the dialog
    // so the next Tab starts inside it rather than in the page behind.
    if (!panelRef.current?.contains(document.activeElement)) {
      panelRef.current?.focus({ preventScroll: true })
    }

    // Nothing behind a modal should be reachable by a screen reader. The sheet
    // is a child of <body>, so "behind" is precisely its siblings.
    const hidden = []
    for (const el of document.body.children) {
      if (el === rootRef.current || el.getAttribute('aria-hidden') === 'true') continue
      el.setAttribute('aria-hidden', 'true')
      hidden.push(el)
    }

    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
      for (const el of hidden) el.removeAttribute('aria-hidden')
      // Closing should feel like going back, not like being dropped somewhere
      // new, so focus returns to whatever opened the sheet.
      if (opener instanceof HTMLElement && document.contains(opener)) {
        opener.focus({ preventScroll: true })
      }
    }
  }, [])

  // The browser scrolls a focused field into view against the pre-resize
  // layout, so once the keyboard has actually taken its space the field can be
  // behind it. Re-do it ourselves whenever that space changes.
  useEffect(() => {
    if (!keyboardInset) return
    const el = document.activeElement
    if (el && el !== document.body && panelRef.current?.contains(el)) {
      el.scrollIntoView({ block: 'nearest' })
    }
  }, [keyboardInset])

  return createPortal(
    <div ref={rootRef} className="fixed inset-0 z-50">
      <div
        className="anim-fade-in absolute inset-0 bg-black/40"
        onClick={() => onCloseRef.current()}
        aria-hidden="true"
      />
      {/* Holds the panel above the keyboard. Transparent to pointer events so a
          tap beside the panel still reaches the backdrop. */}
      <div
        className="pointer-events-none absolute inset-0 flex items-end justify-center pt-[max(0.75rem,env(safe-area-inset-top))] sm:items-center"
        style={keyboardInset ? { bottom: keyboardInset } : undefined}
      >
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          tabIndex={-1}
          className="anim-sheet pointer-events-auto relative max-h-full w-full overflow-y-auto overscroll-contain scroll-pb-24 rounded-t-2xl border border-hairline bg-surface p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] outline-none sm:max-h-[92%] sm:max-w-lg sm:rounded-2xl sm:pb-5"
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
    </div>,
    document.body,
  )
}
