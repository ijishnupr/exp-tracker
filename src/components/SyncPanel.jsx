import { useState } from 'react'
import { formatDistanceToNow } from 'date-fns'
import { useData } from '../context/DataContext'

/**
 * Sync status and a manual nudge.
 *
 * Firestore already syncs by itself — this panel exists to make that visible
 * and to let you confirm before closing the app or losing signal, rather than
 * because anything would otherwise be left behind.
 */
export default function SyncPanel() {
  const { pendingWrites, pendingCount, lastSyncedAt, syncNow } = useData()
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)

  const online = typeof navigator === 'undefined' ? true : navigator.onLine

  const state = !online
    ? { role: 'serious', icon: '⚡', title: 'Offline', detail: 'Changes are saved on this device and upload by themselves when you reconnect.' }
    : pendingWrites
      ? { role: 'warning', icon: '⟳', title: pendingCount > 0 ? `${pendingCount} change${pendingCount === 1 ? '' : 's'} uploading` : 'Uploading changes', detail: 'Already saved locally — this is the copy going to Firestore.' }
      : { role: 'good', icon: '✓', title: 'Everything is synced', detail: 'No changes are waiting to upload.' }

  async function run() {
    setBusy(true)
    setStatus(null)
    try {
      await syncNow()
      setStatus({ kind: 'good', text: 'All changes are on the server.' })
    } catch (e) {
      setStatus({ kind: 'critical', text: e.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold text-ink">Sync</h2>

      <div className="mt-2 flex items-start gap-2">
        <span aria-hidden="true" style={{ color: `var(--status-${state.role})` }}>
          {state.icon}
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium" style={{ color: `var(--status-${state.role})` }}>
            {state.title}
          </p>
          <p className="text-xs text-muted">{state.detail}</p>
        </div>
      </div>

      <p className="mt-2 text-xs text-muted">
        {lastSyncedAt
          ? `Last confirmed with the server ${formatDistanceToNow(lastSyncedAt, { addSuffix: true })}.`
          : 'Not yet confirmed with the server on this device.'}
      </p>

      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="mt-3 min-h-[44px] rounded-lg bg-series px-4 text-xs font-semibold text-white disabled:opacity-60"
      >
        {busy ? 'Syncing…' : 'Sync now'}
      </button>

      {status && (
        <p
          role="status"
          className="mt-2 flex items-start gap-1.5 text-xs"
          style={{ color: `var(--status-${status.kind})` }}
        >
          <span aria-hidden="true">{status.kind === 'good' ? '✓' : '✕'}</span>
          <span>{status.text}</span>
        </p>
      )}

      <p className="mt-2 text-xs text-muted">
        Your data is written to this device first and uploaded in the background, so the app stays
        fast on a slow connection. Nothing is lost if you close it mid-upload.
      </p>
    </section>
  )
}
