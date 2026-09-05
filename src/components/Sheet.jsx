import { useEffect } from 'react'

/** Bottom sheet on phones, centred dialog on wider screens. Escape and a
 *  backdrop tap both close it; body scroll is locked while open. */
export default function Sheet({ title, onClose, children }) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="anim-fade-in absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="anim-sheet relative max-h-[92vh] w-full overflow-y-auto overscroll-contain rounded-t-2xl border border-hairline bg-surface p-5 pb-8 sm:max-w-lg sm:rounded-2xl sm:pb-5"
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
  )
}
