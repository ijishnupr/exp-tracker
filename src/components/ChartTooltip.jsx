import { formatMoney } from '../lib/money'

/** Shared hover tooltip. Text wears ink tokens, never the series colour — the
 *  swatch beside it carries identity. */
export default function ChartTooltip({ active, payload, currency, labelKey = 'fullLabel' }) {
  if (!active || !payload?.length) return null
  const row = payload[0].payload

  return (
    <div className="pointer-events-none rounded-lg border border-hairline bg-surface px-3 py-2 shadow-lg">
      <div className="text-xs text-ink-2">{row[labelKey] ?? row.label}</div>
      <div className="mt-1 space-y-0.5">
        {payload.map((p) => (
          <div key={p.dataKey} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: p.color ?? row.color ?? 'var(--series-1)' }}
            />
            <span className="text-xs text-muted">{p.name}</span>
            <span className="ml-auto text-sm font-semibold tabular text-ink">
              {formatMoney(p.value, currency)}
            </span>
          </div>
        ))}
      </div>
      {payload.length > 1 && typeof row.net === 'number' && (
        <div className="mt-1 border-t border-grid pt-1 text-xs text-muted">
          Net {formatMoney(row.net, currency)}
        </div>
      )}
      {typeof row.share === 'number' && (
        <div className="mt-0.5 text-xs text-muted">{row.share.toFixed(1)}% of month</div>
      )}
    </div>
  )
}
