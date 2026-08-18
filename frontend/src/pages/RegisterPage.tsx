import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import Webcam from 'react-webcam'
import { AnimatePresence, motion } from 'motion/react'
import { ArrowLeft, Camera, Check, Fingerprint, Loader2, Trash2, UserPlus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input, Label, Select } from '@/components/ui/input'
import { registerEmployee, apiErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast-store'
import { cn, dataUrlToBlob } from '@/lib/utils'

const TARGET_SHOTS = 1
const SHIFT_TYPES = ['Morning', 'Evening', 'Night', 'General / Rotational']

function Required() {
  return (
    <span className="text-red-400" aria-hidden="true">
      {' '}
      *
    </span>
  )
}

interface DetailsState {
  name: string
  department: string
  departmentId: string
  position: string
  joiningDate: string
  hrName: string
  officeLocation: string
  contact: string
  address: string
  shiftType: string
}

const EMPTY_DETAILS: DetailsState = {
  name: '',
  department: '',
  departmentId: '',
  position: '',
  joiningDate: '',
  hrName: '',
  officeLocation: '',
  contact: '',
  address: '',
  shiftType: '',
}

export function RegisterPage() {
  const navigate = useNavigate()
  const webcamRef = useRef<Webcam>(null)
  const [details, setDetails] = useState<DetailsState>(EMPTY_DETAILS)
  const [confirmed, setConfirmed] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [shots, setShots] = useState<{ blob: Blob; url: string }[]>([])
  const [justCaptured, setJustCaptured] = useState(false)

  const progress = Math.min(shots.length / TARGET_SHOTS, 1)
  const targetReached = shots.length >= TARGET_SHOTS
  const detailsComplete = Object.values(details).every((value) => value.trim().length > 0)
  const canSubmit = detailsComplete && confirmed && shots.length > 0

  function updateField<K extends keyof DetailsState>(key: K, value: DetailsState[K]) {
    setDetails((prev) => ({ ...prev, [key]: value }))
  }

  const mutation = useMutation({
    mutationFn: () =>
      registerEmployee({
        name: details.name.trim(),
        department: details.department.trim(),
        department_id: details.departmentId.trim(),
        position: details.position.trim(),
        joining_date: details.joiningDate,
        hr_name: details.hrName.trim(),
        office_location: details.officeLocation.trim(),
        contact: details.contact.trim(),
        address: details.address.trim(),
        shift_type: details.shiftType,
        confirmed,
        images: shots.map((s) => s.blob),
      }),
    onSuccess: (result) => {
      toast.success(result.message)
      navigate('/')
    },
    onError: (err) => toast.error(apiErrorMessage(err, 'Sign up failed - try clearer, well-lit shots')),
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
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="mx-auto w-full max-w-2xl space-y-6"
      >
        <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Back to scanner
        </Link>

        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
              <Fingerprint className="h-4 w-4" />
            </span>
            <h1 className="text-2xl font-semibold text-slate-50">Welcome to Nepa Technologies</h1>
          </div>
          <p className="mt-1.5 text-sm text-slate-500">
            First time here? Let's get you set up - it only takes a minute, no admin needed.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Your details</CardTitle>
            <CardDescription>
              Fields marked <span className="text-red-400">*</span> are required.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">
                Full name
                <Required />
              </Label>
              <Input
                id="name"
                required
                value={details.name}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder="Jane Doe"
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="department">
                  Department
                  <Required />
                </Label>
                <Input
                  id="department"
                  required
                  value={details.department}
                  onChange={(e) => updateField('department', e.target.value)}
                  placeholder="Engineering"
                />
              </div>
              <div>
                <Label htmlFor="department_id">
                  Department ID
                  <Required />
                </Label>
                <Input
                  id="department_id"
                  required
                  value={details.departmentId}
                  onChange={(e) => updateField('departmentId', e.target.value)}
                  placeholder="DEP-102"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="position">
                  Position
                  <Required />
                </Label>
                <Input
                  id="position"
                  required
                  value={details.position}
                  onChange={(e) => updateField('position', e.target.value)}
                  placeholder="Software Engineer"
                />
              </div>
              <div>
                <Label htmlFor="joining_date">
                  Joining date
                  <Required />
                </Label>
                <Input
                  id="joining_date"
                  type="date"
                  required
                  value={details.joiningDate}
                  onChange={(e) => updateField('joiningDate', e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="hr_name">
                  HR name
                  <Required />
                </Label>
                <Input
                  id="hr_name"
                  required
                  value={details.hrName}
                  onChange={(e) => updateField('hrName', e.target.value)}
                  placeholder="Who onboarded you"
                />
              </div>
              <div>
                <Label htmlFor="office_location">
                  Office location
                  <Required />
                </Label>
                <Input
                  id="office_location"
                  required
                  value={details.officeLocation}
                  onChange={(e) => updateField('officeLocation', e.target.value)}
                  placeholder="Building / floor / city"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="contact">
                  Contact number
                  <Required />
                </Label>
                <Input
                  id="contact"
                  required
                  value={details.contact}
                  onChange={(e) => updateField('contact', e.target.value)}
                  placeholder="+1 555 010 1234"
                />
              </div>
              <div>
                <Label htmlFor="shift_type">
                  Shift type
                  <Required />
                </Label>
                <Select
                  id="shift_type"
                  required
                  value={details.shiftType}
                  onChange={(e) => updateField('shiftType', e.target.value)}
                >
                  <option value="" disabled>
                    Select a shift
                  </option>
                  {SHIFT_TYPES.map((shift) => (
                    <option key={shift} value={shift}>
                      {shift}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="address">
                Address
                <Required />
              </Label>
              <Input
                id="address"
                required
                value={details.address}
                onChange={(e) => updateField('address', e.target.value)}
                placeholder="Street, city, postal code"
              />
            </div>

            <label className="flex items-start gap-2.5 pt-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-600 bg-slate-950 text-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:ring-offset-0"
              />
              All the above information is correct
            </label>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Capture your face</CardTitle>
            <CardDescription>
              One clear, well-lit shot looking straight at the camera is enough.
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

            <Button onClick={handleCapture} disabled={!cameraReady} variant="secondary" className="w-full">
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

            <Button className="w-full" disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              Create my profile
            </Button>
            {!detailsComplete && (
              <p className="text-center text-xs text-slate-500">Fill in all details above to continue.</p>
            )}
            {detailsComplete && !confirmed && (
              <p className="text-center text-xs text-slate-500">Confirm your details are correct to continue.</p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
