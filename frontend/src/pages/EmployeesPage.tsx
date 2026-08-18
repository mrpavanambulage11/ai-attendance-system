import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { motion } from 'motion/react'
import { Plus, Search, ScanFace, CheckCircle2, CircleDashed, Users, IdCard } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { createEmployee, fetchEmployees, apiErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast-store'
import { formatDate, formatDateTime, initials } from '@/lib/utils'
import type { Employee } from '@/types'

export function EmployeesPage() {
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [viewing, setViewing] = useState<Employee | null>(null)

  const { data: employees = [], isLoading } = useQuery({ queryKey: ['employees'], queryFn: fetchEmployees })

  const departments = useMemo(() => Array.from(new Set(employees.map((e) => e.department))).sort(), [employees])

  const filtered = employees.filter((e) => {
    const matchesSearch =
      !search ||
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.employee_code.toLowerCase().includes(search.toLowerCase())
    const matchesDept = !department || e.department === department
    return matchesSearch && matchesDept
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Employees</h1>
          <p className="mt-1 text-sm text-slate-500">Manage your team and their enrolled face profiles.</p>
        </div>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="h-4 w-4" /> Add employee
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            className="pl-9"
            placeholder="Search by name or employee code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={department} onChange={(e) => setDepartment(e.target.value)} className="sm:w-56">
          <option value="">All departments</option>
          {departments.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800">
        <table className="w-full text-sm">
          <thead className="bg-slate-900/80 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Employee code</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Position</th>
              <th className="px-4 py-3 font-medium">Enrollment</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-16" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-5 w-20 rounded-full" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Skeleton className="ml-auto h-8 w-8 rounded-md" />
                  </td>
                </tr>
              ))}
            {!isLoading &&
              filtered.map((employee, index) => (
                <motion.tr
                  key={employee.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: Math.min(index * 0.03, 0.3) }}
                  className="bg-slate-950/40 hover:bg-slate-900/40"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-300">
                        {initials(employee.name)}
                      </div>
                      <span className="font-medium text-slate-200">{employee.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{employee.employee_code}</td>
                  <td className="px-4 py-3">
                    <Badge variant="neutral">{employee.department}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-400">{employee.position ?? '—'}</td>
                  <td className="px-4 py-3">
                    {employee.is_enrolled ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Enrolled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-slate-500">
                        <CircleDashed className="h-3.5 w-3.5" /> Not enrolled
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" size="icon" title="View details" onClick={() => setViewing(employee)}>
                      <IdCard className="h-4 w-4" />
                    </Button>
                    <Link to={`/admin/employees/${employee.id}/enroll`}>
                      <Button variant="ghost" size="icon" title="Enroll face">
                        <ScanFace className="h-4 w-4" />
                      </Button>
                    </Link>
                  </td>
                </motion.tr>
              ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-16">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-slate-500">
                      <Users className="h-5 w-5" />
                    </div>
                    <p className="text-sm font-medium text-slate-300">
                      {employees.length === 0 ? 'Your team is empty for now' : 'No one matches these filters'}
                    </p>
                    <p className="text-xs text-slate-500">
                      {employees.length === 0
                        ? 'Add your first team member and enroll their face to get them checking in.'
                        : 'Try a different search term or department.'}
                    </p>
                    {employees.length === 0 && (
                      <Button size="sm" className="mt-2" onClick={() => setAddOpen(true)}>
                        <Plus className="h-4 w-4" /> Add employee
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddEmployeeDialog open={addOpen} onClose={() => setAddOpen(false)} />
      <EmployeeDetailsDialog employee={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={value ? 'mt-0.5 text-sm text-slate-200' : 'mt-0.5 text-sm italic text-slate-600'}>
        {value ?? 'Not provided'}
      </p>
    </div>
  )
}

function EmployeeDetailsDialog({ employee, onClose }: { employee: Employee | null; onClose: () => void }) {
  return (
    <Dialog open={employee !== null} onClose={onClose} title={employee?.name ?? ''} description="Employee profile">
      {employee && (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-300">
              {initials(employee.name)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="neutral">{employee.department}</Badge>
              {employee.is_enrolled ? (
                <Badge variant="success">Enrolled</Badge>
              ) : (
                <Badge variant="warning">Not enrolled</Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4">
            <DetailField label="Employee code" value={employee.employee_code} />
            <DetailField label="Department ID" value={employee.department_id} />
            <DetailField label="Position" value={employee.position} />
            <DetailField label="Shift type" value={employee.shift_type} />
            <DetailField label="Joining date" value={employee.joining_date ? formatDate(employee.joining_date) : null} />
            <DetailField label="HR contact" value={employee.hr_name} />
            <DetailField label="Office location" value={employee.office_location} />
            <DetailField label="Contact number" value={employee.contact} />
            <div className="col-span-2">
              <DetailField label="Address" value={employee.address} />
            </div>
            <div className="col-span-2">
              <DetailField label="Profile created" value={formatDateTime(employee.created_at)} />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Link to={`/admin/employees/${employee.id}/enroll`}>
              <Button variant="secondary" onClick={onClose}>
                <ScanFace className="h-4 w-4" />
                {employee.is_enrolled ? 'Re-enroll face' : 'Enroll face'}
              </Button>
            </Link>
          </div>
        </div>
      )}
    </Dialog>
  )
}

function AddEmployeeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [employeeCode, setEmployeeCode] = useState('')
  const [dept, setDept] = useState('General')

  const mutation = useMutation({
    mutationFn: () => createEmployee({ name, employee_code: employeeCode, department: dept }),
    onSuccess: (employee) => {
      toast.success(`🎉 Welcome, ${employee.name}! Enroll their face next.`)
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      setName('')
      setEmployeeCode('')
      setDept('General')
      onClose()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not add employee')),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a new employee"
      description="Create their profile, then enroll their face so they can start checking in."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name">Full name</Label>
          <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="employee_code">Employee code</Label>
          <Input
            id="employee_code"
            required
            value={employeeCode}
            onChange={(e) => setEmployeeCode(e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="department">Department</Label>
          <Input id="department" required value={dept} onChange={(e) => setDept(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            Add employee
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
