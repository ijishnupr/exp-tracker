/** A labelled native date input. Native, so phones get their own date picker. */
export default function DateField({ label, value, max, onChange }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      <input
        type="date"
        value={value}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full min-w-0 rounded-lg border border-hairline bg-surface px-2 text-sm tabular text-ink outline-none focus:border-series"
      />
    </label>
  )
}
