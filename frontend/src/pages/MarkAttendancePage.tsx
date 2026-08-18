import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Webcam from 'react-webcam'
import { AnimatePresence, motion } from 'motion/react'
import { ScanFace, Loader2, CheckCircle2, XCircle, Clock, LogIn, UserPlus, Fingerprint, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ChatWidget } from '@/components/ChatWidget'
import { FeedbackWidget } from '@/components/FeedbackWidget'
import { useFaceAlignment } from '@/hooks/useFaceAlignment'
import { markAttendance, apiErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast-store'
import { cn, dataUrlToBlob, firstName, initials, timeOfDayGreeting } from '@/lib/utils'
import type { MarkAttendanceResult } from '@/types'

interface LogEntry extends MarkAttendanceResult {
  id: number
  time: string
}

function LiveClock() {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="text-right">
      <p className="text-lg font-semibold tabular-nums text-slate-200">
        {now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
      </p>
      <p className="text-xs text-slate-500">
        {now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
      </p>
    </div>
  )
}

export function MarkAttendancePage() {
  const navigate = useNavigate()
  const webcamRef = useRef<Webcam>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null)
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<MarkAttendanceResult | null>(null)
  const [resultTime, setResultTime] = useState<Date | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const alignment = useFaceAlignment(videoEl, cameraReady && !scanning)

  async function handleScan() {
    const dataUrl = webcamRef.current?.getScreenshot()
    if (!dataUrl) {
      toast.error('Could not capture a frame from the camera')
      return
    }
    setScanning(true)
    setResult(null)
    try {
      const data = await markAttendance(dataUrlToBlob(dataUrl))
      setResult(data)
      setResultTime(new Date())
      setLog((prev) => [{ ...data, id: Date.now(), time: new Date().toLocaleTimeString() }, ...prev].slice(0, 8))
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Attendance check failed'))
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-10 text-slate-100">
      <div className="mx-auto grid w-full max-w-5xl grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
                  <Fingerprint className="h-4 w-4" />
                </span>
                <h1 className="text-2xl font-semibold text-slate-50">Nepa Technologies</h1>
              </div>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wider text-indigo-400/80">
                Biometric Attendance System
              </p>
              <p className="mt-1.5 text-sm text-slate-500">Start your day with a smile, cheese... 😊</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <LiveClock />
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate('/register')}>
                  <UserPlus className="h-4 w-4" />
                  Sign up
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
                  <LogIn className="h-4 w-4" />
                  Admin login
                </Button>
              </div>
            </div>
          </div>

          <Card>
            <CardContent className="space-y-4 pt-5">
              <div className="relative aspect-video overflow-hidden rounded-lg border border-slate-800 bg-slate-950">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  mirrored
                  screenshotFormat="image/jpeg"
                  videoConstraints={{ width: 640, height: 480, facingMode: 'user' }}
                  onUserMedia={() => {
                    setCameraReady(true)
                    setCameraError(null)
                    setVideoEl(webcamRef.current?.video ?? null)
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
                {cameraReady && !scanning && (
                  <>
                    <motion.div
                      key={alignment}
                      className={cn(
                        'pointer-events-none absolute inset-6 rounded-lg border-2',
                        alignment === 'aligned' && 'border-emerald-400',
                        (alignment === 'misaligned' || alignment === 'no-face') && 'border-red-500',
                        alignment === 'loading' && 'border-indigo-400/20',
                      )}
                      animate={alignment === 'loading' ? { opacity: 1 } : { opacity: [0.45, 1, 0.45] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut' }}
                    />
                    {alignment !== 'loading' && (
                      <div
                        className={cn(
                          'pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm',
                          alignment === 'aligned' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300',
                        )}
                      >
                        {alignment === 'aligned' ? 'Face aligned - ready to scan' : 'Move your face into the frame'}
                      </div>
                    )}
                  </>
                )}
                <AnimatePresence>
                  {scanning && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/40 text-slate-100"
                    >
                      <div className="absolute inset-6 overflow-hidden rounded-lg border border-indigo-400/40">
                        <motion.div
                          className="absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-indigo-400/50 to-transparent"
                          initial={{ y: '-100%' }}
                          animate={{ y: '300%' }}
                          transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
                        />
                      </div>
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p className="text-sm font-medium">Verifying identity...</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <Button onClick={handleScan} disabled={!cameraReady || scanning} size="lg" className="w-full">
                <ScanFace className="h-5 w-5" />
                {scanning ? 'Verifying identity...' : 'Scan to check in / out'}
              </Button>
            </CardContent>
          </Card>

          <AnimatePresence mode="wait">
            {result && <ResultPanel key={result.employee?.id ?? 'no-match'} result={result} time={resultTime} />}
          </AnimatePresence>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Session log</CardTitle>
            <CardDescription>Recent scans this session</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {log.length === 0 && <p className="text-sm text-slate-500">No scans yet.</p>}
              <AnimatePresence initial={false}>
                {log.map((entry) => (
                  <motion.div
                    key={entry.id}
                    layout
                    initial={{ opacity: 0, y: -8, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="flex items-center gap-3 rounded-lg border border-slate-800 p-2.5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold">
                      {entry.employee ? initials(entry.employee.name) : '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-200">
                        {entry.employee?.name ?? 'Unrecognized'}
                      </p>
                      <p className="flex items-center gap-1 truncate text-[11px] text-slate-500">
                        <Clock className="h-3 w-3" /> {entry.time}
                      </p>
                    </div>
                    <StatusIcon result={entry} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>

      <ChatWidget />
      <FeedbackWidget />
    </div>
  )
}

function StatusIcon({ result }: { result: MarkAttendanceResult }) {
  if (result.matched) return <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0ca30c]" />
  return <XCircle className="h-4 w-4 shrink-0 text-[#d03b3b]" />
}

function ResultPanel({ result, time }: { result: MarkAttendanceResult; time: Date | null }) {
  const tone = result.matched ? 'border-[#0ca30c]/30 bg-[#0ca30c]/10' : 'border-[#d03b3b]/30 bg-[#d03b3b]/10'
  const stamp = (time ?? new Date()).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97, y: 8 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: 0,
        x: result.matched ? 0 : [0, -6, 6, -4, 4, 0],
      }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={cn('relative flex items-center gap-4 overflow-hidden rounded-xl border p-5', tone)}
    >
      {result.matched && (
        <motion.span
          className="absolute left-5 top-5 h-4 w-4 rounded-full bg-[#0ca30c]/40"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 2.4, opacity: 0 }}
          transition={{ duration: 1, repeat: 2, ease: 'easeOut' }}
        />
      )}

      {result.matched && result.employee ? (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#0ca30c]/15 text-sm font-semibold text-[#0ca30c]">
          {initials(result.employee.name)}
        </div>
      ) : (
        <StatusIcon result={result} />
      )}

      <div className="min-w-0 flex-1">
        {result.matched && result.employee ? (
          <>
            <p className="text-sm font-semibold text-slate-100">
              {timeOfDayGreeting()}, {firstName(result.employee.name)}!
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-300">
                {result.type === 'check_in' ? (
                  <LogIn className="h-3 w-3 text-[#0ca30c]" />
                ) : (
                  <LogOut className="h-3 w-3 text-[#0ca30c]" />
                )}
                {result.type === 'check_in' ? 'Checked in' : 'Checked out'} at {stamp}
              </span>
              <Badge variant="neutral">{result.employee.department}</Badge>
              <Badge variant="neutral">{result.employee.employee_code}</Badge>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-slate-100">We couldn't recognize you</p>
            <p className="mt-0.5 text-sm text-slate-400">{result.message}</p>
          </>
        )}
        {result.confidence_score !== null && (
          <p className="mt-1 text-xs text-slate-500">Confidence: {(result.confidence_score * 100).toFixed(1)}%</p>
        )}
        {!result.matched && (
          <Link to="/register" className="mt-2 inline-block text-xs font-medium text-indigo-400 hover:text-indigo-300">
            First time here? Sign up &rarr;
          </Link>
        )}
      </div>
    </motion.div>
  )
}
