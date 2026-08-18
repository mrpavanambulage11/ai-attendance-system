import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { ClipboardList, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { downloadAttendanceExport, fetchAttendance, fetchEmployees, apiErrorMessage } from '@/lib/api'
import { useLiveStore } from '@/lib/live-store'
import { toast } from '@/lib/toast-store'
import { cn, formatDate, formatTime, initials } from '@/lib/utils'

export function AttendanceRecordsPage() {
  const [employeeId, setEmployeeId] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [exporting, setExporting] = useState(false)
  const [highlightId, setHighlightId] = useState<number | null>(null)
  const lastEvent = useLiveStore((s) => s.lastEvent)

  useEffect(() => {
    if (!lastEvent) return
    setHighlightId(lastEvent.id)
    const timer = setTimeout(() => setHighlightId(null), 3000)
    return () => clearTimeout(timer)
  }, [lastEvent])

  const filters = {
    employee_id: employeeId ? Number(employeeId) : undefined,
    date_from: dateFrom || undefined,
    date_to: dateTo || undefined,
  }

  async function handleExport() {
    setExporting(true)
    try {
      await downloadAttendanceExport(filters)
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Export failed'))
    } finally {
      setExporting(false)
    }
  }

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['attendance', filters],
    queryFn: () => fetchAttendance(filters),
  })
  const { data: employees = [] } = useQuery({ queryKey: ['employees'], queryFn: fetchEmployees })

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Attendance records</h1>
          <p className="mt-1 text-sm text-slate-500">Filter, review, and export check-in/check-out history.</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={exporting || records.length === 0}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">All employees</option>
          {employees.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} ({e.employee_code})
            </option>
          ))}
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Confidence</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-7 w-7 rounded-full" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-20" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-14" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-10" />
                  </td>
                </tr>
              ))}
            {!isLoading &&
              records.map((record, index) => (
                <motion.tr
                  key={record.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{
                    opacity: 1,
                    y: 0,
                    backgroundColor:
                      record.id === highlightId
                        ? ['rgba(16, 185, 129, 0.18)', 'rgba(2, 6, 23, 0)']
                        : 'rgba(2, 6, 23, 0)',
                  }}
                  transition={{
                    opacity: { duration: 0.2, delay: Math.min(index * 0.03, 0.3) },
                    y: { duration: 0.2, delay: Math.min(index * 0.03, 0.3) },
                    backgroundColor: { duration: 2.4, ease: 'easeOut' },
                  }}
                  className={cn('hover:bg-slate-900/40', record.id !== highlightId && 'bg-slate-950/40')}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300">
                        {initials(record.employee.name)}
                      </div>
                      <span className="font-medium text-slate-200">{record.employee.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{record.employee.department}</td>
                  <td className="px-4 py-3 text-slate-400">{formatDate(record.timestamp)}</td>
                  <td className="px-4 py-3 text-slate-400">{formatTime(record.timestamp)}</td>
                  <td className="px-4 py-3">
                    <Badge variant={record.type === 'check_in' ? 'success' : 'neutral'}>
                      {record.type === 'check_in' ? 'Check-in' : 'Check-out'}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {record.confidence_score !== null ? `${(record.confidence_score * 100).toFixed(1)}%` : '—'}
                  </td>
                </motion.tr>
              ))}
            {!isLoading && records.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-slate-500">
                      <ClipboardList className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-slate-300">No records match these filters</p>
                    <p className="text-xs text-slate-500">
                      Check-ins and check-outs will show up here as employees scan in.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
