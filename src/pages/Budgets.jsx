import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useData } from '../context/DataContext'
import { budgetRows, inMonth, isExpense, monthProgress } from '../lib/analytics'
import { currencySymbol, formatMoney, parseAmount, sum } from '../lib/money'
import BudgetMeter from '../components/BudgetMeter'
import BudgetSummary from '../components/BudgetSummary'
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
    () => budgetRows(monthEntries, budgets, categories, monthProgress(selectedMonth)),
    [monthEntries, budgets, categories, selectedMonth],
  )
  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense' && !c.archived),
    [categories],
  )

  // Budgeted categories are measured against their limit; the rest is spend
  // with nothing to measure against, so it gets a plain list of its own rather
  // than a row of empty meters.
  const budgeted = rows.filter((r) => r.limit > 0)
  const unbudgeted = rows.filter((r) => r.limit === 0)
  const limitTotal = sum(budgeted.map((r) => r.limit))
  const budgetedSpent = sum(budgeted.map((r) => r.spent))
  const unbudgetedSpent = sum(unbudgeted.map((r) => r.spent))
  const txnCount = monthEntries.filter(isExpense).length

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

      <BudgetSummary
        month={selectedMonth}
        limit={limitTotal}
        spent={budgetedSpent}
        unbudgeted={unbudgetedSpent}
        count={txnCount}
        budgetedCount={sum(budgeted.map((r) => r.count))}
        over={budgeted.filter((r) => r.spent > r.limit).length}
        currency={currency}
      />

      {budgeted.length > 0 && (
        <section className="card px-4 pt-3">
          <SectionHeading title="By category" detail={`${budgeted.length} budgeted`} />
          <div className="divide-y divide-grid">
            {budgeted.map((r, i) => (
              <BudgetMeter key={r.key} row={r} currency={currency} index={i} />
            ))}
          </div>
        </section>
      )}

      {unbudgeted.length > 0 && (
        <section className="card px-4 py-3">
          <SectionHeading
            title="Spending without a budget"
            detail={formatMoney(unbudgetedSpent, currency)}
          />
          <ul className="mt-1 space-y-0.5">
            {unbudgeted.map((r) => (
              <li key={r.key}>
                <Link
                  to={`/category/${encodeURIComponent(r.key)}`}
                  className="-mx-2 flex items-baseline justify-between gap-3 rounded-md px-2 py-1 text-sm hover:bg-wash"
                >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span aria-hidden="true">{r.icon}</span>
                  <span className="truncate text-ink-2">{r.label}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {r.count} {r.count === 1 ? 'txn' : 'txns'}
                  </span>
                </span>
                <span className="shrink-0 tabular text-ink-2">{formatMoney(r.spent, currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-ink">Monthly limits</h2>
        <p className="mb-3 mt-0.5 text-xs text-muted">
          Limits apply to every month until you change them. Leave one blank to remove it. Income
          never counts against a budget.
        </p>
        <ul className="divide-y divide-grid">
          {expenseCategories.map((c) => {
            const current = budgets[c.key]?.limit ?? ''
            const value = drafts[c.key] ?? (current === '' ? '' : String(current))
            const dirty = drafts[c.key] !== undefined
            const state = saving === c.key ? 'Saving…' : dirty ? 'Unsaved' : ''
            return (
              <li key={c.key} className="flex items-center gap-3 py-1.5">
                <span aria-hidden="true" className="w-5 shrink-0 text-center">
                  {c.icon}
                </span>
                <label htmlFor={`budget-${c.key}`} className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink-2">{c.label}</span>
                  {state && <span className="block text-[11px] text-muted">{state}</span>}
                </label>
                <div className="flex items-center gap-1 rounded-lg border border-hairline bg-surface px-2.5 focus-within:border-series">
                  <span className="text-xs text-muted">{currencySymbol(currency)}</span>
                  <input
                    id={`budget-${c.key}`}
                    type="text"
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => setDrafts((d) => ({ ...d, [c.key]: e.target.value }))}
                    onBlur={() => dirty && save(c.key)}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    placeholder="No limit"
                    className="h-11 w-24 bg-transparent text-right text-sm tabular text-ink outline-none placeholder:text-muted"
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

function SectionHeading({ title, detail }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <h2 className="text-sm font-semibold text-ink">{title}</h2>
      {detail && <span className="shrink-0 tabular text-xs text-muted">{detail}</span>}
    </div>
  )
}
