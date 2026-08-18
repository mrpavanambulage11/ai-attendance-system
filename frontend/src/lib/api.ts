import axios from 'axios'
import { useAuthStore } from '@/lib/auth-store'
import type { AttendanceRecord, Employee, EmployeeRegisterResult, MarkAttendanceResult } from '@/types'

// VITE_API_URL points at the deployed backend (e.g. Render) when frontend and backend are on
// different origins, as with Vercel + Render. Left unset, this resolves to '', so requests stay
// relative to the current origin - which is what makes Vite's local dev proxy (see
// vite.config.ts) work unchanged.
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? '' })

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
export async function login(username: string, password: string) {
  const { data } = await api.post<{ access_token: string; token_type: string }>('/auth/login', {
    username,
    password,
  })
  return data
}

// --- Employees ---
export async function fetchEmployees() {
  const { data } = await api.get<Employee[]>('/employees')
  return data
}

export async function createEmployee(payload: { name: string; employee_code: string; department: string }) {
  const { data } = await api.post<Employee>('/employees', payload)
  return data
}

export async function enrollFace(employeeId: number, images: Blob[]) {
  const formData = new FormData()
  images.forEach((image, index) => formData.append('files', image, `capture-${index}.jpg`))
  // Do NOT set Content-Type manually - the browser must generate the multipart boundary itself.
  const { data } = await api.post<{ employee_id: number; frames_used: number; message: string }>(
    `/employees/${employeeId}/enroll-face`,
    formData,
  )
  return data
}

export interface RegisterEmployeePayload {
  name: string
  department: string
  department_id: string
  position: string
  joining_date: string
  hr_name: string
  office_location: string
  contact: string
  address: string
  shift_type: string
  confirmed: boolean
  images: Blob[]
}

export async function registerEmployee(payload: RegisterEmployeePayload) {
  const formData = new FormData()
  formData.append('name', payload.name)
  formData.append('department', payload.department)
  formData.append('department_id', payload.department_id)
  formData.append('position', payload.position)
  formData.append('joining_date', payload.joining_date)
  formData.append('hr_name', payload.hr_name)
  formData.append('office_location', payload.office_location)
  formData.append('contact', payload.contact)
  formData.append('address', payload.address)
  formData.append('shift_type', payload.shift_type)
  formData.append('confirmed', String(payload.confirmed))
  payload.images.forEach((image, index) => formData.append('files', image, `capture-${index}.jpg`))
  const { data } = await api.post<EmployeeRegisterResult>('/employees/register', formData)
  return data
}

// --- Attendance ---
export async function markAttendance(frame: Blob) {
  const formData = new FormData()
  formData.append('file', frame, 'frame.jpg')
  const { data } = await api.post<MarkAttendanceResult>('/attendance/mark', formData)
  return data
}

export interface AttendanceFilters {
  employee_id?: number
  date_from?: string
  date_to?: string
}

export async function fetchAttendance(filters: AttendanceFilters = {}) {
  const { data } = await api.get<AttendanceRecord[]>('/attendance', { params: filters })
  return data
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
