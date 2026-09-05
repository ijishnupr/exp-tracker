import { CURRENCIES } from './currencies'

/** Formats with the browser's locale for the given ISO currency code. */
export function formatMoney(amount, currency = 'INR', { compact = false } = {}) {
  const value = Number.isFinite(amount) ? amount : 0
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      notation: compact ? 'compact' : 'standard',
      maximumFractionDigits: compact ? 1 : 2,
      minimumFractionDigits: compact ? 0 : 2,
    }).format(value)
  } catch {
    // An unrecognised currency code must not take the whole screen down.
    return `${value.toFixed(2)} ${currency}`
  }
}

export const currencySymbol = (currency = 'INR') =>
  CURRENCIES.find((c) => c.code === currency)?.symbol ?? currency

/** Parses user input into a positive number of currency units, or null.
 *  Strips grouping separators and currency symbols so a pasted "₹1,250.50"
 *  works. */
export function parseAmount(input) {
  if (typeof input === 'number') return input > 0 ? round2(input) : null
  const cleaned = String(input ?? '').replace(/[^0-9.,-]/g, '')
  if (!cleaned) return null
  // Commas are treated as grouping separators only — the decimal mark is `.`.
  // The number input is type=text with inputMode=decimal, so phone keypads
  // offer the right key set.
  const normalised = cleaned.replace(/,/g, '')
  const n = Number.parseFloat(normalised)
  if (!Number.isFinite(n) || n <= 0) return null
  return round2(n)
}

/** Money must never carry float dust into Firestore. */
export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100

export const sum = (nums) => round2(nums.reduce((t, n) => t + (Number(n) || 0), 0))

/** Signed percent change, or null when there is no baseline to compare to. */
export function percentChange(current, previous) {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}
