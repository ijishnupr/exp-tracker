import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  endOfDay,
  format,
  isValid,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
  subDays,
} from 'date-fns'
import { useData } from '../context/DataContext'
import { inMonth, ofType, totals } from '../lib/analytics'
import { useRangeEntries } from '../lib/useRangeEntries'
import { resolveCategory } from '../lib/categories'
import { formatMoney } from '../lib/money'
import EntryList from '../components/EntryList'
import MonthPicker from '../components/MonthPicker'
import EntrySheet from '../components/EntrySheet'
import AddButton from '../components/AddButton'
import DateField from '../components/DateField'

const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'expense', label: 'Expense' },
  { key: 'income', label: 'Income' },
]

const PERIOD_MODES = [
  { key: 'month', label: 'Month' },
  { key: 'range', label: 'Custom dates' },
  { key: 'all', label: 'All time' },
]

const iso = (d) => format(d, 'yyyy-MM-dd')

/** Quick ranges, each ending today. */
const PRESETS = [
  { key: 'today', label: 'Today', from: (t) => t },
  { key: '7d', label: '7 days', from: (t) => subDays(t, 6) },
  { key: '30d', label: '30 days', from: (t) => subDays(t, 29) },
  { key: 'year', label: 'This year', from: (t) => startOfYear(t) },
]

export default function Transactions() {
  const { selectedMonth, setSelectedMonth, entries, categories, currency } = useData()
  // ?mode= and ?category= seed the view, so the category page can link
  // straight to "everything in Fuel, all time".
  const [params] = useSearchParams()
  const [mode, setMode] = useState(() =>
    PERIOD_MODES.some((m) => m.key === params.get('mode')) ? params.get('mode') : 'month',
  )
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryChoice, setCategory] = useState(() => params.get('category') ?? 'all')
  const categoryOptions = useMemo(
    () => categories.filter((c) => typeFilter === 'all' || c.type === typeFilter),
    [categories, typeFilter],
  )
  // A category the type filter hides (Fuel, then "Income"), or one named by a
  // link that does not exist, must not keep filtering the list invisibly while
  // the menu reads "All categories". The choice is kept, so switching the type
  // back restores it.
  const category =
    categoryChoice === 'all' || categoryOptions.some((c) => c.key === categoryChoice)
      ? categoryChoice
      : 'all'
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

  const range = useRangeEntries({
    enabled: mode !== 'month',
    start: mode === 'all' ? null : start,
    end: mode === 'all' ? null : end,
  })
  const monthRows = useMemo(() => inMonth(entries, selectedMonth), [entries, selectedMonth])
  const source = mode === 'month' ? monthRows : range.rows

  // Search reads the note, the category's name and the amount, so "fuel",
  // "plumber" and "2500" all find what you would expect.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    const qAmount = q.replace(/[,\s₹$€£]/g, '')
    const labels = new Map(categories.map((c) => [c.key, c.label.toLowerCase()]))
    let rows = source
    if (typeFilter !== 'all') rows = ofType(rows, typeFilter)
    return rows.filter((e) => {
      if (category !== 'all' && e.category !== category) return false
      if (!q) return true
      return (
        e.note.toLowerCase().includes(q) ||
        (labels.get(e.category) ?? e.category).includes(q) ||
        (qAmount !== '' && /^\d+(\.\d+)?$/.test(qAmount) && String(e.amount).startsWith(qAmount))
      )
    })
  }, [source, typeFilter, category, search, categories])

  const t = totals(visible)
  const cat = category === 'all' ? null : resolveCategory(categories, category)
  const periodLabel =
    mode === 'month'
      ? format(selectedMonth, 'MMMM yyyy')
      : mode === 'all'
        ? 'All time'
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
          placeholder={mode === 'all' ? 'Search all entries' : 'Search notes, categories, amounts'}
          aria-label="Search entries"
          className="h-12 min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-series"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          aria-label="Filter by category"
          className="h-12 min-w-0 max-w-[45%] rounded-lg border border-hairline bg-surface px-2 text-sm text-ink outline-none focus:border-series"
        >
          <option value="all">All categories</option>
          {categoryOptions.map((c) => (
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

      {/* A search that finds nothing in one month most likely wants the rest
          of the history, so offer it rather than leaving a dead end. */}
      {mode === 'month' && search.trim() && (
        <button
          type="button"
          onClick={() => setMode('all')}
          className="press w-full rounded-lg border border-hairline bg-surface px-3 py-2.5 text-left text-sm text-ink-2"
        >
          <span aria-hidden="true">⌕ </span>
          Search all months for “<span className="font-medium text-ink">{search.trim()}</span>” ›
        </button>
      )}

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
