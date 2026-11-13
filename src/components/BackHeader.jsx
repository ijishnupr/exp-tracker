import { useLocation, useNavigate } from 'react-router-dom'

/** Header for a page reached from another one: a back control, then the title.
 *  Back returns to wherever you came from; opened directly (no history in this
 *  tab), it goes to the dashboard rather than out of the app. */
export default function BackHeader({ title, icon, children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const back = () => (location.key === 'default' ? navigate('/') : navigate(-1))

  return (
    <div className="flex items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          onClick={back}
          aria-label="Back"
          className="press -ml-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-xl text-ink-2 hover:bg-wash"
        >
          ‹
        </button>
        <h1 className="flex min-w-0 items-center gap-2 text-lg font-semibold text-ink">
          {icon && <span aria-hidden="true">{icon}</span>}
          <span className="truncate">{title}</span>
        </h1>
      </div>
      {children}
    </div>
  )
}
