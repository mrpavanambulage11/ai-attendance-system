import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/lib/auth-store'

export function ProtectedRoute({ adminOnly = false }: { adminOnly?: boolean }) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  if (!token) return <Navigate to="/login" replace />
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/app" replace />
  return <Outlet />
}
