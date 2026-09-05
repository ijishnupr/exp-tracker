import { format, isToday, isYesterday } from 'date-fns'
import { resolveCategory, slotColor } from '../lib/categories'
import { formatMoney } from '../lib/money'
import { totals } from '../lib/analytics'

const dayHeading = (date) => {
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEE, d MMM')
}

/** The list doubles as the table view the accessibility pass requires: every
 *  amount, type and category name is present as text, not only as a mark. */
export default function EntryList({ entries, currency, categories, onSelect, emptyText }) {
  if (!entries.length) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted">
        {emptyText ?? 'Nothing recorded this month yet.'}
      </p>
    )
  }

  // Group by calendar day, preserving the incoming newest-first order.
  const groups = []
  for (const e of entries) {
    const key = format(e.date, 'yyyy-MM-dd')
    if (groups.at(-1)?.key !== key) groups.push({ key, date: e.date, items: [] })
    groups.at(-1).items.push(e)
  }

  return (
    <div>
      {groups.map((g) => {
        const t = totals(g.items)
        return (
          <section key={g.key}>
            <div className="flex items-baseline justify-between px-4 pb-1 pt-4">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {dayHeading(g.date)}
              </h3>
              <span className="tabular text-xs text-muted">
                {t.income > 0 && t.expense > 0
                  ? `+${formatMoney(t.income, currency)} · −${formatMoney(t.expense, currency)}`
                  : t.income > 0
                    ? `+${formatMoney(t.income, currency)}`
                    : `−${formatMoney(t.expense, currency)}`}
              </span>
            </div>
            <ul className="divide-y divide-grid border-y border-grid">
              {g.items.map((e) => {
                const cat = resolveCategory(categories, e.category)
                const income = e.type === 'income'
                return (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(e)}
                      className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-wash"
                    >
                      <span
                        aria-hidden="true"
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                        style={{ background: 'var(--wash)' }}
                      >
                        {cat.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span
                            aria-hidden="true"
                            className="h-2 w-2 shrink-0 rounded-sm"
                            style={{ background: slotColor(cat.slot) }}
                          />
                          <span className="truncate text-sm font-medium text-ink">{cat.label}</span>
                        </span>
                        {e.note && <span className="block truncate text-xs text-muted">{e.note}</span>}
                      </span>
                      {/* Sign and colour both carry the direction, so it never
                          rests on colour alone. */}
                      <span
                        className="shrink-0 tabular text-sm font-semibold"
                        style={{ color: income ? 'var(--series-income)' : 'var(--text-primary)' }}
                      >
                        {income ? '+' : '−'}
                        {formatMoney(e.amount, currency)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
