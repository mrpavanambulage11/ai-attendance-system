import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'motion/react'
import { Users, ClipboardList, ScanFace, LogOut, Fingerprint } from 'lucide-react'
import { useAttendanceSocket } from '@/hooks/useAttendanceSocket'
import { useAuthStore } from '@/lib/auth-store'
import { useLiveStore } from '@/lib/live-store'
import { toast } from '@/lib/toast-store'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/admin', label: 'Employees', icon: Users, end: true },
  { to: '/admin/attendance', label: 'Attendance', icon: ClipboardList, end: false },
]

const LIVE_STATUS_STYLES = {
  connected: { dot: 'bg-emerald-400', label: 'Live', text: 'text-emerald-400' },
  connecting: { dot: 'bg-slate-500', label: 'Connecting...', text: 'text-slate-500' },
  disconnected: { dot: 'bg-amber-400', label: 'Reconnecting...', text: 'text-amber-400' },
}

export function AppShell() {
  const username = useAuthStore((s) => s.username)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()

  const liveStatus = useAttendanceSocket((event) => {
    queryClient.invalidateQueries({ queryKey: ['attendance'] })
    useLiveStore.getState().setLastEvent(event)
    toast.success(`👋 ${event.employee.name} just ${event.type === 'check_in' ? 'checked in' : 'checked out'}`)
  })
  const liveStyle = LIVE_STATUS_STYLES[liveStatus]

  function handleLogout() {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="flex w-64 shrink-0 flex-col border-r border-slate-800 bg-slate-900/40 p-4">
        <div className="mb-2 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-950">
            <Fingerprint className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">Nepa Technologies</p>
            <p className="text-xs text-slate-500">Biometric Attendance</p>
          </div>
        </div>

        <div className="mb-6 flex items-center gap-1.5 px-2">
          <span className="relative flex h-1.5 w-1.5">
            {liveStatus === 'connected' && (
              <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-75', liveStyle.dot)} />
            )}
            <span className={cn('relative inline-flex h-1.5 w-1.5 rounded-full', liveStyle.dot)} />
          </span>
          <span className={cn('text-[11px] font-medium', liveStyle.text)}>{liveStyle.label}</span>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="relative overflow-hidden rounded-lg">
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-pill"
                      className="absolute inset-0 bg-indigo-600/15"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                    />
                  )}
                  <span
                    className={cn(
                      'relative z-10 flex items-center gap-3 px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'text-indigo-300' : 'text-slate-400 hover:text-slate-100',
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          <NavLink
            to="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
          >
            <ScanFace className="h-4 w-4" />
            Kiosk view
          </NavLink>
        </nav>

        <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-800 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{username}</p>
            <p className="truncate text-[11px] text-slate-500">Admin</p>
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
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
