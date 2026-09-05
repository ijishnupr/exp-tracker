import { useEffect, useState } from 'react'
import { useData } from '../context/DataContext'

/** Offline is a normal state here, not an error: reads come from IndexedDB and
 *  writes queue. The banner says exactly that, so nobody re-enters an expense
 *  fearing it was lost. */
export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  const { pendingWrites } = useData()

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  if (online && !pendingWrites) return null

  const offline = !online
  return (
    <div
      role="status"
      className="flex items-center gap-2 border-b px-4 py-2 text-xs"
      style={{
        background: 'var(--wash)',
        borderColor: 'var(--border)',
        color: offline ? 'var(--status-serious)' : 'var(--text-secondary)',
      }}
    >
      <span aria-hidden="true">{offline ? '⚡' : '⟳'}</span>
      <span>
        {offline
          ? 'Offline — changes are saved on this device and sync when you reconnect.'
          : 'Syncing changes…'}
      </span>
    </div>
  )
}
