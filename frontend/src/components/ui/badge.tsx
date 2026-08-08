import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      default: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
      success: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
      warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
      danger: 'bg-red-500/15 text-red-300 border border-red-500/30',
      neutral: 'bg-slate-700/40 text-slate-300 border border-slate-600/50',
    },
  },
  defaultVariants: { variant: 'default' },
})

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, className }))} {...props} />
}
