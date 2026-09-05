/** Pure sheet builders — no writer, no DOM, so they can be unit-tested and
 *  reused by a server-side exporter. `excel.js` feeds these to the browser
 *  xlsx writer. */
import { resolveCategory } from './categories'
import { categoryTotals, totals } from './analytics'
import { sum } from './money'

const HEADER = {
  fontWeight: 'bold',
  backgroundColor: '#e1e0d9',
  color: '#0b0b0b',
  align: 'left',
  height: 22,
}

const DATE_FMT = 'dd-mmm-yyyy'

/** Excel's own currency format, so the cell stays a real number that can be
 *  summed in the sheet — exporting a pre-formatted string could not be. */
const moneyFormat = (currency) => `"${currency} "#,##0.00`

export function entriesSheet(entries, currency, categories) {
  const rows = [
    [
      { value: 'Date', ...HEADER },
      { value: 'Type', ...HEADER },
      { value: 'Category', ...HEADER },
      { value: 'Amount', ...HEADER },
      { value: 'Signed amount', ...HEADER },
      { value: 'Note', ...HEADER },
    ],
  ]
  for (const e of entries) {
    const income = e.type === 'income'
    rows.push([
      { value: e.date, type: Date, format: DATE_FMT },
      { value: income ? 'Income' : 'Expense', type: String },
      { value: resolveCategory(categories, e.category).label, type: String },
      { value: e.amount, type: Number, format: moneyFormat(currency) },
      // Signed so a spreadsheet SUM over this column gives the net directly.
      { value: income ? e.amount : -e.amount, type: Number, format: moneyFormat(currency) },
      { value: e.note || '', type: String, wrap: true },
    ])
  }
  const t = totals(entries)
  rows.push([
    { value: 'Net', type: String, fontWeight: 'bold' },
    null,
    null,
    null,
    { value: t.net, type: Number, format: moneyFormat(currency), fontWeight: 'bold' },
    null,
  ])
  return {
    rows,
    columns: [{ width: 14 }, { width: 10 }, { width: 20 }, { width: 16 }, { width: 16 }, { width: 44 }],
  }
}

/** One block per type, so income and expense are never silently added together. */
export function summarySheet(entries, currency, categories) {
  const t = totals(entries)
  const rows = [
    [
      { value: 'Category', ...HEADER },
      { value: 'Amount', ...HEADER },
      { value: 'Share', ...HEADER },
      { value: 'Entries', ...HEADER },
    ],
  ]

  const counts = new Map()
  for (const e of entries) counts.set(e.category, (counts.get(e.category) ?? 0) + 1)

  for (const [type, heading] of [['expense', 'EXPENSE'], ['income', 'INCOME']]) {
    const cats = categoryTotals(entries, categories, type)
    if (!cats.length) continue
    rows.push([{ value: heading, type: String, fontWeight: 'bold' }, null, null, null])
    for (const c of cats) {
      rows.push([
        { value: c.label, type: String },
        { value: c.total, type: Number, format: moneyFormat(currency) },
        { value: Math.round(c.share * 100) / 10000, type: Number, format: '0.0%' },
        { value: counts.get(c.key) ?? 0, type: Number },
      ])
    }
    rows.push([
      { value: `Total ${heading.toLowerCase()}`, type: String, fontWeight: 'bold' },
      {
        value: sum(cats.map((c) => c.total)),
        type: Number,
        format: moneyFormat(currency),
        fontWeight: 'bold',
      },
      null,
      null,
    ])
    rows.push([null, null, null, null])
  }

  rows.push([
    { value: 'NET', type: String, fontWeight: 'bold' },
    { value: t.net, type: Number, format: moneyFormat(currency), fontWeight: 'bold' },
    null,
    { value: entries.length, type: Number, fontWeight: 'bold' },
  ])
  return { rows, columns: [{ width: 22 }, { width: 16 }, { width: 10 }, { width: 10 }] }
}

/** Everything the writer needs for a two-sheet workbook. */
export function buildWorkbook(entries, currency, categories = []) {
  const sorted = [...entries].sort((a, b) => a.date - b.date)
  const items = entriesSheet(sorted, currency, categories)
  const summary = summarySheet(sorted, currency, categories)
  return {
    data: [items.rows, summary.rows],
    sheets: ['Transactions', 'Summary'],
    columns: [items.columns, summary.columns],
  }
}
