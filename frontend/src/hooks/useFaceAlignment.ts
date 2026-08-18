import { useEffect, useRef, useState } from 'react'
import { FaceDetector, FilesetResolver, type Detection } from '@mediapipe/tasks-vision'

export type AlignmentStatus = 'loading' | 'no-face' | 'misaligned' | 'aligned'

const DETECTION_INTERVAL_MS = 200

// A face bounding box narrower than this fraction of the frame width is "too far away"; wider
// than this is "too close" (or the camera is being blocked). Center thresholds require the face
// to sit roughly in the middle of the frame rather than clipped against an edge.
const MIN_WIDTH_RATIO = 0.16
const MAX_WIDTH_RATIO = 0.75
const CENTER_X_RANGE: [number, number] = [0.2, 0.8]
const CENTER_Y_RANGE: [number, number] = [0.12, 0.88]

let detectorPromise: Promise<FaceDetector> | null = null

function getFaceDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm',
    ).then((filesetResolver) =>
      FaceDetector.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite',
          delegate: 'CPU',
        },
        runningMode: 'VIDEO',
      }),
    )
  }
  return detectorPromise
}

function classify(detections: Detection[], frameWidth: number, frameHeight: number): AlignmentStatus {
  if (!frameWidth || !frameHeight || detections.length === 0) return 'no-face'

  const box = detections
    .map((d) => d.boundingBox)
    .filter((b): b is NonNullable<typeof b> => !!b)
    .sort((a, b) => b.width * b.height - a.width * a.height)[0]
  if (!box) return 'no-face'

  const widthRatio = box.width / frameWidth
  const centerX = (box.originX + box.width / 2) / frameWidth
  const centerY = (box.originY + box.height / 2) / frameHeight

  const wellSized = widthRatio >= MIN_WIDTH_RATIO && widthRatio <= MAX_WIDTH_RATIO
  const centered =
    centerX >= CENTER_X_RANGE[0] && centerX <= CENTER_X_RANGE[1] && centerY >= CENTER_Y_RANGE[0] && centerY <= CENTER_Y_RANGE[1]

  return wellSized && centered ? 'aligned' : 'misaligned'
}

/** Runs MediaPipe's face detector against a live <video> element every ~200ms and classifies
 * whether a face is present and well-framed (centered, not too close/far), so the UI can give
 * live "move into frame" feedback before the user hits Scan. This is a UX affordance only - the
 * backend's DeepFace pipeline remains the actual authority on whether a face is present. */
export function useFaceAlignment(videoEl: HTMLVideoElement | null, active: boolean): AlignmentStatus {
  const [status, setStatus] = useState<AlignmentStatus>('loading')
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!active || !videoEl) {
      setStatus('loading')
      return undefined
    }

    let cancelled = false
    setStatus('loading')

    getFaceDetector()
      .then((detector) => {
        if (cancelled) return
        intervalRef.current = setInterval(() => {
          if (!videoEl || videoEl.readyState < 2) return
          const result = detector.detectForVideo(videoEl, performance.now())
          setStatus(classify(result.detections, videoEl.videoWidth, videoEl.videoHeight))
        }, DETECTION_INTERVAL_MS)
      })
      .catch(() => {
        if (!cancelled) setStatus('no-face')
      })

    return () => {
      cancelled = true
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [videoEl, active])

  return status
}
