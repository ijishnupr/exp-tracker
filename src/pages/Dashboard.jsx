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
import CategoryBreakdown from '../components/CategoryBreakdown'
import MonthPicker from '../components/MonthPicker'
import EntryList from '../components/EntryList'
import EntrySheet from '../components/EntrySheet'
import AddButton from '../components/AddButton'

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
  // Totals for the whole subscribed window, so the trend chart carries its own
  // bottom line rather than leaving the reader to add six bars by eye.
  const windowTotal = useMemo(() => totals(entries), [entries])
  const hasIncome = useMemo(() => entries.some((e) => e.type === 'income'), [entries])

  const spendCats = useMemo(
    () => categoryTotals(monthEntries, categories, 'expense'),
    [monthEntries, categories],
  )
  const incomeCats = useMemo(
    () => categoryTotals(monthEntries, categories, 'income'),
    [monthEntries, categories],
  )

  const rows = useMemo(
    () => budgetRows(monthEntries, budgets, categories),
    [monthEntries, budgets, categories],
  )
  const alerts = useMemo(() => budgetAlerts(rows), [rows])
  const budgetTotal = sum(rows.map((r) => r.limit))
  const recent = monthEntries.slice(0, 5)

  // Compact figures: three exact amounts side by side overflow a narrow phone
  // once the numbers get long, and the shape of the total is what this row is
  // for — the exact figures for the month in view are in the tiles above.
  const windowRows = hasIncome
    ? [
        ['Income', windowTotal.income],
        ['Spent', windowTotal.expense],
        ['Net', windowTotal.net],
      ]
    : [['Spent', windowTotal.expense]]

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
        {/* The running totals behind the bars. Two or three numbers side by
            side are a stat row, not a second chart — the bars already carry
            the shape, so repeating them as a pair of columns would say
            nothing new. */}
        <div className="mt-3 border-t border-grid pt-3">
          {/* The window is named once, above the columns. Repeating it in each
              label overflowed the narrowest phones. */}
          <p className="text-[11px] text-muted">Totals across these {WINDOW_MONTHS} months</p>
          <dl className="mt-1 flex items-baseline gap-4">
            {windowRows.map(([label, value]) => (
              <div key={label} className="min-w-0 flex-1">
                <dt className="truncate text-[11px] text-muted">{label}</dt>
                <dd
                  className="mt-0.5 truncate text-sm font-semibold text-ink"
                  title={formatMoney(value, currency)}
                >
                  {formatMoney(value, currency, { compact: true })}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Side by side once there is room: spending and income are read against
          each other, and stacking them on a wide screen buries the second one
          below the fold for no reason. `items-start` keeps each card its own
          height rather than stretching the shorter one. */}
      <div className="grid items-start gap-4 sm:grid-cols-2">
        <CategoryBreakdown
          title="Spending by category"
          rows={spendCats}
          total={t.expense}
          currency={currency}
          color="var(--series-expense)"
          shareNote="of spending"
          emptyText="Nothing recorded yet"
        />

        {/* Only when there is income this month — an empty card would be a row
            of chrome around no data. */}
        {incomeCats.length > 0 && (
          <CategoryBreakdown
            title="Income by category"
            rows={incomeCats}
            total={t.income}
            currency={currency}
            color="var(--series-income)"
            shareNote="of income"
          />
        )}
      </div>

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

/** Days of the month elapsed — the full month once it is in the past, so a
 *  daily average is not inflated by a partial month. */
function daysElapsed(month) {
  const now = new Date()
  const sameMonth = month.getFullYear() === now.getFullYear() && month.getMonth() === now.getMonth()
  if (sameMonth) return Math.max(now.getDate(), 1)
  return new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
}
