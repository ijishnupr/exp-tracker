/* Dev-only visual harness: renders the real pages against seeded data so the
   layout and charts can be checked without a live Firebase project.
   Reached at /preview.html during `npm run dev`; not part of the build. */
import { StrictMode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { startOfMonth, subDays, subMonths } from 'date-fns'
import { AuthContext } from './context/AuthContext'
import { DataContext } from './context/DataContext'
import { DEFAULT_CATEGORIES } from './lib/categories'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Sheet from './components/Sheet'
import EntryForm from './components/EntryForm'
import './index.css'
import { applyThemeColor, watchSystemTheme } from './lib/theme'

const EXPENSE_NOTES = ['Lunch', 'Metro card', 'Weekly shop', 'Electricity', 'Sneakers',
                       'Pharmacy', 'Cinema', 'Coffee', 'Cab home', 'Vegetables', 'Petrol']
const INCOME_NOTES = ['August salary', 'Freelance invoice', 'Interest', 'Refund', 'Gift']

// Deterministic PRNG so screenshots are comparable between runs.
let seed = 42
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648)

const CATEGORIES = DEFAULT_CATEGORIES.map((c, i) => ({ ...c, archived: false, order: i }))
const EXPENSE_CATS = CATEGORIES.filter((c) => c.type === 'expense')
const INCOME_CATS = CATEGORIES.filter((c) => c.type === 'income')

function seedEntries() {
  const rows = []
  for (let i = 0; i < 110; i += 1) {
    const income = rnd() > 0.82
    const pool = income ? INCOME_CATS : EXPENSE_CATS
    const cat = pool[Math.floor(rnd() * pool.length)]
    rows.push({
      id: `seed-${i}`,
      type: income ? 'income' : 'expense',
      amount: income
        ? Math.round((8000 + rnd() * 40000) / 100) * 100
        : Math.round((80 + rnd() * 2600) / 10) * 10,
      category: cat.key,
      note:
        rnd() > 0.4
          ? (income ? INCOME_NOTES : EXPENSE_NOTES)[
              Math.floor(rnd() * (income ? INCOME_NOTES : EXPENSE_NOTES).length)
            ]
          : '',
      date: subDays(new Date(), Math.floor(rnd() * 165)),
    })
  }
  return rows.sort((a, b) => b.date - a.date)
}

function Harness() {
  // ?month=-1 steps back a month, so a full month of data (and its budget
  // alerts) can be screenshotted rather than just the few days so far.
  const offset = Number(new URLSearchParams(location.search).get('month') ?? 0)
  const [selectedMonth, setSelectedMonth] = useState(() =>
    startOfMonth(subMonths(new Date(), -offset)),
  )
  const [categories, setCategories] = useState(CATEGORIES)
  const entries = useMemo(seedEntries, [])

  const auth = {
    user: {
      uid: 'preview-uid',
      displayName: 'Preview User',
      email: 'preview@example.com',
      photoURL: '',
    },
    loading: false,
    stalled: false,
    error: null,
    clearError: () => {},
    signInWithGoogle: async () => {},
    logOut: () => {},
  }

  const data = {
    selectedMonth,
    setSelectedMonth,
    entries,
    budgets: {
      food: { limit: 9000 },
      transport: { limit: 3000 },
      groceries: { limit: 12000 },
      bills: { limit: 5000 },
      shopping: { limit: 4000 },
      entertainment: { limit: 2500 },
      fuel: { limit: 4000 },
    },
    categories,
    categoriesLoaded: true,
    profile: { currency: 'INR' },
    currency: 'INR',
    loading: false,
    pendingWrites: new URLSearchParams(location.search).get('pending') === '1',
    pendingCount: new URLSearchParams(location.search).get('pending') === '1' ? 3 : 0,
    lastSyncedAt: Date.now() - 1000 * 60 * 7,
    syncNow: async () => Date.now(),
    error: null,
    dismissError: () => {},
    addEntry: async () => {},
    updateEntry: async () => {},
    deleteEntry: async () => {},
    setBudget: async () => {},
    removeBudget: async () => {},
    setCurrency: () => {},
    addCategory: async ({ label, icon, type }) =>
      setCategories((cs) => [
        ...cs,
        { key: `new-${cs.length}`, label, icon: icon || '📦', type, slot: (cs.length % 8) + 1, order: cs.length },
      ]),
    updateCategory: async (key, patch) =>
      setCategories((cs) => cs.map((c) => (c.key === key ? { ...c, ...patch } : c))),
    removeCategory: async (key) => {
      setCategories((cs) => cs.filter((c) => c.key !== key))
      return { archived: false, entries: 0 }
    },
    fetchAllEntries: async () => entries,
    importEntries: async () => 0,
  }

  return (
    <AuthContext.Provider value={auth}>
      <DataContext.Provider value={data}>
        <Routes>
          <Route path="login" element={<Login />} />
          {/* Edit mode, so the delete flow is reachable without a click. */}
          <Route
            path="edit"
            element={
              <Sheet title="Edit entry" onClose={() => {}}>
                <EntryForm
                  entry={entries[0]}
                  currency="INR"
                  categories={categories}
                  onCancel={() => {}}
                  onSubmit={async () => {}}
                  onDelete={() => {}}
                />
              </Sheet>
            }
          />
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="transactions" element={<Transactions />} />
            <Route path="budgets" element={<Budgets />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </DataContext.Provider>
    </AuthContext.Provider>
  )
}

// A MemoryRouter avoids needing the dev server to serve this secondary HTML
// entry at nested paths; ?page= picks the starting route (append &add=1 to open
// the entry sheet).
applyThemeColor()
watchSystemTheme()

const page = new URLSearchParams(location.search).get('page') ?? '/'
const add = new URLSearchParams(location.search).get('add') === '1'
const entry = `${page.startsWith('/') ? page : `/${page}`}${add ? '?add=1' : ''}`

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MemoryRouter initialEntries={[entry]}>
      <Harness />
    </MemoryRouter>
  </StrictMode>,
)
