import { useQuery } from '@tanstack/react-query'
import { CalendarCheck2, Percent, Flame } from 'lucide-react'
import { StatTile } from '@/components/StatTile'
import { TrendChart } from '@/components/charts/TrendChart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { fetchMySummary, fetchMyTrend, fetchMyRecords } from '@/lib/api'
import { formatDate, formatTime } from '@/lib/utils'
import { useAuthStore } from '@/lib/auth-store'
import type { BadgeProps } from '@/components/ui/badge'

const STATUS_BADGE: Record<string, { variant: BadgeProps['variant']; label: string }> = {
  present: { variant: 'success', label: 'Present today' },
  late: { variant: 'warning', label: 'Late today' },
  absent: { variant: 'neutral', label: 'Not marked yet' },
}

export function MyDashboardPage() {
  const user = useAuthStore((s) => s.user)
  const summary = useQuery({ queryKey: ['me', 'summary'], queryFn: fetchMySummary })
  const trend = useQuery({ queryKey: ['me', 'trend'], queryFn: () => fetchMyTrend(30) })
  const records = useQuery({ queryKey: ['me', 'records'], queryFn: () => fetchMyRecords(15) })

  const todayStatus = summary.data?.today_status ?? 'absent'
  const statusBadge = STATUS_BADGE[todayStatus]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">
          Welcome back{user ? `, ${user.full_name.split(' ')[0]}` : ''}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {summary.data ? `${summary.data.external_id} · ${summary.data.department}` : 'Your personal attendance overview.'}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-400">Today</p>
            {statusBadge && <Badge variant={statusBadge.variant}>{statusBadge.label}</Badge>}
          </div>
          <p className="mt-3 text-3xl font-semibold capitalize text-slate-50">{todayStatus}</p>
        </div>
        <StatTile
          label="This month"
          value={summary.data ? `${summary.data.this_month_rate}%` : '—'}
          icon={Percent}
        />
        <StatTile
          label="Last 30 days"
          value={summary.data ? `${summary.data.last_30_days_rate}%` : '—'}
          icon={CalendarCheck2}
          accent="good"
        />
        <StatTile
          label="Current streak"
          value={summary.data ? `${summary.data.current_streak} ${summary.data.current_streak === 1 ? 'day' : 'days'}` : '—'}
          icon={Flame}
          accent="warning"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your attendance trend</CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>{trend.data && <TrendChart data={trend.data} />}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent check-ins</CardTitle>
          <CardDescription>Your latest attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {records.data?.map((r) => (
                  <tr key={r.id} className="bg-slate-950/40 hover:bg-slate-900/40">
                    <td className="px-4 py-3 text-slate-300">{formatDate(r.timestamp)}</td>
                    <td className="px-4 py-3 text-slate-400">{formatTime(r.timestamp)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={r.status === 'present' ? 'success' : 'warning'}>{r.status}</Badge>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-400">{r.method}</td>
                  </tr>
                ))}
                {records.data?.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                      No attendance records yet - check in via face recognition to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
