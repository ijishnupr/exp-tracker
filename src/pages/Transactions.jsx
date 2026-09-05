import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { inMonth, ofType, totals } from '../lib/analytics'
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

export default function Transactions() {
  const { selectedMonth, setSelectedMonth, entries, categories, currency } = useData()
  const [typeFilter, setTypeFilter] = useState('all')
  const [category, setCategory] = useState('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    let rows = inMonth(entries, selectedMonth)
    if (typeFilter !== 'all') rows = ofType(rows, typeFilter)
    return rows.filter(
      (e) => (category === 'all' || e.category === category) && (!q || e.note.toLowerCase().includes(q)),
    )
  }, [entries, selectedMonth, typeFilter, category, search])

  const t = totals(visible)

  return (
    <div className="space-y-3 p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Transactions</h1>
        <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />
      </div>

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

      <div className="flex items-baseline justify-between px-1">
        <span className="text-xs text-muted">
          {visible.length} {visible.length === 1 ? 'entry' : 'entries'}
        </span>
        <span className="tabular text-sm font-semibold text-ink">
          {t.income > 0 && t.expense > 0
            ? `Net ${formatMoney(t.net, currency)}`
            : t.income > 0
              ? `+${formatMoney(t.income, currency)}`
              : formatMoney(t.expense, currency)}
        </span>
      </div>

      <div className="card overflow-hidden">
        <EntryList
          entries={visible}
          currency={currency}
          categories={categories}
          onSelect={setEditing}
          emptyText="No entries match these filters."
        />
      </div>

      <AddButton />
      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
    </div>
  )
}
