import { useEffect, useState } from 'react'
import { endOfMonth } from 'date-fns'
import { WINDOW_MONTHS, useData } from '../context/DataContext'
import { monthWindow } from './analytics'

const IDLE = { rows: [], loading: false, error: null }
const LOADING = { rows: [], loading: true, error: null }

/**
 * Entries between two dates, inclusive, or the whole history when `start` is
 * null.
 *
 * A range inside the live window is answered from the live entries, so edits
 * show up immediately with no read. Anything reaching further back is read
 * from Firestore (from the local cache when offline), and read again after
 * every entry write. The live snapshot only covers the window, so it is the
 * data context's write counter, not the live entries, that says an older
 * entry changed.
 */
export function useRangeEntries({ enabled = true, start, end }) {
  const { entries, selectedMonth, fetchEntriesBetween, fetchAllEntries, revision } = useData()
  const windowStart = monthWindow(selectedMonth, WINDOW_MONTHS).start
  const all = start == null
  const local = enabled && !all && start >= windowStart && end <= endOfMonth(selectedMonth)

  // Primitive keys, so a new Date for the same instant does not refetch.
  const startMs = start?.getTime() ?? null
  const endMs = end?.getTime() ?? null
  const key = all ? 'all' : `${startMs}-${endMs}`

  // Rows remember which range they were read for. On a range change the old
  // rows are not shown under the new dates; the view says it is loading.
  const [fetched, setFetched] = useState({ key: null, ...IDLE })

  useEffect(() => {
    if (!enabled || local) return
    let cancelled = false
    const read = all
      ? fetchAllEntries()
      : fetchEntriesBetween(new Date(startMs), new Date(endMs))
    read
      .then((rows) => !cancelled && setFetched({ key, rows, loading: false, error: null }))
      .catch(
        (e) =>
          !cancelled &&
          setFetched({ key, rows: [], loading: false, error: e?.message ?? 'Could not load entries.' }),
      )
    return () => {
      cancelled = true
    }
  }, [enabled, local, all, key, startMs, endMs, revision, fetchEntriesBetween, fetchAllEntries])

  if (!enabled) return IDLE
  if (local) {
    return { rows: entries.filter((e) => e.date >= start && e.date <= end), loading: false, error: null }
  }
  // A re-read of the same range after a write keeps the rows on screen
  // rather than flashing to "Loading…".
  return fetched.key === key ? fetched : LOADING
}
