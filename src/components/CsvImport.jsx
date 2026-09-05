import { useRef, useState } from 'react'
import { useData } from '../context/DataContext'
import { formatMoney } from '../lib/money'

/** CSV import with a confirm step. Records carry deterministic ids derived from
 *  the row, so importing the same file twice updates in place instead of
 *  doubling the data. */
export default function CsvImport() {
  const { categories, importEntries } = useData()
  const [preview, setPreview] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | parsing | ready | writing | done
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)
  const fileRef = useRef(null)

  async function pick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setPhase('parsing')
    setError(null)
    setResult(null)
    try {
      const text = await file.text()
      // Loaded on demand — the parser is only needed if someone imports.
      const { parseAxioCsv } = await import('../lib/csvImport')
      const parsed = parseAxioCsv(text, { knownCategoryKeys: categories.map((c) => c.key) })
      if (!parsed.records.length) {
        throw new Error('No importable rows found in that file.')
      }
      setPreview({ ...parsed, fileName: file.name })
      setPhase('ready')
    } catch (err) {
      setError(err.message ?? 'Could not read that file.')
      setPhase('idle')
    }
  }

  async function confirm() {
    setPhase('writing')
    setProgress(0)
    try {
      const written = await importEntries(preview.records, preview.newCategories, (done, total) =>
        setProgress(Math.round((done / total) * 100)),
      )
      setResult({ written })
      setPhase('done')
      setPreview(null)
    } catch (err) {
      setError(err.message ?? 'Import failed partway through. Re-running it is safe.')
      setPhase('ready')
    }
  }

  function reset() {
    setPreview(null)
    setPhase('idle')
    setError(null)
    setResult(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const s = preview?.summary

  return (
    <section className="card p-4">
      <h2 className="text-sm font-semibold text-ink">Import from CSV</h2>
      <p className="mb-3 text-xs text-muted">
        Built for an Axio (Walnut) expense report export. <code>DR</code> rows become expenses and{' '}
        <code>CR</code> rows income; account and time are folded into each note. Self-transfers are
        skipped so totals are not double-counted.
      </p>

      {phase !== 'writing' && (
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          onChange={pick}
          aria-label="Choose a CSV file"
          className="w-full rounded-lg border border-hairline bg-surface px-3 py-3 text-sm text-ink-2 file:mr-3 file:min-h-[36px] file:rounded file:border-0 file:bg-wash file:px-3 file:text-sm file:font-medium file:text-ink"
        />
      )}

      {phase === 'parsing' && <p className="mt-2 text-xs text-muted">Reading file…</p>}

      {s && phase === 'ready' && (
        <div className="mt-3 rounded-lg border border-hairline p-3">
          <p className="text-xs font-semibold text-ink">{preview.fileName}</p>
          <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
            <Row k="Will import" v={`${s.imported} entries`} strong />
            <Row k="Date range" v={`${s.firstDate} → ${s.lastDate}`} />
            <Row k="Income rows" v={`${s.income} · ${formatMoney(s.incomeTotal, 'INR')}`} />
            <Row k="Expense rows" v={`${s.expense} · ${formatMoney(s.expenseTotal, 'INR')}`} />
            <Row k="Skipped transfers" v={String(s.skippedTransfers)} />
            <Row k="Skipped invalid" v={String(s.skippedInvalid)} />
            <Row k="Uncategorised" v={String(s.uncategorised)} />
            <Row k="Duplicate rows kept" v={String(s.duplicateRows)} />
          </dl>

          {preview.newCategories.length > 0 && (
            <p className="mt-2 text-xs text-ink-2">
              New categories to create:{' '}
              <span className="font-medium">
                {preview.newCategories.map((c) => c.label).join(', ')}
              </span>
            </p>
          )}

          {s.uncategorised > s.imported * 0.3 && (
            <p className="mt-2 text-xs" style={{ color: 'var(--status-warning)' }}>
              <span aria-hidden="true">▲ </span>
              {Math.round((s.uncategorised / s.imported) * 100)}% of rows had no usable category in
              the file and land in “Other”. You can re-file them from Transactions afterwards.
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={confirm}
              className="min-h-[44px] rounded-lg bg-series px-4 text-xs font-semibold text-white"
            >
              Import {s.imported} entries
            </button>
            <button
              type="button"
              onClick={reset}
              className="min-h-[44px] rounded-lg border border-hairline px-4 text-xs font-medium text-ink-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {phase === 'writing' && (
        <div className="mt-3">
          <p className="text-xs text-ink-2">Importing… {progress}%</p>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full" style={{ background: 'var(--wash)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${progress}%`, background: 'var(--series-1)' }}
            />
          </div>
          <p className="mt-1.5 text-xs text-muted">
            Writing in batches of 500. Leaving this screen would stop it partway — re-running the
            import afterwards is safe.
          </p>
        </div>
      )}

      {result && (
        <p role="status" className="mt-2 flex items-start gap-1.5 text-xs" style={{ color: 'var(--status-good)' }}>
          <span aria-hidden="true">✓</span>
          <span>
            Imported {result.written} entries. Use the month picker to browse back through them.
          </span>
        </p>
      )}

      {error && (
        <p role="alert" className="mt-2 flex items-start gap-1.5 text-xs" style={{ color: 'var(--status-critical)' }}>
          <span aria-hidden="true">✕</span>
          <span>{error}</span>
        </p>
      )}
    </section>
  )
}

function Row({ k, v, strong = false }) {
  return (
    <>
      <dt className="text-muted">{k}</dt>
      <dd className={`text-right tabular ${strong ? 'font-semibold text-ink' : 'text-ink-2'}`}>{v}</dd>
    </>
  )
}
