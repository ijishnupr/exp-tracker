import { Link } from 'react-router-dom'
import { formatMoney } from '../lib/money'

const ROLE_COLOR = {
  good: 'var(--status-good)',
  warning: 'var(--status-warning)',
  serious: 'var(--status-serious)',
  critical: 'var(--status-critical)',
  none: 'var(--baseline)',
}

/** A single ratio against a limit is a meter, not a two-slice pie. The status
 *  color is always paired with its icon and label — never color alone. */
export default function BudgetMeter({ row, currency, index = 0 }) {
  const pct = Math.min(row.ratio * 100, 100)
  const color = ROLE_COLOR[row.role]

  return (
    // The whole row opens the category, so the target is the full width.
    <Link
      to={`/category/${encodeURIComponent(row.key)}`}
      className="-mx-4 block px-4 py-3 transition-colors hover:bg-wash active:bg-wash"
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true">{row.icon}</span>
          <span className="truncate text-sm font-medium text-ink">{row.label}</span>
          <span aria-hidden="true" className="text-muted">›</span>
        </div>
        <div className="shrink-0 tabular text-sm text-ink-2">
          {formatMoney(row.spent, currency)}
          {row.limit > 0 && <span className="text-muted"> / {formatMoney(row.limit, currency)}</span>}
        </div>
      </div>

      {row.limit > 0 ? (
        <>
          <div
            className="mt-2 h-2 w-full overflow-hidden rounded-full"
            style={{ background: 'var(--wash)' }}
            role="progressbar"
            aria-valuenow={Math.round(row.ratio * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${row.label}: ${Math.round(row.ratio * 100)}% of budget used, ${row.status}`}
          >
            <div
              className="anim-bar h-full rounded-full"
              style={{ width: `${pct}%`, background: color, animationDelay: `${index * 50}ms` }}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-3 gap-y-0.5 text-xs">
            <span className="flex items-center gap-1" style={{ color }}>
              <span aria-hidden="true">{row.statusIcon}</span>
              <span className="font-medium">{row.status}</span>
              {/* The count sits here rather than beside the name, where it
                  squeezed long names down to an initial on a narrow phone. */}
              <span className="tabular text-muted">
                · {Math.round(row.ratio * 100)}% · {row.count} {row.count === 1 ? 'txn' : 'txns'}
              </span>
            </span>
            <span className="ml-auto tabular text-muted">
              {row.remaining >= 0
                ? `${formatMoney(row.remaining, currency)} left`
                : `${formatMoney(-row.remaining, currency)} over`}
            </span>
          </div>
          {row.paceOver > 0 && (
            <div className="mt-1 flex items-start gap-1 text-xs" style={{ color: 'var(--status-serious)' }}>
              <span aria-hidden="true">▲</span>
              <span>
                At this pace: <span className="tabular font-medium">{formatMoney(row.projected, currency)}</span>{' '}
                by month end, {formatMoney(row.paceOver, currency)} over
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="mt-1 text-xs text-muted">No budget set</div>
      )}
    </Link>
  )
}
