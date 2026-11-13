import { useEffect, useState } from 'react'
import { endOfMonth } from 'date-fns'
import { WINDOW_MONTHS, useData } from '../context/DataContext'
import { monthWindow } from './analytics'

const IDLE = { rows: [], loading: false, error: null }

/**
 * Entries between two dates, inclusive, or the whole history when `start` is
 * null.
 *
 * A range inside the live window is answered from the live entries, so edits
 * show up immediately with no read. Anything reaching further back is read once
 * from Firestore (from the local cache when offline), and read again whenever
 * the live entries change, so an edit made from a list built on this is
 * reflected too.
 */
export function useRangeEntries({ enabled = true, start, end }) {
  const { entries, selectedMonth, fetchEntriesBetween, fetchAllEntries } = useData()
  const windowStart = monthWindow(selectedMonth, WINDOW_MONTHS).start
  const all = start == null
  const local = enabled && !all && start >= windowStart && end <= endOfMonth(selectedMonth)
  const [fetched, setFetched] = useState(IDLE)

  // Primitive keys, so a new Date for the same instant does not refetch.
  const startMs = start?.getTime() ?? null
  const endMs = end?.getTime() ?? null

  useEffect(() => {
    if (!enabled || local) return
    let cancelled = false
    setFetched((f) => ({ ...f, loading: true, error: null }))
    const read = all
      ? fetchAllEntries()
      : fetchEntriesBetween(new Date(startMs), new Date(endMs))
    read
      .then((rows) => !cancelled && setFetched({ rows, loading: false, error: null }))
      .catch(
        (e) =>
          !cancelled &&
          setFetched({ rows: [], loading: false, error: e?.message ?? 'Could not load entries.' }),
      )
    return () => {
      cancelled = true
    }
    // `entries` is a dependency on purpose: it changes after any write.
  }, [enabled, local, all, startMs, endMs, entries, fetchEntriesBetween, fetchAllEntries])

  if (!enabled) return IDLE
  if (local) {
    return { rows: entries.filter((e) => e.date >= start && e.date <= end), loading: false, error: null }
  }
  return fetched
}
