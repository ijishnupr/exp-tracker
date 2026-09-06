import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'

const GAP = 12
const MIN_MENU = 140
const MAX_MENU = 224

/** The box that will visibly clip the menu — the sheet's scroll container, or
 *  the viewport when there isn't one. */
function clipBounds(el) {
  let node = el?.parentElement
  while (node) {
    const overflow = getComputedStyle(node).overflowY
    if (overflow === 'auto' || overflow === 'scroll' || overflow === 'hidden') {
      const r = node.getBoundingClientRect()
      return { top: r.top, bottom: r.bottom }
    }
    node = node.parentElement
  }
  return { top: 0, bottom: window.innerHeight }
}

/**
 * A dropdown that is ours rather than the platform's. A native `<select>` hands
 * Android its full-screen picker and iOS a wheel: both take the user out of the
 * sheet mid-entry, and neither can show a category's colour or icon. This keeps
 * the list inline and styled like the rest of the form, and — being a button —
 * it never raises the keyboard.
 *
 * Options are `{ key, label, icon?, color? }`.
 */
export default function SelectMenu({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select…',
  disabled = false,
  labelledBy,
}) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [placement, setPlacement] = useState({ up: false, maxHeight: MAX_MENU })
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const fallbackId = useId()
  const rootId = id ?? fallbackId
  const listId = `${rootId}-listbox`

  const selectedIndex = options.findIndex((o) => o.key === value)
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null
  const isOpen = open && !disabled && options.length > 0

  useEffect(() => {
    if (!isOpen) return
    const onPointerDown = (e) => {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [isOpen])

  // Drop upwards when there is more room above — with a keyboard open the
  // sheet can be shorter than the menu, and a menu clipped by the sheet's edge
  // is worse than one that opens the other way.
  useLayoutEffect(() => {
    if (!isOpen) return
    const trigger = rootRef.current?.getBoundingClientRect()
    if (!trigger) return
    const bounds = clipBounds(rootRef.current)
    const below = bounds.bottom - trigger.bottom - GAP
    const above = trigger.top - bounds.top - GAP
    const up = below < MIN_MENU && above > below
    const room = Math.max(up ? above : below, MIN_MENU)
    setPlacement({ up, maxHeight: Math.min(MAX_MENU, room) })
  }, [isOpen])

  // Open onto the current choice, and pull the menu into view when the field
  // sits low in a scrolled sheet.
  useEffect(() => {
    if (!isOpen) return
    setActive(selectedIndex >= 0 ? selectedIndex : 0)
    listRef.current?.scrollIntoView({ block: 'nearest' })
    // selectedIndex deliberately not a dependency: this is the opening state,
    // not something to re-run when the value changes underneath.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [isOpen, active])

  const choose = (i) => {
    const option = options[i]
    if (!option) return
    onChange(option.key)
    setOpen(false)
  }

  function onKeyDown(e) {
    if (disabled) return
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    switch (e.key) {
      case 'Escape':
        e.preventDefault()
        // Otherwise the sheet's own Escape handler closes the whole dialog.
        e.stopPropagation()
        setOpen(false)
        break
      case 'ArrowDown':
        e.preventDefault()
        setActive((i) => Math.min(i + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setActive((i) => Math.max(i - 1, 0))
        break
      case 'Home':
        e.preventDefault()
        setActive(0)
        break
      case 'End':
        e.preventDefault()
        setActive(options.length - 1)
        break
      case 'Enter':
      case ' ':
        e.preventDefault()
        choose(active)
        break
      case 'Tab':
        setOpen(false)
        break
      default:
        break
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={rootId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listId}
        aria-labelledby={labelledBy ? `${labelledBy} ${rootId}` : undefined}
        aria-activedescendant={isOpen ? `${listId}-${active}` : undefined}
        disabled={disabled || options.length === 0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onKeyDown}
        className={`flex min-h-[48px] w-full items-center gap-2 rounded-lg border bg-surface px-3 py-2 text-left text-sm outline-none disabled:opacity-60 ${
          isOpen ? 'border-series' : 'border-hairline'
        }`}
      >
        {selected?.color && (
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 rounded-sm"
            style={{ background: selected.color }}
          />
        )}
        <span className={`min-w-0 flex-1 truncate ${selected ? 'text-ink' : 'text-muted'}`}>
          {selected ? (
            <>
              {selected.icon && <span aria-hidden="true" className="mr-1.5">{selected.icon}</span>}
              {selected.label}
            </>
          ) : (
            placeholder
          )}
        </span>
        <span
          aria-hidden="true"
          className={`shrink-0 text-xs text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          ▼
        </span>
      </button>

      {isOpen && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={labelledBy}
          style={{ maxHeight: placement.maxHeight }}
          className={`anim-fade-in absolute inset-x-0 z-10 overflow-y-auto overscroll-contain rounded-lg border border-hairline bg-surface py-1 shadow-lg ${
            placement.up ? 'bottom-full mb-1' : 'top-full mt-1'
          }`}
        >
          {options.map((o, i) => {
            const isSelected = o.key === value
            return (
              <li
                key={o.key}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={isSelected}
                data-active={i === active ? 'true' : undefined}
                onClick={() => choose(i)}
                className={`flex min-h-[44px] cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-wash ${
                  i === active ? 'bg-wash' : ''
                } ${isSelected ? 'font-semibold text-ink' : 'text-ink-2'}`}
              >
                {o.color && (
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ background: o.color }}
                  />
                )}
                {o.icon && <span aria-hidden="true">{o.icon}</span>}
                <span className="min-w-0 flex-1 truncate">{o.label}</span>
                {isSelected && <span aria-hidden="true" className="shrink-0 text-series">✓</span>}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
