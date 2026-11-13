import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

// Whether the person has done anything yet this launch. Set on the first tap,
// click or key press, and never cleared.
let interacted = false
if (typeof window !== 'undefined') {
  const mark = () => {
    interacted = true
  }
  window.addEventListener('pointerdown', mark, { once: true, capture: true })
  window.addEventListener('keydown', mark, { once: true, capture: true })
}

/** registerType is 'prompt', so a new build never swaps itself in mid-edit.
 *
 *  But if the update is found before the person has touched anything (the
 *  usual case: it is checked for as the app opens), there is nothing to
 *  interrupt, so it is applied at once. Waiting for a tap on "Reload" left
 *  people on the old version, and its old splash colour and start-up page,
 *  for as long as they kept dismissing or missing the banner. */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  useEffect(() => {
    if (needRefresh && !interacted) updateServiceWorker(true)
  }, [needRefresh, updateServiceWorker])

  if (!needRefresh) return null

  return (
    <div className="fixed inset-x-3 bottom-20 z-40 mx-auto max-w-md rounded-xl border border-hairline bg-surface p-3 shadow-lg">
      <p className="text-sm text-ink">A new version is available.</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => updateServiceWorker(true)}
          className="rounded-lg bg-series px-3 py-1.5 text-xs font-semibold text-white"
        >
          Reload
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-ink-2"
        >
          Later
        </button>
      </div>
    </div>
  )
}
