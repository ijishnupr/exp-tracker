import { useSearchParams } from 'react-router-dom'

/** Floating add button. Sets the same `?add=1` param the launch shortcut uses,
 *  so there is exactly one way the sheet opens. */
export default function AddButton() {
  const [params, setParams] = useSearchParams()

  return (
    <button
      type="button"
      onClick={() => {
        const next = new URLSearchParams(params)
        next.set('add', '1')
        setParams(next)
      }}
      className="press fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-series text-2xl font-light text-white shadow-lg"
      aria-label="Add entry"
    >
      +
    </button>
  )
}
