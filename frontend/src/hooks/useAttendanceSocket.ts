import { useEffect, useRef, useState } from 'react'
import { useAuthStore } from '@/lib/auth-store'
import type { AttendanceLiveEvent } from '@/types'

export type LiveStatus = 'connecting' | 'connected' | 'disconnected'

/** Same origin resolution as api.ts's VITE_API_URL - only ws(s):// instead of http(s):// -
 * needed because frontend and backend can live on different domains (e.g. Vercel + Render). */
function socketUrl(token: string): string {
  const apiUrl = import.meta.env.VITE_API_URL
  if (apiUrl) {
    const backend = new URL(apiUrl)
    const protocol = backend.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${backend.host}/attendance/ws?token=${encodeURIComponent(token)}`
  }
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/attendance/ws?token=${encodeURIComponent(token)}`
}

/** Live feed of check-ins/check-outs over /attendance/ws, with auto-reconnect (exponential
 * backoff, capped at 15s). Requires an admin token - the endpoint rejects anonymous connections. */
export function useAttendanceSocket(onEvent: (event: AttendanceLiveEvent) => void): LiveStatus {
  const token = useAuthStore((s) => s.token)
  const [status, setStatus] = useState<LiveStatus>('connecting')
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  useEffect(() => {
    if (!token) return undefined

    let socket: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let closedByUs = false
    let attempt = 0

    function connect() {
      socket = new WebSocket(socketUrl(token as string))

      socket.onopen = () => {
        attempt = 0
        setStatus('connected')
      }
      socket.onmessage = (event) => {
        try {
          onEventRef.current(JSON.parse(event.data))
        } catch {
          // ignore malformed payloads
        }
      }
      socket.onclose = () => {
        if (closedByUs) return
        setStatus('disconnected')
        attempt += 1
        const delay = Math.min(1000 * 2 ** attempt, 15000)
        reconnectTimer = setTimeout(connect, delay)
      }
      socket.onerror = () => socket?.close()
    }

    connect()

    return () => {
      closedByUs = true
      if (reconnectTimer) clearTimeout(reconnectTimer)
      socket?.close()
    }
  }, [token])

  return status
}
