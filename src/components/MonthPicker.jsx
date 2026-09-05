import { addMonths, isSameMonth, startOfMonth, subMonths } from 'date-fns'
import { monthLabel } from '../lib/analytics'

/** Month stepper. Forward is disabled at the current month — there is nothing
 *  to see in the future. */
export default function MonthPicker({ month, onChange }) {
  const atCurrent = isSameMonth(month, new Date())

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(startOfMonth(subMonths(month, 1)))}
        aria-label="Previous month"
        className="rounded-md px-2 py-1 text-ink-2 hover:bg-wash"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={() => onChange(startOfMonth(new Date()))}
        className="min-w-[104px] rounded-md px-2 py-1 text-sm font-semibold text-ink hover:bg-wash"
        title="Jump to this month"
      >
        {monthLabel(month)}
      </button>
      <button
        type="button"
        onClick={() => onChange(startOfMonth(addMonths(month, 1)))}
        disabled={atCurrent}
        aria-label="Next month"
        className="rounded-md px-2 py-1 text-ink-2 hover:bg-wash disabled:opacity-30"
      >
        ›
      </button>
    </div>
  )
}
