/** Colour slots come from the validated eight-hue categorical order. Charts in
 *  this app are single-hue, so these appear only as chips beside a category's
 *  name — always with its label, never as a chart's only cue. Beyond eight
 *  categories the slots repeat, which is safe here for exactly that reason. */
export const SLOT_COUNT = 8

export const slotColor = (slot) => `var(--cat-${(((slot - 1) % SLOT_COUNT) + SLOT_COUNT) % SLOT_COUNT + 1})`

export const TYPES = ['expense', 'income']

/** Seeded into Firestore on first run, then fully user-editable in Settings.
 *  `key` is the stable id an entry stores; renaming a category changes only its
 *  label, so history never breaks. */
export const DEFAULT_CATEGORIES = [
  // Expense
  { key: 'food', label: 'Food & Dining', icon: '🍽️', type: 'expense', slot: 1 },
  { key: 'groceries', label: 'Groceries', icon: '🛒', type: 'expense', slot: 3 },
  { key: 'transport', label: 'Transport', icon: '🚌', type: 'expense', slot: 2 },
  { key: 'fuel', label: 'Fuel', icon: '⛽', type: 'expense', slot: 4 },
  { key: 'bills', label: 'Bills & Utilities', icon: '💡', type: 'expense', slot: 4 },
  { key: 'shopping', label: 'Shopping', icon: '🛍️', type: 'expense', slot: 5 },
  { key: 'fashion', label: 'Fashion', icon: '👕', type: 'expense', slot: 5 },
  { key: 'health', label: 'Health', icon: '🩺', type: 'expense', slot: 6 },
  { key: 'entertainment', label: 'Entertainment', icon: '🎬', type: 'expense', slot: 7 },
  { key: 'travel', label: 'Travel', icon: '✈️', type: 'expense', slot: 2 },
  { key: 'education', label: 'Education', icon: '🎓', type: 'expense', slot: 7 },
  { key: 'investment', label: 'Investment', icon: '📈', type: 'expense', slot: 3 },
  { key: 'other', label: 'Other', icon: '📦', type: 'expense', slot: 8 },
  // Income
  { key: 'salary', label: 'Salary', icon: '💼', type: 'income', slot: 3 },
  { key: 'interest', label: 'Interest', icon: '🏦', type: 'income', slot: 1 },
  { key: 'refund', label: 'Refund', icon: '↩️', type: 'income', slot: 4 },
  { key: 'gift', label: 'Gift', icon: '🎁', type: 'income', slot: 5 },
  { key: 'other-income', label: 'Other income', icon: '💰', type: 'income', slot: 8 },
]

/** Never returns undefined — an entry saved under a category that was later
 *  deleted still renders instead of crashing the list. */
export function resolveCategory(categories, key) {
  const found = categories?.find((c) => c.key === key)
  if (found) return found
  return {
    key: key || 'other',
    label: key ? humanise(key) : 'Other',
    icon: '📦',
    type: 'expense',
    slot: 8,
    missing: true,
  }
}

export const categoriesOfType = (categories, type) =>
  categories.filter((c) => c.type === type && !c.archived)

/** Slugifies a user-entered name into a stable key, keeping it unique against
 *  what already exists. */
export function makeCategoryKey(label, existing = []) {
  const base =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 30) || 'category'
  const taken = new Set(existing.map((c) => c.key))
  if (!taken.has(base)) return base
  for (let i = 2; i < 500; i += 1) {
    if (!taken.has(`${base}-${i}`)) return `${base}-${i}`
  }
  return `${base}-${Date.now()}`
}

/** Picks the least-used colour slot, so a new category is as distinct as the
 *  eight-slot palette allows. */
export function nextSlot(categories) {
  const counts = new Array(SLOT_COUNT).fill(0)
  for (const c of categories) {
    const i = (((c.slot ?? 1) - 1) % SLOT_COUNT + SLOT_COUNT) % SLOT_COUNT
    counts[i] += 1
  }
  return counts.indexOf(Math.min(...counts)) + 1
}

const humanise = (key) =>
  key.replace(/[-_]+/g, ' ').replace(/\b\w/g, (ch) => ch.toUpperCase())
