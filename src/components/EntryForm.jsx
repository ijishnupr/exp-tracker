import { useEffect, useMemo, useRef, useState } from 'react'
import { format } from 'date-fns'
import { categoriesOfType, slotColor } from '../lib/categories'
import SelectMenu from './SelectMenu'
import { currencySymbol, formatMoney, parseAmount } from '../lib/money'

const today = () => format(new Date(), 'yyyy-MM-dd')

/** Add/edit sheet. Amount is the first field and gets focus, because logging an
 *  entry should be a two-tap job on a phone. */
export default function EntryForm({
  entry,
  currency,
  categories,
  categoriesLoaded = true,
  onSubmit,
  onCancel,
  onDelete,
}) {
  const [type, setType] = useState(entry?.type === 'income' ? 'income' : 'expense')
  const [amount, setAmount] = useState(entry ? String(entry.amount) : '')
  const [note, setNote] = useState(entry?.note ?? '')
  const [date, setDate] = useState(entry ? format(entry.date, 'yyyy-MM-dd') : today())
  const [error, setError] = useState(null)
  const [saving, setSaving] = useState(false)
  // Deleting is irreversible and there is no undo, so it takes two taps.
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const amountRef = useRef(null)

  const options = useMemo(() => categoriesOfType(categories, type), [categories, type])
  const [category, setCategory] = useState(entry?.category ?? '')

  // Switching type replaces the whole category list, so keep the selection
  // valid rather than leaving a stale expense category on an income entry.
  useEffect(() => {
    if (!options.some((c) => c.key === category)) {
      setCategory(options[0]?.key ?? '')
    }
  }, [options, category])

  useEffect(() => {
    amountRef.current?.focus()
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const parsed = parseAmount(amount)
    if (parsed == null) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (!category) {
      setError('Pick a category.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      // Parsed as local noon so a date never shifts a day across time zones.
      const [y, m, d] = date.split('-').map(Number)
      await onSubmit({ amount: parsed, type, category, note, date: new Date(y, m - 1, d, 12) })
    } catch (err) {
      setError(err.message ?? 'Could not save. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Type first: it changes which categories exist below. */}
      <div role="group" aria-label="Entry type" className="grid grid-cols-2 gap-2">
        {[
          { key: 'expense', label: 'Expense', sign: '−' },
          { key: 'income', label: 'Income', sign: '+' },
        ].map((t) => {
          const active = type === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setType(t.key)}
              aria-pressed={active}
              className={`min-h-[48px] rounded-lg border px-3 text-sm transition-colors ${
                active
                  ? 'border-series bg-wash font-semibold text-ink'
                  : 'border-hairline text-ink-2'
              }`}
            >
              <span aria-hidden="true" className="mr-1.5">{t.sign}</span>
              {t.label}
            </button>
          )
        })}
      </div>

      <div>
        <label htmlFor="amount" className="block text-xs font-medium uppercase tracking-wide text-muted">
          Amount
        </label>
        <div className="mt-1 flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 focus-within:border-series">
          <span className="text-lg text-muted">{currencySymbol(currency)}</span>
          <input
            ref={amountRef}
            id="amount"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="amount-field w-full bg-transparent py-3 text-2xl font-semibold tabular text-ink outline-none placeholder:font-normal placeholder:text-muted"
          />
        </div>
      </div>

      <div>
        <span
          id="category-label"
          className="block text-xs font-medium uppercase tracking-wide text-muted"
        >
          Category
        </span>
        <div className="mt-1">
          <SelectMenu
            id="category"
            labelledBy="category-label"
            value={category}
            onChange={setCategory}
            options={options.map((c) => ({
              key: c.key,
              label: c.label,
              icon: c.icon,
              color: slotColor(c.slot),
            }))}
            placeholder={categoriesLoaded ? 'No categories' : 'Loading…'}
            disabled={!options.length}
          />
        </div>
        {!options.length && (
          <p className="mt-2 text-xs text-muted">
            {/* Before the first snapshot arrives the list is empty but not
                absent — saying "none yet" there would be a lie that also
                sends people to Settings for no reason. */}
            {categoriesLoaded
              ? `No ${type} categories yet — add one in Settings.`
              : 'Loading your categories…'}
          </p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="date" className="block text-xs font-medium uppercase tracking-wide text-muted">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            max={today()}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 h-12 w-full rounded-lg border border-hairline bg-surface px-3 text-sm text-ink outline-none focus:border-series"
          />
        </div>
        <div>
          <label htmlFor="note" className="block text-xs font-medium uppercase tracking-wide text-muted">
            Note <span className="font-normal normal-case">(optional)</span>
          </label>
          <input
            id="note"
            type="text"
            value={note}
            maxLength={500}
            onChange={(e) => setNote(e.target.value)}
            placeholder={type === 'income' ? 'August salary' : 'Lunch with the team'}
            className="mt-1 h-12 w-full rounded-lg border border-hairline bg-surface px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-series"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm" style={{ color: 'var(--status-critical)' }}>
          {error}
        </p>
      )}

      <div className="sticky bottom-0 -mx-5 flex items-center gap-2 border-t border-hairline bg-surface px-5 py-3">
        <button
          type="submit"
          disabled={saving}
          className="press flex-1 rounded-lg bg-series px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : entry ? 'Save changes' : `Add ${type}`}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-hairline px-4 py-3 text-sm font-medium text-ink-2"
        >
          Cancel
        </button>
      </div>

      {entry && onDelete &&
        (confirmingDelete ? (
          <div
            className="rounded-lg border p-3"
            style={{ borderColor: 'var(--status-critical)' }}
          >
            <p className="text-sm text-ink">
              Delete this {entry.type === 'income' ? 'income' : 'expense'} of{' '}
              <span className="font-semibold">{formatMoney(entry.amount, currency)}</span>?
            </p>
            <p className="mt-0.5 text-xs text-muted">This cannot be undone.</p>
            <div className="mt-2.5 flex gap-2">
              <button
                type="button"
                onClick={onDelete}
                className="flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
                style={{ background: 'var(--status-critical)' }}
              >
                Delete
              </button>
              <button
                type="button"
                onClick={() => setConfirmingDelete(false)}
                className="rounded-lg border border-hairline px-4 py-2.5 text-sm font-medium text-ink-2"
              >
                Keep
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="w-full rounded-lg border px-4 py-2.5 text-sm font-medium"
            style={{ borderColor: 'var(--status-critical)', color: 'var(--status-critical)' }}
          >
            Delete entry
          </button>
        ))}
    </form>
  )
}
