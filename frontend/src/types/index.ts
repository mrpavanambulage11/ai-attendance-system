export type UserRole = 'admin' | 'teacher'

export interface AuthUser {
  id: number
  email: string
  full_name: string
  role: UserRole
}

export interface Person {
  id: number
  full_name: string
  external_id: string
  department: string
  email: string | null
  photo_path: string | null
  is_active: boolean
  is_enrolled: boolean
  created_at: string
}

export type AttendanceStatus = 'present' | 'late'
export type AttendanceMethod = 'face' | 'manual'

export interface PersonSummary {
  id: number
  full_name: string
  external_id: string
  department: string
}

export interface AttendanceRecord {
  id: number
  person: PersonSummary
  timestamp: string
  status: AttendanceStatus
  method: AttendanceMethod
  confidence: number | null
  marked_by: string | null
}

export interface RecognitionResult {
  matched: boolean
  liveness_passed: boolean
  person: PersonSummary | null
  confidence: number | null
  attendance_marked: boolean
  message: string
}

export interface DashboardSummary {
  total_people: number
  present_today: number
  late_today: number
  absent_today: number
  attendance_rate_today: number
}

export interface TrendPoint {
  date: string
  present: number
  late: number
  absent: number
}

export interface DepartmentBreakdown {
  department: string
  present: number
  total: number
  rate: number
}

export interface LeaderboardEntry {
  person_id: number
  full_name: string
  department: string
  days_present: number
  total_days: number
  attendance_rate: number
}

export interface SystemSettings {
  late_cutoff_time: string
  working_days: string
}
