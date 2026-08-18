import { useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Webcam from 'react-webcam'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Camera, Check, Loader2, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { enrollFace, fetchEmployees, apiErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast-store'
import { cn, dataUrlToBlob } from '@/lib/utils'

const TARGET_SHOTS = 4

export function EnrollFacePage() {
  const { id } = useParams<{ id: string }>()
  const employeeId = Number(id)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const webcamRef = useRef<Webcam>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [shots, setShots] = useState<{ blob: Blob; url: string }[]>([])
  const [justCaptured, setJustCaptured] = useState(false)

  const { data: employees } = useQuery({ queryKey: ['employees'], queryFn: fetchEmployees })
  const employee = employees?.find((e) => e.id === employeeId)
  const progress = Math.min(shots.length / TARGET_SHOTS, 1)
  const targetReached = shots.length >= TARGET_SHOTS

  const mutation = useMutation({
    mutationFn: () => enrollFace(employeeId, shots.map((s) => s.blob)),
    onSuccess: () => {
      toast.success(`🎉 ${employee?.name ?? 'They'} can now check in with just a scan.`)
      queryClient.invalidateQueries({ queryKey: ['employees'] })
      navigate('/admin')
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Enrollment failed - try clearer, well-lit shots')),
  })

  function handleCapture() {
    const dataUrl = webcamRef.current?.getScreenshot()
    if (!dataUrl) {
      toast.error('Could not capture a frame from the camera')
      return
    }
    const blob = dataUrlToBlob(dataUrl)
    setShots((prev) => [...prev, { blob, url: URL.createObjectURL(blob) }])
    setJustCaptured(true)
    setTimeout(() => setJustCaptured(false), 250)
  }

  function removeShot(index: number) {
    setShots((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="mx-auto max-w-2xl space-y-6"
    >
      <Link to="/admin" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
        <ArrowLeft className="h-4 w-4" /> Back to employees
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Enroll face</h1>
        <p className="mt-1 text-sm text-slate-500">
          {employee ? `Let's get ${employee.name} set up to check in with just a glance.` : 'Loading employee...'}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Camera</CardTitle>
          <CardDescription>
            Capture {TARGET_SHOTS}+ shots: look straight on, then slightly left, right, and up/down. Good, even
            lighting improves recognition accuracy. Frames with no face, or more than one face, are rejected when
            you save.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-800">
              <motion.div
                className={cn('h-full rounded-full', targetReached ? 'bg-emerald-500' : 'bg-indigo-500')}
                animate={{ width: `${progress * 100}%` }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <span
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                targetReached ? 'text-emerald-400' : 'text-slate-500',
              )}
            >
              {targetReached && <Check className="h-3.5 w-3.5" />}
              {shots.length}/{TARGET_SHOTS}
            </span>
          </div>

          <motion.div
            animate={justCaptured ? { scale: [1, 1.015, 1] } : {}}
            transition={{ duration: 0.25 }}
            className="relative aspect-video overflow-hidden rounded-lg border border-slate-800 bg-slate-950"
          >
            <Webcam
              ref={webcamRef}
              audio={false}
              mirrored
              screenshotFormat="image/jpeg"
              videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
              onUserMedia={() => {
                setCameraReady(true)
                setCameraError(null)
              }}
              onUserMediaError={() =>
                setCameraError('Could not access the camera. Grant camera permission and reload the page.')
              }
              className="h-full w-full object-cover"
            />
            {!cameraReady && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">
                Starting camera...
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-red-400">
                {cameraError}
              </div>
            )}
            <AnimatePresence>
              {justCaptured && (
                <motion.div
                  initial={{ opacity: 0.9 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="absolute inset-0 bg-white"
                />
              )}
            </AnimatePresence>
          </motion.div>

          <Button onClick={handleCapture} disabled={!cameraReady} className="w-full">
            <Camera className="h-4 w-4" />
            Capture shot ({shots.length})
          </Button>

          {shots.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              <AnimatePresence>
                {shots.map((shot, index) => (
                  <motion.div
                    key={shot.url}
                    layout
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.5 }}
                    transition={{ duration: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
                    className="group relative aspect-square overflow-hidden rounded-md border border-slate-800"
                  >
                    <img src={shot.url} alt={`Capture ${index + 1}`} className="h-full w-full object-cover" />
                    <button
                      onClick={() => removeShot(index)}
                      className="absolute inset-0 flex items-center justify-center bg-slate-950/60 opacity-0 transition-opacity group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
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
    </motion.div>
  )
}
