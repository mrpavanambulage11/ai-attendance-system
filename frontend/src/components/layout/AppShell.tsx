import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  ScanFace,
  ClipboardList,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
} from 'lucide-react'
import { useAuthStore } from '@/lib/auth-store'
import { cn, initials } from '@/lib/utils'
import type { UserRole } from '@/types'

const NAV: { to: string; label: string; icon: typeof LayoutDashboard; end: boolean; roles: UserRole[] }[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true, roles: ['admin', 'teacher', 'person'] },
  { to: '/app/people', label: 'People', icon: Users, end: false, roles: ['admin', 'teacher'] },
  { to: '/app/attendance/live', label: 'Live Attendance', icon: ScanFace, end: false, roles: ['admin', 'teacher'] },
  { to: '/app/attendance/records', label: 'Records', icon: ClipboardList, end: false, roles: ['admin', 'teacher'] },
  { to: '/app/reports', label: 'Reports', icon: BarChart3, end: false, roles: ['admin', 'teacher'] },
  { to: '/app/settings', label: 'Settings', icon: SettingsIcon, end: false, roles: ['admin'] },
]

const ROLE_LABEL: Record<UserRole, string> = { admin: 'admin', teacher: 'teacher', person: 'portal account' }

export function AppShell() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold shadow-lg shadow-indigo-950">
            AI
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Attendance</p>
            <p className="text-xs text-slate-500">Smart Recognition</p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.filter((item) => item.roles.includes(user?.role ?? 'teacher')).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-indigo-600/15 text-indigo-300'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100',
                )
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-800 p-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold">
            {user ? initials(user.full_name) : ''}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{user?.full_name}</p>
            <p className="truncate text-[11px] capitalize text-slate-500">{user ? ROLE_LABEL[user.role] : ''}</p>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
