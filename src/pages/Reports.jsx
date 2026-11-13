import { Suspense, lazy, useMemo, useState } from 'react'
import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  endOfDay,
  endOfMonth,
  endOfYear,
  format,
  isValid,
  min as minDate,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfYear,
  subMonths,
  subYears,
} from 'date-fns'
import { useData } from '../context/DataContext'
import { categoryTotals, monthlyTotalsBetween, ofType, totals } from '../lib/analytics'
import { resolveCategory } from '../lib/categories'
import { formatMoney } from '../lib/money'
import { useRangeEntries } from '../lib/useRangeEntries'
import BackHeader from '../components/BackHeader'
import CategoryBreakdown from '../components/CategoryBreakdown'
import DateField from '../components/DateField'
import EntrySheet from '../components/EntrySheet'

const MonthlyTrendChart = lazy(() => import('../components/MonthlyTrendChart'))

const iso = (d) => format(d, 'yyyy-MM-dd')

/** Each preset returns [start, end]; none of them reach past today. */
const PRESETS = [
  { key: 'month', label: 'This month', range: (t) => [startOfMonth(t), t] },
  { key: 'last', label: 'Last month', range: (t) => [startOfMonth(subMonths(t, 1)), endOfMonth(subMonths(t, 1))] },
  { key: '3m', label: '3 months', range: (t) => [startOfMonth(subMonths(t, 2)), t] },
  { key: '6m', label: '6 months', range: (t) => [startOfMonth(subMonths(t, 5)), t] },
  { key: 'year', label: 'This year', range: (t) => [startOfYear(t), t] },
  { key: 'lastyear', label: 'Last year', range: (t) => [startOfYear(subYears(t, 1)), endOfYear(subYears(t, 1))] },
  { key: 'custom', label: 'Custom' },
]

/** How many expenses the "largest" list shows. */
const TOP_N = 5

export default function Reports() {
  const { categories, currency } = useData()
  const [preset, setPreset] = useState('year')
  const [editing, setEditing] = useState(null)
  const today = new Date()
  const [fromStr, setFromStr] = useState(() => iso(startOfMonth(subMonths(today, 2))))
  const [toStr, setToStr] = useState(() => iso(today))

  const [start, end] = useMemo(() => {
    const now = new Date()
    if (preset !== 'custom') {
      const [s, e] = PRESETS.find((p) => p.key === preset).range(now)
      return [startOfDay(s), endOfDay(e)]
    }
    const a = parseISO(fromStr)
    const b = parseISO(toStr)
    const s = isValid(a) ? a : startOfMonth(now)
    const e = isValid(b) ? b : now
    return s <= e ? [startOfDay(s), endOfDay(e)] : [startOfDay(e), endOfDay(s)]
  }, [preset, fromStr, toStr])

  const { rows, loading, error } = useRangeEntries({ start, end })

  const t = totals(rows)
  const expenses = useMemo(() => ofType(rows, 'expense'), [rows])
  const spendCats = useMemo(() => categoryTotals(rows, categories, 'expense'), [rows, categories])
  const incomeCats = useMemo(() => categoryTotals(rows, categories, 'income'), [rows, categories])
  const largest = useMemo(
    () => [...expenses].sort((a, b) => b.amount - a.amount).slice(0, TOP_N),
    [expenses],
  )
  // A range ending today is averaged over the days so far, not the whole span.
  const days = differenceInCalendarDays(minDate([end, today]), start) + 1
  const months = differenceInCalendarMonths(end, start) + 1
  const trend = useMemo(() => monthlyTotalsBetween(rows, start, end), [rows, start, end])
  const savingsRate = t.income > 0 ? (t.net / t.income) * 100 : null

  const sameYear = start.getFullYear() === end.getFullYear()
  const periodLabel =
    iso(start) === iso(end)
      ? format(start, 'd MMM yyyy')
      : `${format(start, sameYear ? 'd MMM' : 'd MMM yyyy')} – ${format(end, 'd MMM yyyy')}`

  return (
    <div className="space-y-4 p-4 pb-20">
      <BackHeader title="Report" />

      <div role="group" aria-label="Report period" className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => {
          const active = preset === p.key
          return (
            <button
              key={p.key}
              type="button"
              onClick={() => setPreset(p.key)}
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

      {preset === 'custom' && (
        <div className="card grid grid-cols-2 gap-2 p-3">
          <DateField label="From" value={fromStr} max={iso(today)} onChange={setFromStr} />
          <DateField label="To" value={toStr} max={iso(today)} onChange={setToStr} />
        </div>
      )}

      <section className="card p-4" aria-live="polite">
        <div className="flex items-baseline justify-between gap-3 text-xs">
          <span className="tabular font-medium text-ink-2">{periodLabel}</span>
          <span className="text-muted">
            {loading ? 'Loading…' : `${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}`}
          </span>
        </div>
        {error && (
          <p className="mt-2 text-xs" style={{ color: 'var(--status-critical)' }}>
            {error}
          </p>
        )}
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3 sm:grid-cols-3">
          <Figure label="Spent" value={formatMoney(t.expense, currency)} />
          <Figure
            label="Income"
            value={formatMoney(t.income, currency)}
            color={t.income > 0 ? 'var(--series-income)' : undefined}
          />
          <Figure
            label="Net"
            value={`${t.net > 0 ? '+' : t.net < 0 ? '−' : ''}${formatMoney(Math.abs(t.net), currency)}`}
            color={t.net < 0 ? 'var(--status-critical)' : undefined}
          />
          <Figure
            label="Saved"
            value={savingsRate == null ? '—' : `${Math.round(savingsRate)}%`}
            hint={savingsRate == null ? 'no income' : 'of income'}
          />
          <Figure label="Expenses" value={expenses.length.toLocaleString()} hint="transactions" />
          <Figure
            label="Per day"
            value={formatMoney(t.expense / Math.max(days, 1), currency)}
            hint="average spend"
          />
        </dl>
      </section>

      {/* One bar is no trend; a single month reads better as the figures above. */}
      {months > 1 && (
        <section className="card p-4">
          <h2 className="text-sm font-semibold text-ink">Month by month</h2>
          <p className="mb-2 text-xs text-muted">
            {months} months
          </p>
          <Suspense fallback={<div className="h-[210px] w-full" aria-hidden="true" />}>
            <MonthlyTrendChart data={trend} currency={currency} showIncome={t.income > 0} />
          </Suspense>
        </section>
      )}

      <div className="grid items-start gap-4 sm:grid-cols-2">
        <CategoryBreakdown
          title="Spending by category"
          rows={spendCats}
          total={t.expense}
          currency={currency}
          color="var(--series-expense)"
          shareNote="of spending"
          emptyText={loading ? 'Loading…' : 'Nothing spent in this period'}
        />
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

      {largest.length > 0 && (
        <section className="card overflow-hidden">
          <h2 className="px-4 pt-4 text-sm font-semibold text-ink">Largest expenses</h2>
          <ol className="mt-2 divide-y divide-grid border-t border-grid">
            {largest.map((e, i) => {
              const cat = resolveCategory(categories, e.category)
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => setEditing(e)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-wash"
                  >
                    <span className="w-4 shrink-0 tabular text-xs text-muted">{i + 1}</span>
                    <span aria-hidden="true">{cat.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{e.note || cat.label}</span>
                      <span className="block truncate text-xs text-muted">
                        {e.note ? `${cat.label} · ` : ''}
                        {format(e.date, 'd MMM yyyy')}
                      </span>
                    </span>
                    <span className="shrink-0 tabular text-sm font-semibold text-ink">
                      {formatMoney(e.amount, currency)}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      <EntrySheet entry={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function Figure({ label, value, hint, color }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted">{label}</dt>
      <dd
        className="tabular truncate text-lg font-semibold"
        style={{ color: color ?? 'var(--text-primary)' }}
        title={value}
      >
        {value}
      </dd>
      {hint && <dd className="truncate text-[11px] text-muted">{hint}</dd>}
    </div>
  )
}
