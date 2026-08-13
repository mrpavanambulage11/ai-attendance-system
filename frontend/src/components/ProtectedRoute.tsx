import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth-store'

interface ProtectedRouteProps {
  /** Restricts to admin only (teachers and person accounts are redirected home). */
  adminOnly?: boolean
  /** Restricts to staff (admin/teacher) - a person portal account is redirected to their own dashboard. */
  staffOnly?: boolean
}

export function ProtectedRoute({ adminOnly = false, staffOnly = false }: ProtectedRouteProps) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  if (!token) return <Navigate to="/login" replace />
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/app" replace />
  if (staffOnly && user?.role === 'person') return <Navigate to="/app" replace />
  return <Outlet />
}
