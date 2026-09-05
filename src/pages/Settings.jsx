import { useState } from 'react'
import { format } from 'date-fns'
import { useAuth } from '../context/AuthContext'
import { useData } from '../context/DataContext'
import { CURRENCIES } from '../lib/currencies'
import { inMonth } from '../lib/analytics'
import { getOpenAddOnLaunch, getTheme, setOpenAddOnLaunch, setTheme } from '../lib/prefs'
import CategoryManager from '../components/CategoryManager'
import CsvImport from '../components/CsvImport'
import SyncPanel from '../components/SyncPanel'

export default function Settings() {
  const { user } = useAuth()
  const {
    selectedMonth,
    entries,
    categories,
    currency,
    setCurrency,
    fetchAllEntries,
    addCategory,
    updateCategory,
    removeCategory,
  } = useData()
  const [status, setStatus] = useState(null)
  const [busy, setBusy] = useState(null)
  const [theme, setThemeState] = useState(getTheme)
  const [openAdd, setOpenAdd] = useState(getOpenAddOnLaunch)

  function applyTheme(next) {
    setThemeState(next)
    if (next === 'system') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', next)
    setTheme(next)
  }

  async function exportRange(range) {
    setBusy(range)
    setStatus(null)
    try {
      const rows = range === 'month' ? inMonth(entries, selectedMonth) : await fetchAllEntries()
      const label = range === 'month' ? format(selectedMonth, 'MMM-yyyy') : 'all-time'
      // Loaded on demand: the xlsx writer is large and unused until now.
      const { exportToExcel } = await import('../lib/excel')
      const fileName = await exportToExcel(rows, { currency, categories, label })
      setStatus({ kind: 'good', text: `Downloaded ${fileName}` })
    } catch (e) {
      setStatus({ kind: 'critical', text: e.message })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <h1 className="text-lg font-semibold text-ink">Settings</h1>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-ink">Account</h2>
        <p className="mt-1 text-sm text-ink-2">{user?.displayName || 'Signed in'}</p>
        <p className="text-xs text-muted">{user?.email}</p>
      </section>

      <SyncPanel />

      <CategoryManager
        categories={categories}
        onAdd={addCategory}
        onUpdate={updateCategory}
        onRemove={removeCategory}
      />

      <CsvImport />

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-ink">Export to Excel</h2>
        <p className="mb-3 text-xs text-muted">
          Two sheets: every transaction, plus a per-category summary split by income and expense.
          Amounts stay real numbers, and a signed column sums straight to your net.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => exportRange('month')}
            disabled={busy !== null}
            className="min-h-[44px] rounded-lg bg-series px-4 text-xs font-semibold text-white disabled:opacity-60"
          >
            {busy === 'month' ? 'Preparing…' : `Export ${format(selectedMonth, 'MMM yyyy')}`}
          </button>
          <button
            type="button"
            onClick={() => exportRange('all')}
            disabled={busy !== null}
            className="min-h-[44px] rounded-lg border border-hairline px-4 text-xs font-medium text-ink-2 disabled:opacity-60"
          >
            {busy === 'all' ? 'Preparing…' : 'Export all time'}
          </button>
        </div>
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
          “All time” needs a connection the first time; the current month exports offline from the
          local cache.
        </p>
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-ink">On launch</h2>
        <label className="mt-2 flex items-start gap-3">
          <input
            type="checkbox"
            checked={openAdd}
            onChange={(e) => {
              setOpenAdd(e.target.checked)
              setOpenAddOnLaunch(e.target.checked)
            }}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--series-1)]"
          />
          <span>
            <span className="block text-sm text-ink">Open the add-entry form</span>
            <span className="block text-xs text-muted">
              On a phone, opening the app goes straight to logging — installed or in a browser.
              Desktop browser tabs open on the dashboard as usual. Per device.
            </span>
          </span>
        </label>
        <p className="mt-3 text-xs text-muted">
          You can also point a shortcut directly at <code>/add</code>, or long-press the app icon
          and pick “Add entry”.
        </p>
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-ink">Currency</h2>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          aria-label="Currency"
          className="mt-2 h-12 w-full rounded-lg border border-hairline bg-surface px-3 text-sm text-ink outline-none focus:border-series"
        >
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.symbol} — {c.label} ({c.code})
            </option>
          ))}
        </select>
        <p className="mt-2 text-xs text-muted">
          Display only — changing it does not convert amounts already recorded.
        </p>
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-ink">Appearance</h2>
        <div className="mt-2 flex gap-2">
          {['system', 'light', 'dark'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => applyTheme(t)}
              aria-pressed={theme === t}
              className={`min-h-[44px] flex-1 rounded-lg border px-3 text-xs capitalize ${
                theme === t
                  ? 'border-series bg-wash font-semibold text-ink'
                  : 'border-hairline text-ink-2'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      <p className="px-1 text-xs text-muted">
        Data lives in your own Firebase project under <code>users/{user?.uid?.slice(0, 6)}…</code>{' '}
        and is readable only by you.
      </p>
    </div>
  )
}
