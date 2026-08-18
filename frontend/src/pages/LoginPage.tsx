import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ScanFace, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { login, apiErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from '@/lib/toast-store'

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { access_token } = await login(username, password)
      setSession(access_token, username)
      toast.success(`Welcome back, ${username}`)
      navigate('/admin')
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-indigo-600/10 blur-3xl"
        aria-hidden
      />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="relative w-full max-w-sm"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1, ease: [0.34, 1.56, 0.64, 1] }}
            className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-950"
          >
            <ScanFace className="h-5 w-5 text-white" />
          </motion.div>
          <h1 className="text-xl font-semibold text-slate-50">Admin sign in</h1>
          <p className="mt-1 text-sm text-slate-500">AI Based Face authorization Attendance system</p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6 shadow-xl shadow-black/20"
        >
          <div>
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          <Link to="/" className="hover:text-slate-400">
            &larr; Back to kiosk
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
