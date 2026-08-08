import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/toaster'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { PeoplePage } from '@/pages/PeoplePage'
import { EnrollPersonPage } from '@/pages/EnrollPersonPage'
import { LiveAttendancePage } from '@/pages/LiveAttendancePage'
import { RecordsPage } from '@/pages/RecordsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<DashboardPage />} />
            <Route path="people" element={<PeoplePage />} />
            <Route path="people/:id/enroll" element={<EnrollPersonPage />} />
            <Route path="attendance/live" element={<LiveAttendancePage />} />
            <Route path="attendance/records" element={<RecordsPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route element={<ProtectedRoute adminOnly />}>
              <Route path="settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster />
    </>
  )
}
