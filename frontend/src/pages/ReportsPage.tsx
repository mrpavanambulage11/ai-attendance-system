import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select } from '@/components/ui/input'
import { DepartmentChart } from '@/components/charts/DepartmentChart'
import { TrendChart } from '@/components/charts/TrendChart'
import { fetchDepartments, fetchLeaderboard, fetchTrends } from '@/lib/api'

export function ReportsPage() {
  const [days, setDays] = useState(30)
  const trends = useQuery({ queryKey: ['dashboard', 'trends', days], queryFn: () => fetchTrends(days) })
  const departments = useQuery({ queryKey: ['dashboard', 'departments'], queryFn: fetchDepartments })
  const leaderboard = useQuery({
    queryKey: ['dashboard', 'leaderboard', days],
    queryFn: () => fetchLeaderboard(days),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Deeper attendance analytics across a custom time window.</p>
        </div>
        <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="sm:w-48">
          <option value={7}>Last 7 days</option>
          <option value={14}>Last 14 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance trend</CardTitle>
          <CardDescription>Present / late / absent over the selected window</CardDescription>
        </CardHeader>
        <CardContent>{trends.data && <TrendChart data={trends.data} />}</CardContent>
      </Card>

      <Card>
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

      <Card>
        <CardHeader>
          <CardTitle>Attendance leaderboard</CardTitle>
          <CardDescription>Ranked by attendance rate over the selected window</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-lg border border-slate-800">
            <table className="w-full text-sm">
              <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Rank</th>
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Department</th>
                  <th className="px-4 py-2.5 font-medium">Days present</th>
                  <th className="px-4 py-2.5 font-medium">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {leaderboard.data?.map((entry, index) => (
                  <tr key={entry.person_id} className="bg-slate-950/40">
                    <td className="px-4 py-2.5 text-slate-500">#{index + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-200">{entry.full_name}</td>
                    <td className="px-4 py-2.5 text-slate-400">{entry.department}</td>
                    <td className="px-4 py-2.5 tabular-nums text-slate-400">
                      {entry.days_present} / {entry.total_days}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-[#3987e5]"
                            style={{ width: `${Math.min(entry.attendance_rate, 100)}%` }}
                          />
                        </div>
                        <span className="tabular-nums text-slate-300">{entry.attendance_rate}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {leaderboard.data?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                      No attendance data in this window.
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
