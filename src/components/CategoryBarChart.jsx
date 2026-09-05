import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import ChartTooltip from './ChartTooltip'
import { formatMoney } from '../lib/money'

/** Compare magnitude across categories, low → high. A horizontal bar chart
 *  beats a pie here: long category names fit, and lengths are comparable
 *  where angles are not. Value labels are always visible, which is also the
 *  relief the light-mode contrast warning requires. */
export default function CategoryBarChart({ data, currency }) {
  const max = Math.max(...data.map((d) => d.total), 0)
  const rowHeight = 34

  return (
    <div style={{ height: Math.max(data.length * rowHeight, rowHeight) }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 2, right: 76, bottom: 2, left: 0 }}
          barCategoryGap="22%"
        >
          <XAxis type="number" hide domain={[0, max ? max * 1.02 : 1]} />
          <YAxis
            type="category"
            dataKey="label"
            width={124}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
          />
          <Tooltip content={<ChartTooltip currency={currency} labelKey="label" />} cursor={{ fill: 'var(--wash)' }} />
          <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={14} isAnimationActive={false}
            label={{
              position: 'right',
              formatter: (v) => formatMoney(v, currency, { compact: true }),
              fill: 'var(--text-secondary)',
              fontSize: 11,
            }}
          >
            {data.map((d) => (
              /* One measure, one hue — the category chip in the list carries
                 identity; repainting each bar would encode nothing extra. */
              <Cell key={d.key} fill="var(--series-1)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
