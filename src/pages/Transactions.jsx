import { useEffect, useMemo, useState } from 'react'
import {
  endOfDay,
  endOfMonth,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
} from 'date-fns'
import { WINDOW_MONTHS, useData } from '../context/DataContext'
import { inMonth, monthWindow, ofType, totals } from '../lib/analytics'
import { resolveCategory } from '../lib/categories'
import { formatMoney } from '../lib/money'
import EntryList from '../components/EntryList'
import MonthPicker from '../components/MonthPicker'
import EntrySheet from '../components/EntrySheet'
import AddButton from '../components/AddButton'

const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'expense', label: 'Expense' },
  { key: 'income', label: 'Income' },
]

const PERIOD_MODES = [
  { key: 'month', label: 'Month' },
  { key: 'range', label: 'Custom dates' },
]

const iso = (d) => format(d, 'yyyy-MM-dd')

/** Quick ranges, each ending today. */
const PRESETS = [
  { key: 'today', label: 'Today', from: (t) => t },
  { key: '7d', label: '7 days', from: (t) => subDays(t, 6) },
  { key: '30d', label: '30 days', from: (t) => subDays(t, 29) },
  { key: 'year', label: 'This year', from: (t) => startOfYear(t) },
]

/**
 * Entries for a custom range. A range inside the live window is answered from
 * the live entries, so edits show up immediately; one that reaches further back
 * is read once from Firestore, and read again whenever the live entries change
 * so an edit made from this list is reflected too.
 */
function useRangeEntries(enabled, start, end) {
  const { entries, selectedMonth, fetchEntriesBetween } = useData()
  const windowStart = monthWindow(selectedMonth, WINDOW_MONTHS).start
  const local = enabled && start >= windowStart && end <= endOfMonth(selectedMonth)
  const [fetched, setFetched] = useState({ rows: [], loading: false, error: null })

  useEffect(() => {
    if (!enabled || local) return
    let cancelled = false
    setFetched((f) => ({ ...f, loading: true, error: null }))
    fetchEntriesBetween(start, end)
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
  }, [enabled, local, start, end, entries, fetchEntriesBetween])

  if (!enabled) return { rows: [], loading: false, error: null }
  if (local) return { rows: entries.filter((e) => e.date >= start && e.date <= end), loading: false, error: null }
  return fetched
}

export default function Transactions() {
  const { selectedMonth, setSelectedMonth, entries, categories, currency } = useData()
  const [mode, setMode] = useState('month')
  const [typeFilter, setTypeFilter] = useState('all')
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const today = iso(new Date())
  // Starts on the month in view, so switching modes keeps the same entries.
  const [fromStr, setFromStr] = useState(() => iso(startOfMonth(selectedMonth)))
  const [toStr, setToStr] = useState(() => iso(new Date()))

  // A blank or half-typed date falls back rather than emptying the list, and a
  // reversed range is read the right way round.
  const [start, end] = useMemo(() => {
    const a = parseISO(fromStr)
    const b = parseISO(toStr)
    const s = isValid(a) ? a : startOfMonth(selectedMonth)
    const e = isValid(b) ? b : new Date()
    return s <= e ? [startOfDay(s), endOfDay(e)] : [startOfDay(e), endOfDay(s)]
  }, [fromStr, toStr, selectedMonth])

  const range = useRangeEntries(mode === 'range', start, end)
  const source = mode === 'range' ? range.rows : inMonth(entries, selectedMonth)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = source
    if (typeFilter !== 'all') rows = ofType(rows, typeFilter)
    return rows.filter(
      (e) => (category === 'all' || e.category === category) && (!q || e.note.toLowerCase().includes(q)),
    )
  }, [source, typeFilter, category, search])

  const t = totals(visible)
  const cat = category === 'all' ? null : resolveCategory(categories, category)
  const periodLabel =
    mode === 'month'
      ? format(selectedMonth, 'MMMM yyyy')
      : iso(start) === iso(end)
        ? format(start, 'd MMM yyyy')
        : `${format(start, start.getFullYear() === end.getFullYear() ? 'd MMM' : 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`

  const headline =
    t.income > 0 && t.expense > 0
      ? { label: 'Net', value: `${t.net < 0 ? '−' : ''}${formatMoney(Math.abs(t.net), currency)}` }
      : t.income > 0
        ? { label: 'Received', value: `+${formatMoney(t.income, currency)}` }
        : { label: 'Spent', value: formatMoney(t.expense, currency) }

  function applyPreset(p) {
    const now = new Date()
    setFromStr(iso(p.from(now)))
    setToStr(iso(now))
  }

  return (
    <div className="space-y-3 p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Transactions</h1>
        {mode === 'month' && <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />}
      </div>

      <Segmented label="Period" options={PERIOD_MODES} value={mode} onChange={setMode} />

      {mode === 'range' && (
        <div className="card space-y-3 p-3">
          <div className="grid grid-cols-2 gap-2">
            <DateField label="From" value={fromStr} max={today} onChange={setFromStr} />
            <DateField label="To" value={toStr} max={today} onChange={setToStr} />
          </div>
          <div role="group" aria-label="Quick ranges" className="flex flex-wrap gap-1.5">
            {PRESETS.map((p) => {
              const active = fromStr === iso(p.from(new Date())) && toStr === today
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => applyPreset(p)}
                  aria-pressed={active}
                  className={`press min-h-[36px] rounded-full border px-3 text-xs ${
                    active ? 'border-series bg-wash font-semibold text-ink' : 'border-hairline text-ink-2'
                  }`}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Filters sit in one row above the content. */}
      <div role="group" aria-label="Filter by type" className="flex gap-1.5">
        {TYPE_FILTERS.map((f) => {
          const active = typeFilter === f.key
          return (
            <button
              key={f.key}
              type="button"
              onClick={() => setTypeFilter(f.key)}
              aria-pressed={active}
              className={`min-h-[44px] rounded-full border px-4 text-xs transition-colors ${
                active
                  ? 'border-series bg-wash font-semibold text-ink'
                  : 'border-hairline text-ink-2'
              }`}
            >
              {f.label}
            </button>
          )
        })}
      </div>

      <div className="flex gap-2">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes"
          aria-label="Search notes"
          className="h-12 min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-series"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className="h-12 min-w-0 max-w-[45%] rounded-lg border border-hairline bg-surface px-2 text-sm text-ink outline-none focus:border-series"
        >
          <option value="all">All categories</option>
          {categories
            .filter((c) => typeFilter === 'all' || c.type === typeFilter)
            .map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
                {c.archived ? ' (archived)' : ''}
              </option>
            ))}
        </select>
      </div>

      {/* The answer to "how much did I spend on X between these dates". */}
      <section className="card p-4" aria-live="polite">
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="flex min-w-0 items-center gap-1.5 text-ink-2">
            {cat && <span aria-hidden="true">{cat.icon}</span>}
            <span className="truncate font-medium">{cat ? cat.label : 'All categories'}</span>
          </span>
          <span className="shrink-0 tabular text-muted">{periodLabel}</span>
        </div>
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs text-muted">{headline.label}</div>
            <div className="tabular truncate text-2xl font-semibold text-ink">
              {range.loading ? '…' : headline.value}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <div className="text-xs text-muted">Transactions</div>
            <div className="tabular text-lg font-semibold text-ink">
              {range.loading ? '…' : visible.length}
            </div>
          </div>
        </div>
        {range.error && (
          <p className="mt-2 text-xs" style={{ color: 'var(--status-critical)' }}>
            {range.error}
          </p>
        )}
      </section>

      <div className="card overflow-hidden">
        <EntryList
          entries={visible}
          currency={currency}
          categories={categories}
          onSelect={setEditing}
          emptyText={range.loading ? 'Loading…' : 'No entries match these filters.'}
        />
      </div>

      <AddButton />
      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function Segmented({ label, options, value, onChange }) {
  return (
    <div role="group" aria-label={label} className="flex rounded-lg border border-hairline bg-surface p-0.5">
      {options.map((o) => {
        const active = o.key === value
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={active}
            className={`min-h-[40px] flex-1 rounded-md text-sm transition-colors ${
              active ? 'bg-wash font-semibold text-ink shadow-sm' : 'text-ink-2'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

function DateField({ label, value, max, onChange }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <input
        type="date"
        value={value}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full min-w-0 rounded-lg border border-hairline bg-surface px-2 text-sm tabular text-ink outline-none focus:border-series"
      />
    </label>
  )
}
