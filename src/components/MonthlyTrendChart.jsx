import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import ChartTooltip from './ChartTooltip'

// Bars rise on load and re-animate to new heights when the month changes.
// Skipped for anyone who has asked their OS for less motion: Recharts animates
// in JS, so the CSS reduced-motion rule does not reach it.
const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
const ANIM = {
  isAnimationActive: !reduceMotion,
  animationDuration: 650,
  animationEasing: 'ease-out',
}
import { formatMoney } from '../lib/money'

/** Income vs expense over time — two series, so it is grouped bars with a
 *  legend always present. Only the month in view is direct-labelled; a number
 *  on every bar would be twelve numbers of noise. */
export default function MonthlyTrendChart({ data, currency, showIncome = true, showExpense = true }) {
  const max = Math.max(
    ...data.flatMap((d) => [showExpense ? d.expense : 0, showIncome ? d.income : 0]),
    0,
  )
  // With a month in view, the others recede and only it is labelled. A report
  // over a range has no such month, so every bar is drawn at full strength.
  const anySelected = data.some((d) => d.isSelected)
  const opacity = (d) => (!anySelected || d.isSelected ? 1 : 0.4)
  const both = showIncome && showExpense

  const label = (key) => ({
    position: 'top',
    fontSize: 10,
    fill: 'var(--text-secondary)',
    formatter: (v) => v,
    content: ({ x, y, width, index }) => {
      const row = data[index]
      if (!anySelected || !row?.isSelected || !row[key]) return null
      return (
        <text
          x={x + width / 2}
          y={y - 4}
          textAnchor="middle"
          fontSize={10}
          fill="var(--text-secondary)"
        >
          {formatMoney(row[key], currency, { compact: true })}
        </text>
      )
    },
  })

  return (
    <div className="h-[210px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 8, bottom: 0, left: 8 }} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke="var(--gridline)" strokeWidth={1} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={{ stroke: 'var(--baseline)' }}
            tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            dy={4}
          />
          <YAxis hide domain={[0, max ? max * 1.18 : 1]} />
          <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: 'var(--wash)' }} />
          {both && (
            <Legend
              verticalAlign="top"
              align="left"
              height={22}
              iconType="square"
              iconSize={9}
              formatter={(value) => (
                <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{value}</span>
              )}
            />
          )}
          {showIncome && (
            <Bar
              dataKey="income"
              name="Income"
              fill="var(--series-income)"
              radius={[4, 4, 0, 0]}
              {...ANIM}
              label={label('income')}
            >
              {data.map((d) => (
                <Cell key={d.key} fillOpacity={opacity(d)} />
              ))}
            </Bar>
          )}
          {showExpense && (
          <Bar
            dataKey="expense"
            name="Expense"
            fill="var(--series-expense)"
            radius={[4, 4, 0, 0]}
            {...ANIM}
            animationBegin={both ? 120 : 0}
            label={label('expense')}
          >
            {data.map((d) => (
              /* Emphasis: past months recede, the month in view is solid. */
              <Cell key={d.key} fillOpacity={opacity(d)} />
            ))}
          </Bar>
          )}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
