import { Suspense, lazy, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { subMonths } from 'date-fns'
import { WINDOW_MONTHS, useData } from '../context/DataContext'
import {
  budgetStatus,
  inMonth,
  monthProgress,
  monthlyTotals,
  projectSpend,
} from '../lib/analytics'
import { resolveCategory } from '../lib/categories'
import { formatMoney, percentChange, round2, sum } from '../lib/money'
import BackHeader from '../components/BackHeader'
import EntryList from '../components/EntryList'
import EntrySheet from '../components/EntrySheet'
import MonthPicker from '../components/MonthPicker'

const MonthlyTrendChart = lazy(() => import('../components/MonthlyTrendChart'))

const ROLE_COLOR = {
  good: 'var(--status-good)',
  warning: 'var(--status-warning)',
  serious: 'var(--status-serious)',
  critical: 'var(--status-critical)',
  none: 'var(--baseline)',
}

/** One category up close: this month against its budget and last month, the
 *  six-month trend, and every entry behind the number. */
export default function CategoryDetail() {
  const { key: rawKey } = useParams()
  const key = decodeURIComponent(rawKey ?? '')
  const { selectedMonth, setSelectedMonth, entries, budgets, categories, currency } = useData()
  const [editing, setEditing] = useState(null)

  const cat = resolveCategory(categories, key)
  const income = cat.type === 'income'
  const mine = useMemo(() => entries.filter((e) => e.category === key), [entries, key])
  const monthRows = useMemo(() => inMonth(mine, selectedMonth), [mine, selectedMonth])
  const prevRows = useMemo(() => inMonth(mine, subMonths(selectedMonth, 1)), [mine, selectedMonth])
  const trend = useMemo(
    () => monthlyTotals(mine, selectedMonth, WINDOW_MONTHS),
    [mine, selectedMonth],
  )

  const total = sum(monthRows.map((e) => e.amount))
  const prevTotal = sum(prevRows.map((e) => e.amount))
  const change = prevTotal ? percentChange(total, prevTotal) : null
  const windowTotal = sum(trend.map((m) => (income ? m.income : m.expense)))
  const monthlyAvg = round2(windowTotal / WINDOW_MONTHS)
  const largest = monthRows.reduce((m, e) => (e.amount > (m?.amount ?? 0) ? e : m), null)

  const limit = income ? 0 : (budgets[key]?.limit ?? 0)
  const status = budgetStatus(total, limit)
  const progress = monthProgress(selectedMonth)
  const projected = limit ? projectSpend(total, monthRows.length, progress) : null

  return (
    <div className="space-y-4 p-4 pb-20">
      <BackHeader title={cat.label} icon={cat.icon} />

      <section className="card p-4">
        {/* The month picker lives here rather than in the header, where it
            squeezed the category name down to a few letters on a phone. */}
        <div className="-mr-2 -mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted">{income ? 'Received' : 'Spent'}</span>
          <MonthPicker month={selectedMonth} onChange={setSelectedMonth} />
        </div>
        <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
          <span
            className="tabular text-3xl font-semibold"
            style={{ color: income ? 'var(--series-income)' : 'var(--text-primary)' }}
          >
            {formatMoney(total, currency)}
          </span>
          {limit > 0 && (
            <span className="tabular text-sm text-muted">of {formatMoney(limit, currency)}</span>
          )}
        </div>
        {change != null && (
          <div className="mt-1 text-xs text-ink-2">
            <span aria-hidden="true">{change > 0 ? '▲' : '▼'} </span>
            <span className="tabular">{Math.abs(change).toFixed(0)}%</span>
            <span className="text-muted"> vs last month ({formatMoney(prevTotal, currency)})</span>
          </div>
        )}

        {limit > 0 && (
          <div className="mt-3">
            <div
              className="h-2.5 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--wash)' }}
              role="progressbar"
              aria-valuenow={Math.round(status.ratio * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${Math.round(status.ratio * 100)}% of budget used, ${status.status}`}
            >
              <div
                className="anim-bar h-full rounded-full"
                style={{
                  width: `${Math.min(status.ratio * 100, 100)}%`,
                  background: ROLE_COLOR[status.role],
                }}
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 text-xs">
              <span style={{ color: ROLE_COLOR[status.role] }}>
                <span aria-hidden="true">{status.statusIcon} </span>
                <span className="font-medium">{status.status}</span>
                <span className="tabular text-muted"> · {Math.round(status.ratio * 100)}%</span>
              </span>
              <span className="ml-auto tabular text-muted">
                {limit - total >= 0
                  ? `${formatMoney(limit - total, currency)} left`
                  : `${formatMoney(total - limit, currency)} over`}
              </span>
            </div>
            {projected != null && total < limit && (
              <p
                className="mt-1 text-xs"
                style={{ color: projected > limit ? 'var(--status-serious)' : 'var(--text-muted)' }}
              >
                <span aria-hidden="true">{projected > limit ? '▲ ' : '→ '}</span>
                At this pace: <span className="tabular font-medium">{formatMoney(projected, currency)}</span> by
                month end
                {projected > limit ? `, ${formatMoney(projected - limit, currency)} over` : ', within budget'}
              </p>
            )}
          </div>
        )}

        <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-grid pt-3">
          <Stat label="Transactions" value={monthRows.length.toLocaleString()} />
          <Stat label="Monthly avg" value={formatMoney(monthlyAvg, currency, { compact: true })} hint={`last ${WINDOW_MONTHS} months`} />
          <Stat
            label="Largest"
            value={largest ? formatMoney(largest.amount, currency, { compact: true }) : '—'}
          />
        </dl>
      </section>

      <section className="card p-4">
        <h2 className="text-sm font-semibold text-ink">Last {WINDOW_MONTHS} months</h2>
        <p className="mb-2 text-xs tabular text-muted">
          {formatMoney(windowTotal, currency)} in total
        </p>
        <Suspense fallback={<div className="h-[210px] w-full" aria-hidden="true" />}>
          <MonthlyTrendChart
            data={trend}
            currency={currency}
            showIncome={income}
            showExpense={!income}
          />
        </Suspense>
      </section>

      <section className="card overflow-hidden">
        <div className="flex items-baseline justify-between gap-3 px-4 pt-4">
          <h2 className="text-sm font-semibold text-ink">Entries</h2>
          <Link
            to={`/transactions?mode=all&category=${encodeURIComponent(key)}`}
            className="shrink-0 text-xs font-medium text-series"
          >
            All time ›
          </Link>
        </div>
        <EntryList
          entries={monthRows}
          currency={currency}
          categories={categories}
          onSelect={setEditing}
          emptyText={`Nothing in ${cat.label} this month.`}
        />
      </section>

      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function Stat({ label, value, hint }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-xs text-muted">{label}</dt>
      <dd className="tabular truncate text-sm font-semibold text-ink">{value}</dd>
      {hint && <dd className="truncate text-[11px] text-muted">{hint}</dd>}
    </div>
  )
}
