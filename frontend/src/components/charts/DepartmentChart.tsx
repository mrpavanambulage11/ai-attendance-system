import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'
import type { DepartmentBreakdown } from '@/types'

// Single series -> sequential brand hue (dark-mode step), no legend needed.
const SERIES_COLOR = '#3987e5'

export function DepartmentChart({ data }: { data: DepartmentBreakdown[] }) {
  const formatted = data.map((d) => ({ ...d, name: `${d.rate}%` }))

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={formatted} margin={{ top: 8, right: 12, left: -12, bottom: 0 }} barSize={32}>
        <CartesianGrid vertical={false} stroke="#2c2c2a" strokeDasharray="0" />
        <XAxis dataKey="department" tick={{ fill: '#898781', fontSize: 11 }} axisLine={{ stroke: '#383835' }} tickLine={false} />
        <YAxis
          tick={{ fill: '#898781', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          unit="%"
          domain={[0, 100]}
        />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="rate" name="Attendance rate" fill={SERIES_COLOR} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
