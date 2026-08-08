import { useQuery } from '@tanstack/react-query'
import { Users, UserCheck, Clock, UserX, Trophy } from 'lucide-react'
import { StatTile } from '@/components/StatTile'
import { TrendChart } from '@/components/charts/TrendChart'
import { DepartmentChart } from '@/components/charts/DepartmentChart'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { fetchDashboardSummary, fetchDepartments, fetchLeaderboard, fetchTrends } from '@/lib/api'
import { initials } from '@/lib/utils'

export function DashboardPage() {
  const summary = useQuery({ queryKey: ['dashboard', 'summary'], queryFn: fetchDashboardSummary })
  const trends = useQuery({ queryKey: ['dashboard', 'trends'], queryFn: () => fetchTrends(14) })
  const departments = useQuery({ queryKey: ['dashboard', 'departments'], queryFn: fetchDepartments })
  const leaderboard = useQuery({ queryKey: ['dashboard', 'leaderboard'], queryFn: () => fetchLeaderboard(30) })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">Today's overview and recent attendance trends.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Total people" value={summary.data?.total_people ?? '—'} icon={Users} />
        <StatTile label="Present today" value={summary.data?.present_today ?? '—'} icon={UserCheck} accent="good" />
        <StatTile label="Late today" value={summary.data?.late_today ?? '—'} icon={Clock} accent="warning" />
        <StatTile label="Absent today" value={summary.data?.absent_today ?? '—'} icon={UserX} accent="critical" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance trend</CardTitle>
          <CardDescription>Present / late / absent over the last 14 days</CardDescription>
        </CardHeader>
        <CardContent>
          {trends.data && <TrendChart data={trends.data} />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Department breakdown</CardTitle>
            <CardDescription>Today's attendance rate by department</CardDescription>
          </CardHeader>
          <CardContent>
            {departments.data && departments.data.length > 0 ? (
              <DepartmentChart data={departments.data} />
            ) : (
              <p className="py-10 text-center text-sm text-slate-500">No people enrolled yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Top attendance (30d)</CardTitle>
            <CardDescription>Ranked by attendance rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard.data?.slice(0, 6).map((entry, index) => (
                <div key={entry.person_id} className="flex items-center gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-400">
                    {index === 0 ? <Trophy className="h-3.5 w-3.5 text-amber-400" /> : index + 1}
                  </div>
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold">
                    {initials(entry.full_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-200">{entry.full_name}</p>
                    <p className="truncate text-xs text-slate-500">{entry.department}</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums text-slate-300">{entry.attendance_rate}%</p>
                </div>
              ))}
              {leaderboard.data?.length === 0 && (
                <p className="py-6 text-center text-sm text-slate-500">No attendance data yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
