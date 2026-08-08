import { useEffect, useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Loader2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input, Label } from '@/components/ui/input'
import { fetchSettings, updateSettings, apiErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast-store'

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function SettingsPage() {
  const queryClient = useQueryClient()
  const { data } = useQuery({ queryKey: ['settings'], queryFn: fetchSettings })
  const [lateCutoff, setLateCutoff] = useState('09:15')
  const [workingDays, setWorkingDays] = useState<string[]>(['Mon', 'Tue', 'Wed', 'Thu', 'Fri'])

  useEffect(() => {
    if (data) {
      setLateCutoff(data.late_cutoff_time)
      setWorkingDays(data.working_days.split(',').filter(Boolean))
    }
  }, [data])

  const mutation = useMutation({
    mutationFn: () => updateSettings({ late_cutoff_time: lateCutoff, working_days: workingDays.join(',') }),
    onSuccess: () => {
      toast.success('Settings saved')
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: (error) => toast.error(apiErrorMessage(error)),
  })

  function toggleDay(day: string) {
    setWorkingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    mutation.mutate()
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Configure attendance rules organization-wide.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance rules</CardTitle>
          <CardDescription>Applies to both face-recognition and manual check-ins.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="cutoff">Late cutoff time</Label>
              <Input
                id="cutoff"
                type="time"
                value={lateCutoff}
                onChange={(e) => setLateCutoff(e.target.value)}
                className="w-40"
              />
              <p className="mt-1.5 text-xs text-slate-500">Check-ins after this time are marked "late".</p>
            </div>

            <div>
              <Label>Working days</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                      workingDays.includes(day)
                        ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                        : 'border-slate-700 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save settings
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
