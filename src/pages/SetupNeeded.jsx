const STEPS = [
  'Create a project at console.firebase.google.com.',
  'Add a Web app (Project settings › General › Your apps) and copy its SDK config.',
  'Enable Authentication › Sign-in method › Google.',
  'Create a Firestore database in production mode.',
  'Copy .env.example to .env, paste the config values in, and restart `npm run dev`.',
]

export default function SetupNeeded() {
  return (
    <div className="mx-auto max-w-lg px-6 py-12">
      <h1 className="text-lg font-semibold text-ink">Firebase is not configured yet</h1>
      <p className="mt-2 text-sm text-ink-2">
        The app reads its Firebase config from environment variables and none are set.
      </p>
      <ol className="mt-5 space-y-3">
        {STEPS.map((s, i) => (
          <li key={s} className="flex gap-3 text-sm text-ink-2">
            <span
              aria-hidden="true"
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
              style={{ background: 'var(--series-1)' }}
            >
              {i + 1}
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ol>
      <p className="mt-6 text-xs text-muted">
        Full walkthrough, including <code>firebase deploy</code>, is in README.md.
      </p>
    </div>
  )
}
