import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/toaster'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { MarkAttendancePage } from '@/pages/MarkAttendancePage'
import { EmployeesPage } from '@/pages/EmployeesPage'
import { EnrollFacePage } from '@/pages/EnrollFacePage'
import { AttendanceRecordsPage } from '@/pages/AttendanceRecordsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<MarkAttendancePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AppShell />}>
            <Route index element={<EmployeesPage />} />
            <Route path="employees/:id/enroll" element={<EnrollFacePage />} />
            <Route path="attendance" element={<AttendanceRecordsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster />
    </>
  )
}
