import writeXlsxFile from 'write-excel-file'
import { format } from 'date-fns'
import { buildWorkbook } from './excelSheets'

/**
 * Writes a two-sheet .xlsx (transactions + per-type category summary) and
 * hands it to the browser as a download.
 *
 * @param entries     rows with { date: Date, type, category, amount, note }
 * @param currency    ISO code, used for the cells' number format
 * @param categories  the user's category list, for resolving labels
 * @param label       goes into the filename, e.g. "Sep-2026" or "all-time"
 */
export async function exportToExcel(
  entries,
  { currency = 'INR', categories = [], label = 'export' } = {},
) {
  if (!entries.length) throw new Error('Nothing to export — no entries in this range.')

  const { data, sheets, columns } = buildWorkbook(entries, currency, categories)
  const fileName = `transactions-${label}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`

  await writeXlsxFile(data, { sheets, columns, stickyRowsCount: 1, fileName })

  return fileName
}
