import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, ScanFace, Pencil, Trash2, CheckCircle2, CircleDashed } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label, Select } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog } from '@/components/ui/dialog'
import { createPerson, deletePerson, fetchPeople, updatePerson, apiErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from '@/lib/toast-store'
import { initials } from '@/lib/utils'
import type { Person } from '@/types'

export function PeoplePage() {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin')
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [department, setDepartment] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [editing, setEditing] = useState<Person | null>(null)

  const { data: people = [], isLoading } = useQuery({ queryKey: ['people'], queryFn: () => fetchPeople() })

  const departments = useMemo(() => Array.from(new Set(people.map((p) => p.department))).sort(), [people])

  const filtered = people.filter((p) => {
    const matchesSearch =
      !search ||
      p.full_name.toLowerCase().includes(search.toLowerCase()) ||
      p.external_id.toLowerCase().includes(search.toLowerCase())
    const matchesDept = !department || p.department === department
    return matchesSearch && matchesDept
  })

  const deleteMutation = useMutation({
    mutationFn: deletePerson,
    onSuccess: () => {
      toast.success('Person removed')
      queryClient.invalidateQueries({ queryKey: ['people'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">People</h1>
          <p className="mt-1 text-sm text-slate-500">Manage enrolled people and their face profiles.</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add person
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            className="pl-9"
            placeholder="Search by name or ID..."
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
              <th className="px-4 py-3 font-medium">ID</th>
              <th className="px-4 py-3 font-medium">Department</th>
              <th className="px-4 py-3 font-medium">Enrollment</th>
              <th className="px-4 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {filtered.map((person) => (
              <tr key={person.id} className="bg-slate-950/40 hover:bg-slate-900/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold text-slate-300">
                      {initials(person.full_name)}
                    </div>
                    <span className="font-medium text-slate-200">{person.full_name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-400">{person.external_id}</td>
                <td className="px-4 py-3">
                  <Badge variant="neutral">{person.department}</Badge>
                </td>
                <td className="px-4 py-3">
                  {person.is_enrolled ? (
                    <span className="inline-flex items-center gap-1.5 text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Enrolled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-slate-500">
                      <CircleDashed className="h-3.5 w-3.5" /> Not enrolled
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <Link to={`/app/people/${person.id}/enroll`}>
                      <Button variant="ghost" size="icon" title="Enroll face">
                        <ScanFace className="h-4 w-4" />
                      </Button>
                    </Link>
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="icon" title="Edit" onClick={() => setEditing(person)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Delete"
                          onClick={() => {
                            if (confirm(`Remove ${person.full_name}? This deletes their attendance history too.`)) {
                              deleteMutation.mutate(person.id)
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-400" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!isLoading && filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No people found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddPersonDialog open={addOpen} onClose={() => setAddOpen(false)} />
      {editing && <EditPersonDialog person={editing} onClose={() => setEditing(null)} />}
    </div>
  )
}

function AddPersonDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState('')
  const [externalId, setExternalId] = useState('')
  const [dept, setDept] = useState('General')
  const [email, setEmail] = useState('')

  const mutation = useMutation({
    mutationFn: () => createPerson({ full_name: fullName, external_id: externalId, department: dept, email: email || undefined }),
    onSuccess: () => {
      toast.success('Person added - enroll their face next')
      queryClient.invalidateQueries({ queryKey: ['people'] })
      setFullName('')
      setExternalId('')
      setDept('General')
      setEmail('')
      onClose()
    },
    onError: (error) => toast.error(apiErrorMessage(error, 'Could not add person')),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add person" description="Create a profile, then enroll their face.">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="external_id">ID / roll number</Label>
          <Input id="external_id" required value={externalId} onChange={(e) => setExternalId(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="department">Department</Label>
          <Input id="department" required value={dept} onChange={(e) => setDept(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="email">Email (optional)</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            Add person
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function EditPersonDialog({ person, onClose }: { person: Person; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [fullName, setFullName] = useState(person.full_name)
  const [dept, setDept] = useState(person.department)
  const [isActive, setIsActive] = useState(person.is_active)

  const mutation = useMutation({
    mutationFn: () => updatePerson(person.id, { full_name: fullName, department: dept, is_active: isActive }),
    onSuccess: () => {
      toast.success('Person updated')
      queryClient.invalidateQueries({ queryKey: ['people'] })
      onClose()
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <Dialog open onClose={onClose} title="Edit person">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="edit_full_name">Full name</Label>
          <Input id="edit_full_name" required value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="edit_department">Department</Label>
          <Input id="edit_department" required value={dept} onChange={(e) => setDept(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-300">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            Save changes
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
