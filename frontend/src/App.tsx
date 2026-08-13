import { Routes, Route } from 'react-router-dom'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/toaster'
import { useAuthStore } from '@/lib/auth-store'
import { LandingPage } from '@/pages/LandingPage'
import { LoginPage } from '@/pages/LoginPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { MyDashboardPage } from '@/pages/MyDashboardPage'
import { PeoplePage } from '@/pages/PeoplePage'
import { EnrollPersonPage } from '@/pages/EnrollPersonPage'
import { LiveAttendancePage } from '@/pages/LiveAttendancePage'
import { RecordsPage } from '@/pages/RecordsPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'

/** Same `/app` index route, different content: a person portal account sees their own
 * attendance dashboard, staff (admin/teacher) see the org-wide dashboard. */
function HomeRoute() {
  const role = useAuthStore((s) => s.user?.role)
  return role === 'person' ? <MyDashboardPage /> : <DashboardPage />
}

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<HomeRoute />} />
            <Route element={<ProtectedRoute staffOnly />}>
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
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      <Toaster />
    </>
  )
}
