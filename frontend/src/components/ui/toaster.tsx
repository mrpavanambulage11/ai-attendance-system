import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react'
import { useToastStore } from '@/lib/toast-store'
import { cn } from '@/lib/utils'

const ICONS = { success: CheckCircle2, error: AlertCircle, info: Info }
const STYLES = {
  success: 'border-emerald-500/30 bg-emerald-950/80 text-emerald-200',
  error: 'border-red-500/30 bg-red-950/80 text-red-200',
  info: 'border-indigo-500/30 bg-indigo-950/80 text-indigo-200',
}

export function Toaster() {
  const { toasts, dismiss } = useToastStore()

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.variant]
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur',
              STYLES[t.variant],
            )}
          >
            <Icon className="mt-0.5 h-4 w-4 shrink-0" />
            <p className="flex-1">{t.message}</p>
            <button onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
