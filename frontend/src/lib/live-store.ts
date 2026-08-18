import { create } from 'zustand'
import type { AttendanceLiveEvent } from '@/types'

interface LiveState {
  lastEvent: AttendanceLiveEvent | null
  setLastEvent: (event: AttendanceLiveEvent) => void
}

/** Holds the most recent /attendance/ws event so pages other than the one that owns the
 * socket connection (AppShell) can react to it - e.g. highlighting a newly-arrived row. */
export const useLiveStore = create<LiveState>((set) => ({
  lastEvent: null,
  setLastEvent: (event) => set({ lastEvent: event }),
}))
