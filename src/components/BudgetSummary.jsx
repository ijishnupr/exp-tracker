import { differenceInCalendarDays, endOfMonth, format, isSameMonth, startOfMonth } from 'date-fns'
import { budgetStatus } from '../lib/analytics'
import { formatMoney } from '../lib/money'

const ROLE_COLOR = {
  good: 'var(--status-good)',
  warning: 'var(--status-warning)',
  serious: 'var(--status-serious)',
  critical: 'var(--status-critical)',
  none: 'var(--baseline)',
}

/** Where the selected month stands in time: its date range, how much of it
 *  has gone, and how many days are left. Past months are fully elapsed. */
export function monthProgress(month, today = new Date()) {
  const start = startOfMonth(month)
  const end = endOfMonth(month)
  const days = differenceInCalendarDays(end, start) + 1
  if (isSameMonth(month, today)) {
    const elapsed = differenceInCalendarDays(today, start) + 1
    // Today counts as a day still left to spend in.
    return { start, end, days, current: true, elapsed: elapsed / days, daysLeft: days - elapsed + 1 }
  }
  return { start, end, days, current: false, elapsed: today > end ? 1 : 0, daysLeft: 0 }
}

/** The headline for the month: what is left across every budgeted category,
 *  one meter for the whole, and the period the figures cover. On the current
 *  month a tick marks how far through it we are, so "70% spent" reads as ahead
 *  of or behind pace without any arithmetic. */
export default function BudgetSummary({ month, limit, spent, unbudgeted, count, over = 0, currency }) {
  const p = monthProgress(month)
  const left = limit - spent
  const status = budgetStatus(spent, limit)
  const color = ROLE_COLOR[status.role]
  const perDay = p.current && left > 0 && p.daysLeft > 0 ? left / p.daysLeft : null
  const sameYear = p.start.getFullYear() === p.end.getFullYear()

  return (
    <section className="card p-4" aria-label="Budget summary">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-xs">
        <span className="tabular text-ink-2">
          <time dateTime={format(p.start, 'yyyy-MM-dd')}>
            {format(p.start, sameYear ? 'd MMM' : 'd MMM yyyy')}
          </time>
          {' – '}
          <time dateTime={format(p.end, 'yyyy-MM-dd')}>{format(p.end, 'd MMM yyyy')}</time>
        </span>
        <span className="text-muted">
          {p.current
            ? `${p.daysLeft} ${p.daysLeft === 1 ? 'day' : 'days'} left`
            : p.elapsed === 1
              ? 'Month ended'
              : 'Not started'}
        </span>
      </div>

      {limit > 0 ? (
        <>
          <div className="mt-3 text-xs font-medium uppercase tracking-wide text-muted">
            {left >= 0 ? 'Left to spend' : 'Over budget'}
          </div>
          <div className="mt-0.5 flex flex-wrap items-baseline gap-x-2">
            <span
              className="tabular whitespace-nowrap text-3xl font-semibold"
              style={{ color: left < 0 ? 'var(--status-critical)' : 'var(--text-primary)' }}
            >
              {formatMoney(Math.abs(left), currency)}
            </span>
            <span className="tabular text-sm text-muted">of {formatMoney(limit, currency)}</span>
          </div>

          <div className="relative mt-3">
            <div
              className="h-2.5 w-full overflow-hidden rounded-full"
              style={{ background: 'var(--wash)' }}
              role="progressbar"
              aria-valuenow={Math.round(status.ratio * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${Math.round(status.ratio * 100)}% of total budget used, ${status.status}`}
            >
              <div
                className="anim-bar h-full rounded-full"
                style={{ width: `${Math.min(status.ratio * 100, 100)}%`, background: color }}
              />
            </div>
            {p.current && (
              <div
                aria-hidden="true"
                className="absolute -top-1 h-[18px] w-0.5 rounded-full"
                style={{
                  left: `calc(${p.elapsed * 100}% - 1px)`,
                  background: 'var(--text-secondary)',
                }}
              />
            )}
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-3 text-xs">
            <span className="flex items-center gap-1" style={{ color }}>
              <span aria-hidden="true">{status.statusIcon}</span>
              <span className="font-medium">{status.status}</span>
              <span className="tabular text-muted">· {Math.round(status.ratio * 100)}% used</span>
            </span>
            {p.current && (
              <span className="text-muted">
                <span aria-hidden="true">│ </span>
                {Math.round(p.elapsed * 100)}% of month
              </span>
            )}
          </div>
          {/* The total can be on track while one category is well past its
              limit; say so here rather than leaving it to the list below. */}
          {over > 0 && (
            <p className="mt-2 flex items-center gap-1 text-xs" style={{ color: 'var(--status-critical)' }}>
              <span aria-hidden="true">✕</span>
              <span className="font-medium">
                {over === 1 ? '1 category is' : `${over} categories are`} over budget
              </span>
            </p>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm text-ink-2">
          No budgets yet. Set a monthly limit for a category below to track it here.
        </p>
      )}

      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-grid pt-3">
        <Stat label="Spent" value={formatMoney(spent + unbudgeted, currency, { compact: true })} />
        <Stat label="Transactions" value={count.toLocaleString()} />
        {perDay != null ? (
          <Stat label="Per day" value={formatMoney(perDay, currency, { compact: true })} hint="safe to spend" />
        ) : (
          <Stat
            label="Daily avg"
            value={formatMoney((spent + unbudgeted) / Math.max(p.current ? p.days - p.daysLeft + 1 : p.days, 1), currency, { compact: true })}
          />
        )}
      </dl>
    </section>
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
