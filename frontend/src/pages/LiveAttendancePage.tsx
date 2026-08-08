import { useState } from 'react'
import { ScanFace, Loader2, CheckCircle2, XCircle, AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useWebcam } from '@/hooks/useWebcam'
import { identifyFace, apiErrorMessage } from '@/lib/api'
import { toast } from '@/lib/toast-store'
import { cn, initials } from '@/lib/utils'
import type { RecognitionResult } from '@/types'

const BURST_FRAMES = 6
const BURST_INTERVAL_MS = 160

interface LogEntry extends RecognitionResult {
  id: number
  time: string
}

export function LiveAttendancePage() {
  const { videoRef, ready, error, captureBurst } = useWebcam()
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<RecognitionResult | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])

  async function handleScan() {
    setScanning(true)
    setResult(null)
    try {
      const frames = await captureBurst(BURST_FRAMES, BURST_INTERVAL_MS)
      if (frames.length === 0) {
        toast.error('Could not capture frames from the camera')
        return
      }
      const data = await identifyFace(frames)
      setResult(data)
      setLog((prev) => [{ ...data, id: Date.now(), time: new Date().toLocaleTimeString() }, ...prev].slice(0, 8))
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Recognition failed'))
    } finally {
      setScanning(false)
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-50">Live attendance</h1>
          <p className="mt-1 text-sm text-slate-500">
            Step into frame and scan. A short blink is required to confirm liveness before check-in.
          </p>
        </div>

        <Card>
          <CardContent className="space-y-4 pt-5">
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
              {scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/50 text-slate-100">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <p className="text-sm font-medium">Scanning - blink naturally...</p>
                </div>
              )}
            </div>

            <Button onClick={handleScan} disabled={!ready || scanning} size="lg" className="w-full">
              <ScanFace className="h-5 w-5" />
              {scanning ? 'Scanning...' : 'Scan to check in'}
            </Button>
          </CardContent>
        </Card>

        {result && <ResultPanel result={result} />}
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Session log</CardTitle>
          <CardDescription>Recent scans this session</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {log.length === 0 && <p className="text-sm text-slate-500">No scans yet.</p>}
            {log.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 rounded-lg border border-slate-800 p-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-[11px] font-semibold">
                  {entry.person ? initials(entry.person.full_name) : '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-200">
                    {entry.person?.full_name ?? 'Unrecognized'}
                  </p>
                  <p className="flex items-center gap-1 truncate text-[11px] text-slate-500">
                    <Clock className="h-3 w-3" /> {entry.time}
                  </p>
                </div>
                <StatusIcon result={entry} />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusIcon({ result }: { result: RecognitionResult }) {
  if (result.attendance_marked) return <CheckCircle2 className="h-4 w-4 shrink-0 text-[#0ca30c]" />
  if (result.matched && !result.liveness_passed) return <AlertTriangle className="h-4 w-4 shrink-0 text-[#fab219]" />
  if (result.matched) return <Clock className="h-4 w-4 shrink-0 text-slate-500" />
  return <XCircle className="h-4 w-4 shrink-0 text-[#d03b3b]" />
}

function ResultPanel({ result }: { result: RecognitionResult }) {
  const tone = result.attendance_marked
    ? 'border-[#0ca30c]/30 bg-[#0ca30c]/10'
    : result.matched && !result.liveness_passed
      ? 'border-[#fab219]/30 bg-[#fab219]/10'
      : result.matched
        ? 'border-slate-700 bg-slate-900/60'
        : 'border-[#d03b3b]/30 bg-[#d03b3b]/10'

  return (
    <div className={cn('flex items-center gap-4 rounded-xl border p-5', tone)}>
      <StatusIcon result={result} />
      <div className="flex-1">
        <p className="text-sm font-semibold text-slate-100">
          {result.person?.full_name ?? 'No match found'}
        </p>
        <p className="mt-0.5 text-sm text-slate-400">{result.message}</p>
        {result.confidence !== null && (
          <p className="mt-1 text-xs text-slate-500">Confidence: {(result.confidence * 100).toFixed(1)}%</p>
        )}
      </div>
    </div>
  )
}
