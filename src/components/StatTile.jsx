import { formatMoney, percentChange } from '../lib/money'

/** A single headline number belongs in a stat tile, not a one-bar chart.
 *  The delta ships with an arrow glyph and a word, so direction never rests on
 *  colour alone. */
export default function StatTile({
  label,
  amount,
  currency,
  compare,
  hint,
  tone = 'neutral',
  signed = false,
  compact = false,
}) {
  const change = compare == null ? null : percentChange(amount, compare)
  const up = change != null && change > 0

  const color =
    tone === 'critical'
      ? 'var(--status-critical)'
      : tone === 'income'
        ? 'var(--series-income)'
        : 'var(--text-primary)'

  return (
    /* `min-w-0` keeps a long figure from widening the grid column it sits in
       — a grid item's automatic minimum is its min-content width, and the
       figure below is deliberately `whitespace-nowrap`. */
    <div className="card min-w-0 p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      {/* Three tiles on a narrow phone leave little room, so the figure scales
          with the viewport and never wraps mid-number. */}
      <div
        className="mt-1 whitespace-nowrap text-xl font-semibold sm:text-2xl"
        style={{ color }}
        title={formatMoney(amount, currency)}
      >
        {signed && amount !== 0 ? (amount > 0 ? '+' : '−') : ''}
        {formatMoney(signed ? Math.abs(amount) : amount, currency, { compact })}
      </div>
      {/* The delta row wraps rather than running past the card edge: a big
          swing ("4696%") is exactly when it gets long, and nowrap made the
          tile overflow its column on a narrow phone. */}
      {change != null && (
        <div className="mt-1 flex flex-wrap items-center gap-x-1 text-xs">
          <span aria-hidden="true" style={{ color: 'var(--text-secondary)' }}>
            {up ? '▲' : '▼'}
          </span>
          <span className="tabular text-ink-2">{Math.abs(change).toFixed(0)}%</span>
          <span className="text-muted">vs last month</span>
        </div>
      )}
      {hint && (
        <div
          className="mt-1 text-xs"
          style={{ color: tone === 'critical' ? 'var(--status-critical)' : 'var(--text-muted)' }}
        >
          {hint}
        </div>
      )}
    </div>
  )
}
