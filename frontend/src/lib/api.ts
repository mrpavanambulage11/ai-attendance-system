import axios from 'axios'
import { useAuthStore } from '@/lib/auth-store'
import type {
  AttendanceRecord,
  AttendanceStatus,
  AuthUser,
  DashboardSummary,
  DepartmentBreakdown,
  LeaderboardEntry,
  Person,
  RecognitionResult,
  SystemSettings,
  TrendPoint,
} from '@/types'

export const api = axios.create({ baseURL: '/api' })

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout()
    }
    return Promise.reject(error)
  },
)

export function apiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data?.detail
    if (typeof detail === 'string') return detail
  }
  return fallback
}

// --- Auth ---
export async function login(email: string, password: string) {
  const { data } = await api.post<{ access_token: string; token_type: string }>('/auth/login', {
    email,
    password,
  })
  return data
}

export async function fetchMe() {
  const { data } = await api.get<AuthUser>('/auth/me')
  return data
}

// --- People ---
export async function fetchPeople(department?: string) {
  const { data } = await api.get<Person[]>('/people', { params: { department } })
  return data
}

export async function createPerson(payload: { full_name: string; external_id: string; department: string; email?: string }) {
  const { data } = await api.post<Person>('/people', payload)
  return data
}

export async function updatePerson(id: number, payload: Partial<Pick<Person, 'full_name' | 'department' | 'email' | 'is_active'>>) {
  const { data } = await api.patch<Person>(`/people/${id}`, payload)
  return data
}

export async function deletePerson(id: number) {
  await api.delete(`/people/${id}`)
}

export async function enrollPerson(id: number, images: Blob[]) {
  const formData = new FormData()
  images.forEach((image, index) => formData.append('files', image, `capture-${index}.jpg`))
  // Do NOT set Content-Type manually - the browser must generate the multipart boundary itself.
  const { data } = await api.post<{ person_id: number; images_used: number; is_enrolled: boolean }>(
    `/people/${id}/enroll`,
    formData,
  )
  return data
}

// --- Recognition ---
export async function identifyFace(frames: Blob[]) {
  const formData = new FormData()
  frames.forEach((frame, index) => formData.append('frames', frame, `frame-${index}.jpg`))
  const { data } = await api.post<RecognitionResult>('/recognition/identify', formData)
  return data
}

// --- Attendance ---
export interface AttendanceFilters {
  person_id?: number
  department?: string
  date_from?: string
  date_to?: string
}

export async function fetchAttendance(filters: AttendanceFilters = {}) {
  const { data } = await api.get<AttendanceRecord[]>('/attendance', { params: filters })
  return data
}

export async function createAttendance(personId: number, status: AttendanceStatus) {
  const { data } = await api.post<AttendanceRecord>('/attendance', { person_id: personId, status })
  return data
}

export async function updateAttendance(id: number, payload: { status?: AttendanceStatus }) {
  const { data } = await api.patch<AttendanceRecord>(`/attendance/${id}`, payload)
  return data
}

export async function deleteAttendance(id: number) {
  await api.delete(`/attendance/${id}`)
}

export async function downloadAttendanceExport(filters: AttendanceFilters = {}) {
  const response = await api.get('/attendance/export', { params: filters, responseType: 'blob' })
  const url = URL.createObjectURL(response.data as Blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'attendance_export.csv'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

// --- Dashboard ---
export async function fetchDashboardSummary() {
  const { data } = await api.get<DashboardSummary>('/dashboard/summary')
  return data
}

export async function fetchTrends(days = 14) {
  const { data } = await api.get<TrendPoint[]>('/dashboard/trends', { params: { days } })
  return data
}

export async function fetchDepartments() {
  const { data } = await api.get<DepartmentBreakdown[]>('/dashboard/departments')
  return data
}

export async function fetchLeaderboard(days = 30) {
  const { data } = await api.get<LeaderboardEntry[]>('/dashboard/leaderboard', { params: { days } })
  return data
}

export async function fetchSettings() {
  const { data } = await api.get<SystemSettings>('/dashboard/settings')
  return data
}

export async function updateSettings(payload: Partial<SystemSettings>) {
  const { data } = await api.put<SystemSettings>('/dashboard/settings', payload)
  return data
}
