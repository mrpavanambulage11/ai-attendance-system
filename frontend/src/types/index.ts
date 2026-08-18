export interface AuthUser {
  username: string
}

export interface Employee {
  id: number
  name: string
  employee_code: string
  department: string
  created_at: string
  is_enrolled: boolean
  department_id: string | null
  position: string | null
  joining_date: string | null
  hr_name: string | null
  office_location: string | null
  contact: string | null
  address: string | null
  shift_type: string | null
}

export type AttendanceType = 'check_in' | 'check_out'

export interface EmployeeSummary {
  id: number
  name: string
  employee_code: string
  department: string
}

export interface AttendanceRecord {
  id: number
  employee: EmployeeSummary
  timestamp: string
  type: AttendanceType
  confidence_score: number | null
}

export interface MarkAttendanceResult {
  matched: boolean
  employee: EmployeeSummary | null
  type: AttendanceType | null
  confidence_score: number | null
  message: string
}

export interface EmployeeRegisterResult {
  employee: EmployeeSummary
  frames_used: number
  message: string
}

/** Pushed over /attendance/ws the instant a check-in/check-out is marked anywhere. */
export interface AttendanceLiveEvent {
  id: number
  employee: EmployeeSummary
  type: AttendanceType
  confidence_score: number | null
  timestamp: string
}
