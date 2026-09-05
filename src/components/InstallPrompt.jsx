import { useEffect, useState } from 'react'

const DISMISS_KEY = 'exp-tracker:install-dismissed'

/** Chrome/Edge/Android fire beforeinstallprompt; iOS Safari never does, so it
 *  gets a short "Share › Add to Home Screen" hint instead. */
export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null)
  const [iosHint, setIosHint] = useState(false)

  useEffect(() => {
    let dismissed = false
    try {
      dismissed = localStorage.getItem(DISMISS_KEY) === '1'
    } catch {
      // Private mode or blocked site data: just show the prompt.
    }
    if (dismissed) return

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (standalone) return

    const onPrompt = (e) => {
      e.preventDefault()
      setDeferred(e)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent)
    if (isIos) setIosHint(true)

    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      // Non-fatal — the prompt simply reappears next visit.
    }
    setDeferred(null)
    setIosHint(false)
  }

  if (!deferred && !iosHint) return null

  return (
    <div className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-md rounded-xl border border-hairline bg-surface p-3 shadow-lg">
      <p className="text-sm text-ink">
        {deferred ? 'Install the app for offline access.' : 'Add to Home Screen for offline access.'}
      </p>
      {!deferred && (
        <p className="mt-1 text-xs text-muted">Tap Share, then “Add to Home Screen”.</p>
      )}
      <div className="mt-2 flex gap-2">
        {deferred && (
          <button
            type="button"
            onClick={async () => {
              await deferred.prompt()
              dismiss()
            }}
            className="rounded-lg bg-series px-3 py-1.5 text-xs font-semibold text-white"
          >
            Install
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-ink-2"
        >
          Not now
        </button>
      </div>
    </div>
  )
}
