import { useState } from 'react'
import { slotColor, SLOT_COUNT } from '../lib/categories'

/** Add, rename, recolour and retire categories. Deleting a category that has
 *  entries would orphan them, so those are archived instead — hidden from the
 *  pickers, still readable in history. */
export default function CategoryManager({ categories, onAdd, onUpdate, onRemove }) {
  const [type, setType] = useState('expense')
  const [label, setLabel] = useState('')
  const [icon, setIcon] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState(null)
  const [editingKey, setEditingKey] = useState(null)

  const shown = categories.filter((c) => c.type === type)

  async function add(e) {
    e.preventDefault()
    const name = label.trim()
    if (!name) return
    setBusy(true)
    setStatus(null)
    try {
      await onAdd({ label: name, icon: icon.trim(), type })
      setLabel('')
      setIcon('')
      setStatus({ kind: 'good', text: `Added “${name}”.` })
    } catch (err) {
      setStatus({ kind: 'critical', text: err.message ?? 'Could not add that category.' })
    } finally {
      setBusy(false)
    }
  }

  async function remove(cat) {
    setBusy(true)
    setStatus(null)
    try {
      const result = await onRemove(cat.key)
      setStatus({
        kind: 'good',
        text: result.archived
          ? `“${cat.label}” is used by ${result.entries} ${
              result.entries === 1 ? 'entry' : 'entries'
            }, so it was archived rather than deleted.`
          : `Deleted “${cat.label}”.`,
      })
    } catch (err) {
      setStatus({ kind: 'critical', text: err.message ?? 'Could not remove that category.' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold text-ink">Categories</h2>
      <p className="mb-3 text-xs text-muted">
        Colours come from a fixed eight-hue palette and repeat beyond eight categories — charts use
        a single hue, so the swatch is only ever an aid beside the name.
      </p>

      <div role="group" aria-label="Category type" className="mb-3 flex gap-1.5">
        {['expense', 'income'].map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            aria-pressed={type === t}
            className={`min-h-[44px] rounded-full border px-4 text-xs capitalize transition-colors ${
              type === t ? 'border-series bg-wash font-semibold text-ink' : 'border-hairline text-ink-2'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <ul className="divide-y divide-grid border-y border-grid">
        {shown.map((c) => (
          <li key={c.key} className="py-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdate(c.key, { slot: (c.slot % SLOT_COUNT) + 1 })}
                title="Change colour"
                aria-label={`Change colour of ${c.label}`}
                className="-ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-wash"
              >
                <span
                  aria-hidden="true"
                  className="h-4 w-4 rounded-sm ring-1 ring-inset ring-black/10"
                  style={{ background: slotColor(c.slot) }}
                />
              </button>
              <span aria-hidden="true" className="w-5 text-center">{c.icon}</span>
              {editingKey === c.key ? (
                <input
                  autoFocus
                  defaultValue={c.label}
                  maxLength={40}
                  onBlur={(e) => {
                    const next = e.target.value.trim()
                    if (next && next !== c.label) void onUpdate(c.key, { label: next })
                    setEditingKey(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') e.currentTarget.blur()
                    if (e.key === 'Escape') setEditingKey(null)
                  }}
                  className="min-w-0 flex-1 rounded border border-series bg-surface px-2 py-1 text-sm text-ink outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingKey(c.key)}
                  className="min-h-[44px] min-w-0 flex-1 truncate text-left text-sm text-ink hover:underline"
                  title="Rename"
                >
                  {c.label}
                  {c.archived && <span className="ml-1 text-xs text-muted">(archived)</span>}
                </button>
              )}
              {c.archived ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onUpdate(c.key, { archived: false })}
                  className="h-10 shrink-0 rounded border border-hairline px-3 text-xs text-ink-2"
                >
                  Restore
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => remove(c)}
                  aria-label={`Remove ${c.label}`}
                  className="h-10 shrink-0 rounded border px-3 text-xs"
                  style={{ borderColor: 'var(--border)', color: 'var(--status-critical)' }}
                >
                  Remove
                </button>
              )}
            </div>
          </li>
        ))}
        {!shown.length && <li className="py-3 text-xs text-muted">No {type} categories yet.</li>}
      </ul>

      <form onSubmit={add} className="mt-3 flex gap-2">
        <input
          value={icon}
          onChange={(e) => setIcon(e.target.value)}
          maxLength={2}
          placeholder="🍔"
          aria-label="Category icon"
          className="h-12 w-14 rounded-lg border border-hairline bg-surface px-2 text-center text-sm outline-none focus:border-series"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          maxLength={40}
          placeholder={`New ${type} category`}
          aria-label="New category name"
          className="h-12 min-w-0 flex-1 rounded-lg border border-hairline bg-surface px-3 text-sm text-ink outline-none placeholder:text-muted focus:border-series"
        />
        <button
          type="submit"
          disabled={busy || !label.trim()}
          className="h-12 shrink-0 rounded-lg bg-series px-4 text-xs font-semibold text-white disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {status && (
        <p
          role="status"
          className="mt-2 flex items-start gap-1.5 text-xs"
          style={{ color: `var(--status-${status.kind})` }}
        >
          <span aria-hidden="true">{status.kind === 'good' ? '✓' : '✕'}</span>
          <span>{status.text}</span>
        </p>
      )}
    </section>
  )
}
