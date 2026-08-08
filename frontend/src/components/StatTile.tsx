import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StatTileProps {
  label: string
  value: string | number
  icon: LucideIcon
  accent?: 'default' | 'good' | 'warning' | 'critical'
}

const ACCENTS = {
  default: 'bg-indigo-500/10 text-indigo-300',
  good: 'bg-[#0ca30c]/10 text-[#3fd23f]',
  warning: 'bg-[#fab219]/10 text-[#fab219]',
  critical: 'bg-[#d03b3b]/10 text-[#f0716f]',
}

export function StatTile({ label, value, icon: Icon, accent = 'default' }: StatTileProps) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{label}</p>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', ACCENTS[accent])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 text-3xl font-semibold text-slate-50">{value}</p>
    </div>
  )
}
