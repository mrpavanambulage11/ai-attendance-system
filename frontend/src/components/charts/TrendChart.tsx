import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import type { TrendPoint } from '@/types'

// Status palette (fixed, never themed): present=good, late=warning, absent=critical.
const STATUS = {
  present: { key: 'present', label: 'Present', color: '#0ca30c' },
  late: { key: 'late', label: 'Late', color: '#fab219' },
  absent: { key: 'absent', label: 'Absent', color: '#d03b3b' },
} as const

export function TrendChart({ data }: { data: TrendPoint[] }) {
  const formatted = data.map((point) => ({
    ...point,
    label: new Date(point.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
  }))

  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={formatted} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#2c2c2a" strokeDasharray="0" />
        <XAxis dataKey="label" tick={{ fill: '#898781', fontSize: 11 }} axisLine={{ stroke: '#383835' }} tickLine={false} />
        <YAxis tick={{ fill: '#898781', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#383835', strokeWidth: 1 }} />
        <Legend
          verticalAlign="top"
          height={28}
          align="right"
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 12, color: '#c3c2b7' }}
        />
        <Area
          type="monotone"
          dataKey={STATUS.present.key}
          name={STATUS.present.label}
          stroke={STATUS.present.color}
          fill={STATUS.present.color}
          fillOpacity={0.15}
          strokeWidth={2}
          stackId="1"
        />
        <Area
          type="monotone"
          dataKey={STATUS.late.key}
          name={STATUS.late.label}
          stroke={STATUS.late.color}
          fill={STATUS.late.color}
          fillOpacity={0.15}
          strokeWidth={2}
          stackId="1"
        />
        <Area
          type="monotone"
          dataKey={STATUS.absent.key}
          name={STATUS.absent.label}
          stroke={STATUS.absent.color}
          fill={STATUS.absent.color}
          fillOpacity={0.15}
          strokeWidth={2}
          stackId="1"
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
