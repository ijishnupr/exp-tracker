import { useRegisterSW } from 'virtual:pwa-register/react'

/** registerType is 'prompt', so a new build never swaps itself in mid-edit —
 *  the user chooses when to reload. */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

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
