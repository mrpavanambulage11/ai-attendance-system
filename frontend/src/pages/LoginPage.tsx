import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ScanFace, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input, Label } from '@/components/ui/input'
import { login, fetchMe, apiErrorMessage } from '@/lib/api'
import { useAuthStore } from '@/lib/auth-store'
import { toast } from '@/lib/toast-store'

export function LoginPage() {
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)
  const [email, setEmail] = useState('admin@attendance.io')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { access_token } = await login(email, password)
      useAuthStore.setState({ token: access_token })
      const user = await fetchMe()
      setSession(access_token, user)
      toast.success(`Welcome back, ${user.full_name.split(' ')[0]}`)
      navigate('/app')
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-950">
            <ScanFace className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-slate-50">Sign in</h1>
          <p className="mt-1 text-sm text-slate-500">AI-based attendance system</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
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
              placeholder="••••••••"
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </Button>
          <p className="text-center text-xs text-slate-500">
            Admin demo login: <code className="text-slate-400">admin@attendance.io</code> - password from
            your <code className="text-slate-400">.env</code>
            <br />
            Portal demo login: <code className="text-slate-400">emp001@portal.attendance.io</code> /{' '}
            <code className="text-slate-400">Demo@123</code>
          </p>
        </form>

        <p className="mt-6 text-center text-xs text-slate-600">
          <Link to="/" className="hover:text-slate-400">
            &larr; Back to home
          </Link>
        </p>
      </div>
    </div>
  )
}
