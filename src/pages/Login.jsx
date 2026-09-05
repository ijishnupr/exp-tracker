import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signInWithGoogle, error, clearError } = useAuth()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-series text-3xl">
          <span aria-hidden="true">📊</span>
        </div>
        <h1 className="text-xl font-semibold text-ink">Expense Tracker</h1>
        <p className="mt-2 text-sm text-ink-2">
          Log spending in two taps, set monthly budgets, and export to Excel. Works offline once
          installed.
        </p>

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-lg border p-3 text-left text-xs"
            style={{ borderColor: 'var(--status-critical)', color: 'var(--status-critical)' }}
          >
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => {
            clearError()
            void signInWithGoogle()
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg border border-hairline bg-surface px-4 py-3 text-sm font-semibold text-ink hover:bg-wash"
        >
          <GoogleMark />
          Continue with Google
        </button>

        <p className="mt-4 text-xs text-muted">
          Signing in needs a connection once. After that the app works offline.
        </p>
      </div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.34A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.01-2.34z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.94l3.01 2.34C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  )
}
