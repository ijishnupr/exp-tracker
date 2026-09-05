import { eachMonthOfInterval, endOfMonth, format, startOfMonth, subMonths } from 'date-fns'
import { resolveCategory, slotColor } from './categories'
import { round2, sum } from './money'

/** Key used to bucket an entry into a month, e.g. "2026-09". */
export const monthKey = (date) => format(date, 'yyyy-MM')

export const monthLabel = (date) => format(date, 'MMM yyyy')

/** The window the app subscribes to: `months` calendar months ending with the
 *  selected one. One subscription feeds both the month list and the trend. */
export function monthWindow(selected, months = 6) {
  return {
    start: startOfMonth(subMonths(selected, months - 1)),
    end: endOfMonth(selected),
  }
}

export const inMonth = (entries, selected) => {
  const key = monthKey(selected)
  return entries.filter((e) => monthKey(e.date) === key)
}

/** Entries default to `expense` so anything written before the income feature
 *  existed still reads correctly. */
export const isIncome = (entry) => entry.type === 'income'
export const isExpense = (entry) => !isIncome(entry)

export const ofType = (entries, type) =>
  entries.filter((e) => (type === 'income' ? isIncome(e) : isExpense(e)))

/** Income, expense and net for a set of entries. */
export function totals(entries) {
  const income = sum(ofType(entries, 'income').map((e) => e.amount))
  const expense = sum(ofType(entries, 'expense').map((e) => e.amount))
  return { income, expense, net: round2(income - expense) }
}

/** Per-month income and expense across the window, oldest first — always one
 *  point per month, including empty ones, so the trend has no gaps. */
export function monthlyTotals(entries, selected, months = 6) {
  const buckets = new Map()
  for (const e of entries) {
    const k = monthKey(e.date)
    const b = buckets.get(k) ?? { income: 0, expense: 0 }
    if (isIncome(e)) b.income += e.amount
    else b.expense += e.amount
    buckets.set(k, b)
  }
  return eachMonthOfInterval({
    start: startOfMonth(subMonths(selected, months - 1)),
    end: startOfMonth(selected),
  }).map((d) => {
    const b = buckets.get(monthKey(d)) ?? { income: 0, expense: 0 }
    return {
      key: monthKey(d),
      label: format(d, 'MMM'),
      fullLabel: monthLabel(d),
      income: round2(b.income),
      expense: round2(b.expense),
      net: round2(b.income - b.expense),
      isSelected: monthKey(d) === monthKey(selected),
    }
  })
}

/** Totals per category for one type, largest first. Categories with no
 *  activity are dropped — an empty bar carries no information. */
export function categoryTotals(entries, categories, type = 'expense') {
  const rows = ofType(entries, type)
  const buckets = new Map()
  for (const e of rows) {
    buckets.set(e.category, (buckets.get(e.category) ?? 0) + e.amount)
  }
  const grand = sum([...buckets.values()])
  return [...buckets.entries()]
    .map(([key, amount]) => {
      const cat = resolveCategory(categories, key)
      return {
        key,
        label: cat.label,
        icon: cat.icon,
        color: slotColor(cat.slot),
        total: round2(amount),
        share: grand ? (amount / grand) * 100 : 0,
      }
    })
    .sort((a, b) => b.total - a.total)
}

/** Ratio of spend to limit, plus the status role that names it. Status is
 *  always paired with an icon and a label in the UI — never colour alone.
 *  Named `statusIcon`/`status` rather than `icon`/`label` so spreading this
 *  over a category object cannot clobber the category's own icon and name. */
export function budgetStatus(spent, limit) {
  if (!limit) return { ratio: 0, role: 'none', statusIcon: '', status: 'No budget' }
  const ratio = spent / limit
  if (ratio >= 1) return { ratio, role: 'critical', statusIcon: '✕', status: 'Over budget' }
  if (ratio >= 0.9) return { ratio, role: 'serious', statusIcon: '!', status: 'Almost spent' }
  if (ratio >= 0.75) return { ratio, role: 'warning', statusIcon: '▲', status: 'Watch' }
  return { ratio, role: 'good', statusIcon: '✓', status: 'On track' }
}

/** Budget rows for the selected month, worst-off first. Budgets apply to
 *  spending only — income is never "over budget". */
export function budgetRows(entries, budgets, categories) {
  const spentBy = new Map()
  for (const e of ofType(entries, 'expense')) {
    spentBy.set(e.category, (spentBy.get(e.category) ?? 0) + e.amount)
  }
  return categories
    .filter((c) => c.type === 'expense' && !c.archived)
    .map((cat) => {
      const limit = budgets[cat.key]?.limit ?? 0
      const spent = round2(spentBy.get(cat.key) ?? 0)
      return {
        ...cat,
        color: slotColor(cat.slot),
        limit,
        spent,
        remaining: round2(limit - spent),
        ...budgetStatus(spent, limit),
      }
    })
    .filter((r) => r.limit > 0 || r.spent > 0)
    .sort((a, b) => b.ratio - a.ratio || b.spent - a.spent)
}

/** Categories at or past their warning threshold — drives the alert banner. */
export const budgetAlerts = (rows) =>
  rows.filter((r) => r.limit > 0 && ['warning', 'serious', 'critical'].includes(r.role))
