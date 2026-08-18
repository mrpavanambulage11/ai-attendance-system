import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { motion, type HTMLMotionProps } from 'motion/react'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default: 'bg-indigo-600 text-white shadow-sm shadow-indigo-900/30 hover:bg-indigo-500',
        secondary: 'bg-slate-800 text-slate-100 hover:bg-slate-700 border border-slate-700',
        outline: 'border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800',
        ghost: 'text-slate-300 hover:bg-slate-800 hover:text-white',
        destructive: 'bg-red-600 text-white hover:bg-red-500',
        link: 'text-indigo-400 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 rounded-md px-3 text-xs',
        lg: 'h-12 rounded-lg px-6 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

export interface ButtonProps extends HTMLMotionProps<'button'>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, disabled, ...props }, ref) => (
    <motion.button
      ref={ref}
      disabled={disabled}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={{ duration: 0.12 }}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
