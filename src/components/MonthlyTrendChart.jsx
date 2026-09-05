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
import { formatMoney } from '../lib/money'

/** Income vs expense over time — two series, so it is grouped bars with a
 *  legend always present. Only the month in view is direct-labelled; a number
 *  on every bar would be twelve numbers of noise. */
export default function MonthlyTrendChart({ data, currency, showIncome = true }) {
  const max = Math.max(...data.flatMap((d) => [d.expense, showIncome ? d.income : 0]), 0)

  const label = (key) => ({
    position: 'top',
    fontSize: 10,
    fill: 'var(--text-secondary)',
    formatter: (v) => v,
    content: ({ x, y, width, index }) => {
      const row = data[index]
      if (!row?.isSelected || !row[key]) return null
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
          {showIncome && (
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
              isAnimationActive={false}
              label={label('income')}
            >
              {data.map((d) => (
                <Cell key={d.key} fillOpacity={d.isSelected ? 1 : 0.4} />
              ))}
            </Bar>
          )}
          <Bar
            dataKey="expense"
            name="Expense"
            fill="var(--series-expense)"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
            label={label('expense')}
          >
            {data.map((d) => (
              /* Emphasis: past months recede, the month in view is solid. */
              <Cell key={d.key} fillOpacity={d.isSelected ? 1 : 0.4} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
