import { Link } from 'react-router-dom'
import { ScanFace, ShieldCheck, BarChart3, Users, ArrowRight, ExternalLink } from 'lucide-react'

const FEATURES = [
  {
    icon: ScanFace,
    title: 'Face-recognition check-in',
    description:
      'Webcam-based recognition matches faces against enrolled embeddings in real time and marks attendance automatically.',
  },
  {
    icon: ShieldCheck,
    title: 'Liveness detection',
    description:
      'A blink-based liveness check runs across a short frame burst so a printed photo or phone screen cannot spoof a check-in.',
  },
  {
    icon: BarChart3,
    title: 'Analytics dashboard',
    description:
      'Attendance trends, department breakdowns, and per-person attendance rates - updated live as check-ins happen.',
  },
  {
    icon: Users,
    title: 'Role-based access',
    description: 'Admins manage people and settings; teachers get a focused, read-and-mark view. JWT-secured throughout.',
  },
]

export function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 text-sm font-bold shadow-lg shadow-indigo-950">
            AI
          </div>
          <span className="text-sm font-semibold tracking-tight">AI Attendance</span>
        </div>
        <nav className="flex items-center gap-3">
          <a
            href="#features"
            className="hidden items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 sm:flex"
          >
            <ExternalLink className="h-4 w-4" /> How it works
          </a>
          <Link
            to="/login"
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-900/40 transition-colors hover:bg-indigo-500"
          >
            Sign in
          </Link>
        </nav>
      </header>

      <main className="relative z-10">
        <section className="mx-auto max-w-4xl px-6 pb-20 pt-16 text-center sm:pt-24">
          <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-slate-800 bg-slate-900/60 px-3 py-1 text-xs font-medium text-slate-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Face recognition &middot; Liveness detection &middot; Real-time analytics
          </div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-50 sm:text-6xl">
            Attendance that <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">recognizes people</span>,
            not badge swipes.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-slate-400">
            A webcam is all it takes. Faces are matched against on-device embeddings, a live blink
            check stops photo spoofing, and every check-in lands straight on an analytics dashboard.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/login"
              className="group inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition-colors hover:bg-indigo-500"
            >
              Try the live demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#features"
              className="rounded-lg border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors hover:bg-slate-800"
            >
              See how it works
            </a>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-6 pb-24">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 transition-colors hover:border-slate-700"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-300">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-100">{feature.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-4xl px-6 pb-24">
          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/40 p-8 text-center sm:p-12">
            <h2 className="text-2xl font-semibold text-slate-50">How a check-in works</h2>
            <div className="mt-8 grid grid-cols-1 gap-6 text-left sm:grid-cols-3">
              {[
                { step: '1', title: 'Enroll once', text: 'Capture a few reference shots for each person; embeddings are stored, not raw photos.' },
                { step: '2', title: 'Scan at the kiosk', text: 'The webcam captures a short burst of frames when someone steps up to check in.' },
                { step: '3', title: 'Match + verify liveness', text: 'The best embedding match is found and a blink must be detected before it counts.' },
              ].map((item) => (
                <div key={item.step}>
                  <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/15 text-sm font-semibold text-indigo-300">
                    {item.step}
                  </div>
                  <h3 className="text-sm font-semibold text-slate-100">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-400">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-slate-900 py-8 text-center text-xs text-slate-600">
        Built with FastAPI, DeepFace, MediaPipe, and React.
      </footer>
    </div>
  )
}
