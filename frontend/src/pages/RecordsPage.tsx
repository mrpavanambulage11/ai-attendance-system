import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import {
  createAttendance,
  deleteAttendance,
  downloadAttendanceExport,
  fetchAttendance,
  fetchPeople,
  apiErrorMessage,
} from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from '@/lib/toast-store'
import { formatDate, formatTime, initials } from '@/lib/utils'
import type { AttendanceStatus } from '@/types'

export function RecordsPage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin')
  const queryClient = useQueryClient()
  const [department, setDepartment] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [exporting, setExporting] = useState(false)

  const filters = { department: department || undefined, date_from: dateFrom || undefined, date_to: dateTo || undefined }

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
  const { data: people = [] } = useQuery({ queryKey: ['people'], queryFn: () => fetchPeople() })

  const departments = useMemo(() => Array.from(new Set(people.map((p) => p.department))).sort(), [people])

  const deleteMutation = useMutation({
    mutationFn: deleteAttendance,
    onSuccess: () => {
      toast.success('Record deleted')
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Attendance records</h1>
          <p className="mt-1 text-sm text-slate-500">Filter, review, and export attendance history.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
          {isAdmin && (
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Mark attendance
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Select value={department} onChange={(e) => setDepartment(e.target.value)}>
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
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
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Method</th>
              {isAdmin && <th className="px-4 py-3 font-medium text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {records.map((record) => (
              <tr key={record.id} className="bg-slate-950/40 hover:bg-slate-900/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[10px] font-semibold text-slate-300">
                      {initials(record.person.full_name)}
                    </div>
                    <span className="font-medium text-slate-200">{record.person.full_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-400">{record.person.department}</td>
                <td className="px-4 py-3 text-slate-400">{formatDate(record.timestamp)}</td>
                <td className="px-4 py-3 text-slate-400">{formatTime(record.timestamp)}</td>
                <td className="px-4 py-3">
                  <Badge variant={record.status === 'present' ? 'success' : 'warning'}>{record.status}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-400 capitalize">{record.method}</td>
                {isAdmin && (
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm('Delete this attendance record?')) deleteMutation.mutate(record.id)
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
            {!isLoading && records.length === 0 && (
              <tr>
                <td colSpan={isAdmin ? 7 : 6} className="px-4 py-10 text-center text-slate-500">
                  No records match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <MarkAttendanceDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

function MarkAttendanceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const { data: people = [] } = useQuery({ queryKey: ['people'], queryFn: () => fetchPeople() })
  const [personId, setPersonId] = useState('')
  const [status, setStatus] = useState<AttendanceStatus>('present')

  const mutation = useMutation({
    mutationFn: () => createAttendance(Number(personId), status),
    onSuccess: () => {
      toast.success('Attendance marked')
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setPersonId('')
      onClose()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not mark attendance')),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!personId) return
    mutation.mutate()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Mark attendance manually">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="person">Person</Label>
          <Select id="person" required value={personId} onChange={(e) => setPersonId(e.target.value)}>
            <option value="">Select a person...</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name} ({p.external_id})
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <Select id="status" value={status} onChange={(e) => setStatus(e.target.value as AttendanceStatus)}>
            <option value="present">Present</option>
            <option value="late">Late</option>
          </Select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            Mark attendance
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
