import { useCallback, useEffect, useRef, useState } from 'react'

export function useWebcam() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setReady(true)
      } catch {
        setError('Could not access the camera. Grant camera permission and reload the page.')
      }
    }

    start()
    return () => {
      cancelled = true
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const captureBlob = useCallback((quality = 0.9): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current
      if (!video || video.videoWidth === 0) {
        resolve(null)
        return
      }
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(null)
        return
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
    })
  }, [])

  const captureBurst = useCallback(
    async (count: number, intervalMs: number): Promise<Blob[]> => {
      const frames: Blob[] = []
      for (let i = 0; i < count; i += 1) {
        const blob = await captureBlob()
        if (blob) frames.push(blob)
        if (i < count - 1) await new Promise((resolve) => setTimeout(resolve, intervalMs))
      }
      return frames
    },
    [captureBlob],
  )

  return { videoRef, ready, error, captureBlob, captureBurst }
}
