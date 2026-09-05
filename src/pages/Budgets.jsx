import { useMemo, useState } from 'react'
import { useData } from '../context/DataContext'
import { budgetRows, inMonth } from '../lib/analytics'
import { slotColor } from '../lib/categories'
import { currencySymbol, formatMoney, parseAmount, sum } from '../lib/money'
import BudgetMeter from '../components/BudgetMeter'
import MonthPicker from '../components/MonthPicker'

export default function Budgets() {
  const {
    selectedMonth,
    setSelectedMonth,
    entries,
    budgets,
    categories,
    currency,
    setBudget,
    removeBudget,
  } = useData()
  const [drafts, setDrafts] = useState({})
  const [saving, setSaving] = useState(null)

  const monthEntries = useMemo(() => inMonth(entries, selectedMonth), [entries, selectedMonth])
  const rows = useMemo(
    () => budgetRows(monthEntries, budgets, categories),
    [monthEntries, budgets, categories],
  )
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense' && !c.archived),
    [categories],
  )

  const limitTotal = sum(Object.values(budgets).map((b) => b.limit))
  const spentTotal = sum(rows.map((r) => r.spent))

  async function save(key) {
    setSaving(key)
    try {
      // An empty or zero input clears the budget rather than storing a 0 limit
      // that would read as "instantly over budget".
      const parsed = parseAmount(drafts[key])
      if (parsed == null) await removeBudget(key)
      else await setBudget(key, parsed)
      setDrafts((d) => {
        const next = { ...d }
        delete next[key]
        return next
      })
    } finally {
      setSaving(null)
    }
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Budgets</h1>
        <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />
      </div>

      <div className="card p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">
            Total budget
          </span>
          <span className="tabular text-sm text-ink-2">
            {formatMoney(spentTotal, currency)}
            <span className="text-muted"> / {formatMoney(limitTotal, currency)}</span>
          </span>
        </div>
        <p className="mt-1 text-xs text-muted">
          Limits apply per calendar month and carry over automatically. Income is never counted
          against a budget.
        </p>
      </div>

      {rows.length > 0 && (
        <section className="card divide-y divide-grid px-4">
          {rows.map((r) => (
            <BudgetMeter key={r.key} row={r} currency={currency} />
          ))}
        </section>
      )}

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-ink">Set monthly limits</h2>
        <p className="mb-3 text-xs text-muted">Leave blank to remove a budget.</p>
        <ul className="space-y-2">
          {expenseCategories.map((c) => {
            const current = budgets[c.key]?.limit ?? ''
            const value = drafts[c.key] ?? (current === '' ? '' : String(current))
            const dirty = drafts[c.key] !== undefined
            return (
              <li key={c.key} className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0 rounded-sm"
                  style={{ background: slotColor(c.slot) }}
                />
                <label
                  htmlFor={`budget-${c.key}`}
                  className="min-w-0 flex-1 truncate text-sm text-ink-2"
                >
                  {c.label}
                </label>
                <div className="flex items-center gap-1 rounded-lg border border-hairline bg-surface px-2 focus-within:border-series">
                  <span className="text-xs text-muted">{currencySymbol(currency)}</span>
                  <input
                    id={`budget-${c.key}`}
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setDrafts((d) => ({ ...d, [c.key]: e.target.value }))}
                    onBlur={() => dirty && save(c.key)}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    placeholder="—"
                    className="h-11 w-20 bg-transparent text-right text-sm tabular text-ink outline-none placeholder:text-muted"
                  />
                </div>
                <span className="w-10 shrink-0 text-xs text-muted">
                  {saving === c.key ? 'Saving' : dirty ? 'Unsaved' : ''}
                </span>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
