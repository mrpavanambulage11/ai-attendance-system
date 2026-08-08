import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Camera, Loader2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useWebcam } from '@/hooks/useWebcam'
import { enrollPerson, fetchPeople, apiErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast-store'

const TARGET_SHOTS = 4

export function EnrollPersonPage() {
  const { id } = useParams<{ id: string }>()
  const personId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { videoRef, ready, error, captureBlob } = useWebcam()
  const [shots, setShots] = useState<{ blob: Blob; url: string }[]>([])
  const [capturing, setCapturing] = useState(false)

  const { data: people } = useQuery({ queryKey: ['people'], queryFn: () => fetchPeople() })
  const person = people?.find((p) => p.id === personId)

  const mutation = useMutation({
    mutationFn: () => enrollPerson(personId, shots.map((s) => s.blob)),
    onSuccess: (result) => {
      toast.success(`Enrolled with ${result.images_used} image(s)`)
      queryClient.invalidateQueries({ queryKey: ['people'] })
      navigate('/app/people')
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Enrollment failed - try clearer, well-lit shots')),
  })

  async function handleCapture() {
    setCapturing(true)
    const blob = await captureBlob()
    setCapturing(false)
    if (!blob) {
      toast.error('Could not capture a frame from the camera')
      return
    }
    setShots((prev) => [...prev, { blob, url: URL.createObjectURL(blob) }])
  }

  function removeShot(index: number) {
    setShots((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link to="/app/people" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Back to people
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Enroll face</h1>
        <p className="mt-1 text-sm text-slate-500">
          {person ? `Capturing reference shots for ${person.full_name}` : 'Loading person...'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Camera</CardTitle>
          <CardDescription>
            Capture {TARGET_SHOTS}+ shots: look straight on, then slightly left, right, and up/down. Good, even
            lighting improves recognition accuracy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
            <video ref={videoRef} muted playsInline className="h-full w-full -scale-x-100 object-cover" />
            {!ready && !error && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
                Starting camera...
              </div>
            )}
            {error && (
              <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-red-400">
                {error}
              </div>
            )}
          </div>

          <Button onClick={handleCapture} disabled={!ready || capturing} className="w-full">
            {capturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            Capture shot ({shots.length})
          </Button>

          {shots.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {shots.map((shot, index) => (
                <div key={shot.url} className="group relative aspect-square overflow-hidden rounded-md border border-slate-800">
                  <img src={shot.url} alt={`Capture ${index + 1}`} className="h-full w-full object-cover" />
                  <button
                    onClick={() => removeShot(index)}
                    className="absolute inset-0 flex items-center justify-center bg-slate-950/60 opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <Button
            variant="secondary"
            className="w-full"
            disabled={shots.length === 0 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Save enrollment ({shots.length} image{shots.length === 1 ? '' : 's'})
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
