import { useMemo, useState } from 'react'
import { subMonths } from 'date-fns'
import { WINDOW_MONTHS, useData } from '../context/DataContext'
import {
  budgetAlerts,
  budgetRows,
  categoryTotals,
  inMonth,
  monthlyTotals,
  totals,
} from '../lib/analytics'
import { formatMoney, sum } from '../lib/money'
import StatTile from '../components/StatTile'
import MonthlyTrendChart from '../components/MonthlyTrendChart'
import CategoryBarChart from '../components/CategoryBarChart'
import MonthPicker from '../components/MonthPicker'
import EntryList from '../components/EntryList'
import EntrySheet from '../components/EntrySheet'
import AddButton from '../components/AddButton'

/** Beyond this many categories the chart folds its tail into one "Other" row
 *  rather than stacking up rows nobody can compare. */
const CHART_CATEGORY_CAP = 7

export default function Dashboard() {
  const { selectedMonth, setSelectedMonth, entries, budgets, categories, currency, loading } =
    useData()
  const [editing, setEditing] = useState(null)

  const monthEntries = useMemo(() => inMonth(entries, selectedMonth), [entries, selectedMonth])
  const prevEntries = useMemo(
    () => inMonth(entries, subMonths(selectedMonth, 1)),
    [entries, selectedMonth],
  )

  const t = totals(monthEntries)
  const prev = totals(prevEntries)
  const trend = useMemo(
    () => monthlyTotals(entries, selectedMonth, WINDOW_MONTHS),
    [entries, selectedMonth],
  )
  const hasIncome = useMemo(() => entries.some((e) => e.type === 'income'), [entries])

  const cats = useMemo(
    () => categoryTotals(monthEntries, categories, 'expense'),
    [monthEntries, categories],
  )
  const chartCats = useMemo(() => foldTail(cats, CHART_CATEGORY_CAP), [cats])

  const rows = useMemo(
    () => budgetRows(monthEntries, budgets, categories),
    [monthEntries, budgets, categories],
  )
  const alerts = useMemo(() => budgetAlerts(rows), [rows])
  const budgetTotal = sum(rows.map((r) => r.limit))
  const recent = monthEntries.slice(0, 5)

  return (
    <div className="space-y-4 p-4 pb-20">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-ink">Overview</h1>
        <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {alerts.length > 0 && (
        <div role="status" className="card p-3" style={{ borderColor: 'var(--status-serious)' }}>
          <div
            className="flex items-center gap-2 text-sm font-semibold"
            style={{ color: 'var(--status-serious)' }}
          >
            <span aria-hidden="true">▲</span>
            <span>
              {alerts.length === 1
                ? '1 budget needs attention'
                : `${alerts.length} budgets need attention`}
            </span>
          </div>
          <ul className="mt-1.5 space-y-0.5 text-xs text-ink-2">
            {alerts.map((a) => (
              <li key={a.key}>
                <span className="font-medium">{a.label}</span> — {a.status.toLowerCase()},{' '}
                <span className="tabular">
                  {a.remaining >= 0
                    ? `${formatMoney(a.remaining, currency)} left`
                    : `${formatMoney(-a.remaining, currency)} over`}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {hasIncome && (
          <StatTile
            label="Income"
            amount={t.income}
            currency={currency}
            tone="income"
            compare={prev.income || null}
            compact
          />
        )}
        <StatTile
          label="Spent"
          amount={t.expense}
          currency={currency}
          compare={prev.expense || null}
          compact
        />
        {hasIncome ? (
          <div className="col-span-2 sm:col-span-1">
            <StatTile
              label="Net"
              amount={t.net}
              currency={currency}
              signed
              compact
              tone={t.net < 0 ? 'critical' : 'neutral'}
              hint={t.net < 0 ? 'spent more than earned' : 'kept this month'}
            />
          </div>
        ) : (
          <StatTile
            label={budgetTotal ? 'Budget left' : 'Daily average'}
            amount={
              budgetTotal
                ? Math.max(budgetTotal - t.expense, 0)
                : t.expense / daysElapsed(selectedMonth)
            }
            currency={currency}
            hint={
              budgetTotal
                ? t.expense > budgetTotal
                  ? `${formatMoney(t.expense - budgetTotal, currency)} over budget`
                  : `of ${formatMoney(budgetTotal, currency)}`
                : 'per day so far'
            }
            tone={budgetTotal && t.expense > budgetTotal ? 'critical' : 'neutral'}
          />
        )}
      </div>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-ink">
          {hasIncome ? 'Income vs spending' : 'Monthly spending'}
        </h2>
        <p className="mb-2 text-xs text-muted">Last {WINDOW_MONTHS} months</p>
        <MonthlyTrendChart data={trend} currency={currency} showIncome={hasIncome} />
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-ink">Spending by category</h2>
        <p className="mb-3 text-xs text-muted">
          {cats.length ? 'Largest first' : 'Nothing recorded yet'}
        </p>
        {cats.length > 0 && <CategoryBarChart data={chartCats} currency={currency} />}
        {cats.length > 0 && (
          <ul className="mt-3 space-y-1 border-t border-grid pt-3 text-xs">
            {cats.map((c) => (
              <li key={c.key} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-sm"
                    style={{ background: c.color }}
                  />
                  <span className="truncate text-ink-2">{c.label}</span>
                </span>
                <span className="shrink-0 tabular text-muted">
                  {formatMoney(c.total, currency)} · {c.share.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-center justify-between p-4 pb-0">
          <h2 className="text-sm font-semibold text-ink">Recent</h2>
          {loading && <span className="text-xs text-muted">Loading…</span>}
        </div>
        <EntryList
          entries={recent}
          currency={currency}
          categories={categories}
          onSelect={setEditing}
        />
      </section>

      <AddButton />
      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

/** Keeps the top `cap` categories and sums the rest into a single grey "Other"
 *  row, so the chart never needs a ninth colour. */
function foldTail(rows, cap) {
  if (rows.length <= cap) return rows
  const head = rows.slice(0, cap)
  const tail = rows.slice(cap)
  return [
    ...head,
    {
      key: '__other',
      label: `Other (${tail.length})`,
      icon: '📦',
      color: 'var(--baseline)',
      total: sum(tail.map((t) => t.total)),
      share: tail.reduce((acc, r) => acc + r.share, 0),
    },
  ]
}

/** Days of the month elapsed — the full month once it is in the past, so a
 *  daily average is not inflated by a partial month. */
function daysElapsed(month) {
  const now = new Date()
  const sameMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth()
  if (sameMonth) return Math.max(now.getDate(), 1)
  return new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
}
