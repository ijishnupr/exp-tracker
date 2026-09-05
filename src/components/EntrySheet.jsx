import { useSearchParams } from 'react-router-dom'
import Sheet from './Sheet'
import EntryForm from './EntryForm'
import { useData } from '../context/DataContext'

/**
 * The add/edit sheet. "Add" is driven by the `?add=1` search param rather than
 * component state, which makes it URL-addressable: the manifest shortcut, a
 * phone gesture, and the launch preference can all just open `/add`, and the
 * back button closes the sheet instead of leaving the app.
 */
export default function EntrySheet({ entry, onClose }) {
  const [params, setParams] = useSearchParams()
  const { currency, categories, categoriesLoaded, addEntry, updateEntry, deleteEntry } = useData()

  const adding = params.get('add') === '1'
  const editing = Boolean(entry)
  if (!adding && !editing) return null

  const close = () => {
    if (editing) {
      onClose?.()
      return
    }
    const next = new URLSearchParams(params)
    next.delete('add')
    // replace: the sheet is a mode, not a place worth a history entry of its own.
    setParams(next, { replace: true })
  }

  return (
    <Sheet title={editing ? 'Edit entry' : 'Add entry'} onClose={close}>
      <EntryForm
        entry={entry}
        currency={currency}
        categories={categories}
        categoriesLoaded={categoriesLoaded}
        onCancel={close}
        onSubmit={async (data) => {
          if (editing) await updateEntry(entry.id, data)
          else await addEntry(data)
          close()
        }}
        onDelete={
          editing
            ? async () => {
                await deleteEntry(entry.id)
                close()
              }
            : undefined
        }
      />
    </Sheet>
  )
}
