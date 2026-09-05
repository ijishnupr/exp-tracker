import { formatMoney } from '../lib/money'

/** One type's category breakdown, largest first.
 *
 *  Spending and income get one of these each rather than a toggle inside a
 *  single card: two small multiples can be read against each other in a glance,
 *  where a filter living inside a chart card hides half the answer behind a
 *  click.
 *
 *  It is a bar list rather than a plotted chart because every row here needs
 *  its own name and its own value anyway — a plot plus a legend table below it
 *  printed both twice. Laying the bar under its label also means a long
 *  category name truncates instead of being clipped by an axis of fixed width,
 *  the card has no hard-coded height to outgrow, and every value is readable
 *  without a hover, which a phone does not have. The proportion is the graph;
 *  the numbers beside it are the table view. */
export default function CategoryBreakdown({ title, rows, total, currency, color, shareNote, emptyText }) {
  // Bars are scaled against the largest row, not the total, so the smaller
  // categories stay legible instead of collapsing into slivers.
  const max = Math.max(0, ...rows.map((r) => r.total))

  return (
    /* `min-w-0` is what keeps a long category name from blowing the card out.
       A grid item's automatic minimum size is its min-content width, and a
       nowrap label's min-content is the whole name — so without this the
       column stretches to fit the longest category and the amounts slide off
       the side of the screen. */
    <section className="card min-w-0 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        {rows.length > 0 && (
          <span className="shrink-0 tabular text-sm font-semibold text-ink">
            {formatMoney(total, currency)}
          </span>
        )}
      </div>
      <p className="text-xs text-muted">
        {rows.length
          ? `${rows.length} ${rows.length === 1 ? 'category' : 'categories'} · share ${shareNote}`
          : emptyText}
      </p>

      {rows.length > 0 && (
        <ul className="mt-3 space-y-2.5 border-t border-grid pt-3">
          {rows.map((r) => (
            <li key={r.key}>
              <div className="flex items-baseline justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-baseline gap-1.5">
                  <span aria-hidden="true" className="shrink-0">
                    {r.icon}
                  </span>
                  {/* The label is the only part allowed to shrink: the amount
                      beside it is `shrink-0`, so a long name gives way to the
                      number rather than the other way round. */}
                  <span className="min-w-0 truncate text-ink-2">{r.label}</span>
                </span>
                <span className="shrink-0 tabular text-ink-2">
                  {formatMoney(r.total, currency)}
                  <span className="text-muted"> · {formatShare(r.share)}</span>
                </span>
              </div>
              {/* Decorative: the row's own text already carries both numbers,
                  so the bar adds proportion, not information a reader needs. */}
              <div
                aria-hidden="true"
                className="mt-1 h-1.5 w-full overflow-hidden rounded-full"
                style={{ background: 'var(--wash)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${barWidth(r.total, max)}%`, background: color }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** A category that rounds to zero still spent something — saying "0%" of a
 *  real amount reads as a bug. */
function formatShare(share) {
  if (share > 0 && share < 0.5) return '<1%'
  return `${share.toFixed(0)}%`
}

/** Percent of the widest bar. Guards the empty set (every amount zero, so no
 *  scale exists) and keeps a non-zero amount visible rather than rounding it
 *  down to an invisible sliver. */
function barWidth(value, max) {
  if (!(max > 0) || !(value > 0)) return 0
  return Math.max((value / max) * 100, 1.5)
}
