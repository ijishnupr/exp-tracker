import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore'
import { startOfMonth } from 'date-fns'
import { db } from '../lib/firebase'
import { useAuth } from './AuthContext'
import { monthKey, monthWindow } from '../lib/analytics'
import { DEFAULT_CATEGORIES, makeCategoryKey, nextSlot } from '../lib/categories'
import { round2 } from '../lib/money'
import { settleLocally } from '../lib/firestoreWrite'

// Exported so tests and the dev preview harness can supply values directly.
export const DataContext = createContext(null)

/** How many months the live subscription covers. One query serves both the
 *  selected month's list and the trailing trend chart. */
export const WINDOW_MONTHS = 6

/** Firestore caps a batch at 500 writes. */
const BATCH_LIMIT = 500


const toEntry = (d) => {
  const raw = d.data()
  return {
    id: d.id,
    amount: Number(raw.amount) || 0,
    // Entries written before income existed have no type; they are expenses.
    type: raw.type === 'income' ? 'income' : 'expense',
    category: raw.category ?? 'other',
    note: raw.note ?? '',
    // A locally-queued write has no server timestamp yet; fall back to now so
    // the row still sorts and renders while offline.
    date: raw.date?.toDate?.() ?? new Date(),
  }
}

const toCategory = (d) => {
  const raw = d.data()
  return {
    key: d.id,
    label: raw.label ?? d.id,
    icon: raw.icon ?? '📦',
    type: raw.type === 'income' ? 'income' : 'expense',
    slot: Number(raw.slot) || 1,
    archived: raw.archived === true,
    order: Number(raw.order) || 0,
  }
}

export function DataProvider({ children }) {
  const { user } = useAuth()
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date()))
  const [entries, setEntries] = useState([])
  const [budgets, setBudgets] = useState({})
  const [categories, setCategories] = useState([])
  const [categoriesLoaded, setCategoriesLoaded] = useState(false)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [pendingWrites, setPendingWrites] = useState(false)
  const [error, setError] = useState(null)

  const uid = user?.uid
  const entriesRef = useCallback(() => collection(db, 'users', uid, 'expenses'), [uid])

  // Keeps object identity when the month is unchanged — tapping the current
  // month would otherwise tear down and rebuild the subscription.
  const selectMonth = useCallback((date) => {
    setSelectedMonth((prev) => (monthKey(prev) === monthKey(date) ? prev : startOfMonth(date)))
  }, [])

  // Entries in the rolling window. Range + orderBy on the same field needs no
  // composite index.
  useEffect(() => {
    if (!uid) {
      setEntries([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { start, end } = monthWindow(selectedMonth, WINDOW_MONTHS)
    const q = query(
      collection(db, 'users', uid, 'expenses'),
      where('date', '>=', Timestamp.fromDate(start)),
      where('date', '<=', Timestamp.fromDate(end)),
      orderBy('date', 'desc'),
    )
    return onSnapshot(
      q,
      { includeMetadataChanges: true },
      (snap) => {
        setEntries(snap.docs.map(toEntry))
        setPendingWrites(snap.metadata.hasPendingWrites)
        setLoading(false)
        setError(null)
      },
      (e) => {
        setError(e.message)
        setLoading(false)
      },
    )
  }, [uid, selectedMonth])

  // Budgets: one small doc per category, keyed by the category key.
  useEffect(() => {
    if (!uid) {
      setBudgets({})
      return
    }
    return onSnapshot(
      collection(db, 'users', uid, 'budgets'),
      (snap) => {
        const next = {}
        for (const d of snap.docs) next[d.id] = { limit: Number(d.data().limit) || 0 }
        setBudgets(next)
      },
      (e) => setError(e.message),
    )
  }, [uid])

  // Categories, seeded on first run then fully user-editable.
  useEffect(() => {
    if (!uid) {
      setCategories([])
      setCategoriesLoaded(false)
      return
    }
    return onSnapshot(
      collection(db, 'users', uid, 'categories'),
      (snap) => {
        setCategories(
          snap.docs
            .map(toCategory)
            .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label)),
        )
        setCategoriesLoaded(true)
      },
      (e) => setError(e.message),
    )
  }, [uid])

  useEffect(() => {
    if (!uid) {
      setProfile(null)
      return
    }
    return onSnapshot(
      doc(db, 'users', uid),
      (snap) => setProfile(snap.exists() ? snap.data() : null),
      (e) => setError(e.message),
    )
  }, [uid])

  // Seed the defaults exactly once, when the collection is confirmed empty.
  useEffect(() => {
    if (!uid || !categoriesLoaded || categories.length) return
    void (async () => {
      try {
        const batch = writeBatch(db)
        DEFAULT_CATEGORIES.forEach((c, i) => {
          batch.set(doc(db, 'users', uid, 'categories', c.key), {
            label: c.label,
            icon: c.icon,
            type: c.type,
            slot: c.slot,
            order: i,
          })
        })
        await batch.commit()
      } catch {
        // Offline on first run: seeded on the next launch with a connection.
      }
    })()
  }, [uid, categoriesLoaded, categories.length])

  const currency = profile?.currency ?? 'INR'

  const reportWriteError = useCallback(
    (e) => setError(e?.message ?? 'A change could not be saved.'),
    [],
  )

  const addEntry = useCallback(
    ({ amount, type, category, note, date }) =>
      settleLocally(
        addDoc(entriesRef(), {
        amount: round2(amount),
        type: type === 'income' ? 'income' : 'expense',
        category,
        note: note?.trim() ?? '',
          date: Timestamp.fromDate(date),
          createdAt: serverTimestamp(),
        }),
        reportWriteError,
      ),
    [entriesRef, reportWriteError],
  )

  const updateEntry = useCallback(
    (id, { amount, type, category, note, date }) =>
      settleLocally(
        updateDoc(doc(db, 'users', uid, 'expenses', id), {
        amount: round2(amount),
        type: type === 'income' ? 'income' : 'expense',
        category,
        note: note?.trim() ?? '',
          date: Timestamp.fromDate(date),
          updatedAt: serverTimestamp(),
        }),
        reportWriteError,
      ),
    [uid, reportWriteError],
  )

  const deleteEntry = useCallback(
    (id) => settleLocally(deleteDoc(doc(db, 'users', uid, 'expenses', id)), reportWriteError),
    [uid, reportWriteError],
  )

  const setBudget = useCallback(
    (categoryKey, limit) =>
      settleLocally(
        setDoc(
          doc(db, 'users', uid, 'budgets', categoryKey),
          { limit: round2(limit) },
          { merge: true },
        ),
        reportWriteError,
      ),
    [uid, reportWriteError],
  )

  const removeBudget = useCallback(
    (categoryKey) =>
      settleLocally(deleteDoc(doc(db, 'users', uid, 'budgets', categoryKey)), reportWriteError),
    [uid, reportWriteError],
  )

  const setCurrency = useCallback(
    (code) =>
      settleLocally(
        setDoc(
          doc(db, 'users', uid),
          { currency: code, updatedAt: serverTimestamp() },
          { merge: true },
        ),
        reportWriteError,
      ),
    [uid, reportWriteError],
  )

  const addCategory = useCallback(
    ({ label, icon, type }) => {
      const key = makeCategoryKey(label, categories)
      return settleLocally(
        setDoc(doc(db, 'users', uid, 'categories', key), {
          label: label.trim().slice(0, 40),
          icon: icon || (type === 'income' ? '💰' : '📦'),
          type: type === 'income' ? 'income' : 'expense',
          slot: nextSlot(categories),
          order: categories.length,
        }),
        reportWriteError,
      )
    },
    [uid, categories, reportWriteError],
  )

  const updateCategory = useCallback(
    (key, patch) =>
      settleLocally(updateDoc(doc(db, 'users', uid, 'categories', key), patch), reportWriteError),
    [uid, reportWriteError],
  )

  /** Archiving rather than deleting keeps historical entries readable; a
   *  category with no entries is removed outright. */
  const removeCategory = useCallback(
    async (key) => {
      const used = await getDocs(query(entriesRef(), where('category', '==', key)))
      if (used.empty) {
        await settleLocally(
          deleteDoc(doc(db, 'users', uid, 'categories', key)),
          reportWriteError,
        )
        return { archived: false, entries: 0 }
      }
      await settleLocally(
        updateDoc(doc(db, 'users', uid, 'categories', key), { archived: true }),
        reportWriteError,
      )
      return { archived: true, entries: used.size }
    },
    [uid, entriesRef, reportWriteError],
  )

  /** Reads the full history for "export everything" — deliberately a one-off
   *  get rather than widening the live subscription. */
  const fetchAllEntries = useCallback(async () => {
    const snap = await getDocs(query(entriesRef(), orderBy('date', 'desc')))
    return snap.docs.map(toEntry)
  }, [entriesRef])

  /**
   * Writes imported records using their deterministic ids, so re-importing the
   * same file updates in place instead of duplicating. Reports progress so a
   * 1500-row import is not a silent freeze.
   */
  const importEntries = useCallback(
    async (records, newCategories = [], onProgress) => {
      // Deliberately NOT fire-and-forget. Offline, each batch commit would stay
      // pending, so the progress bar would either freeze or lie while 1500
      // writes piled into IndexedDB. A bulk import is an online operation.
      if (!navigator.onLine) {
        throw new Error(
          'Importing needs a connection — it writes in batches and reports real progress. ' +
            'Reconnect and try again; nothing has been written.',
        )
      }

      // Any category the file needs must exist first, or entries would resolve
      // to a fallback label.
      if (newCategories.length) {
        const batch = writeBatch(db)
        newCategories.forEach((c, i) => {
          batch.set(
            doc(db, 'users', uid, 'categories', c.key),
            {
              label: c.label,
              icon: c.type === 'income' ? '💰' : '📦',
              type: c.type,
              slot: ((categories.length + i) % 8) + 1,
              order: categories.length + i,
            },
            { merge: true },
          )
        })
        await batch.commit()
      }

      let written = 0
      for (let i = 0; i < records.length; i += BATCH_LIMIT) {
        const chunk = records.slice(i, i + BATCH_LIMIT)
        const batch = writeBatch(db)
        for (const r of chunk) {
          batch.set(
            doc(db, 'users', uid, 'expenses', r.id),
            {
              amount: round2(r.amount),
              type: r.type,
              category: r.category,
              note: r.note ?? '',
              date: Timestamp.fromDate(r.date),
              importedAt: serverTimestamp(),
            },
            { merge: true },
          )
        }
        await batch.commit()
        written += chunk.length
        onProgress?.(written, records.length)
      }
      return written
    },
    [uid, categories.length],
  )

  const value = useMemo(
    () => ({
      selectedMonth,
      setSelectedMonth: selectMonth,
      entries,
      budgets,
      categories,
      profile,
      currency,
      loading,
      pendingWrites,
      error,
      dismissError: () => setError(null),
      addEntry,
      updateEntry,
      deleteEntry,
      setBudget,
      removeBudget,
      setCurrency,
      addCategory,
      updateCategory,
      removeCategory,
      fetchAllEntries,
      importEntries,
    }),
    [
      selectedMonth,
      selectMonth,
      entries,
      budgets,
      categories,
      profile,
      currency,
      loading,
      pendingWrites,
      error,
      addEntry,
      updateEntry,
      deleteEntry,
      setBudget,
      removeBudget,
      setCurrency,
      addCategory,
      updateCategory,
      removeCategory,
      fetchAllEntries,
      importEntries,
    ],
  )

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>
}

export const useData = () => {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useData must be used inside <DataProvider>')
  return ctx
}
