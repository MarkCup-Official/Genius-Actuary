import type { HTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

const toneClasses = {
  neutral: 'bg-white/5 text-text-secondary',
  gold: 'bg-[rgba(212,175,55,0.15)] text-gold-bright',
  success: 'bg-[rgba(132,184,154,0.18)] text-[#ccebd7]',
  warning: 'bg-[rgba(210,165,99,0.18)] text-[#f3ddbb]',
  danger: 'bg-[rgba(197,109,99,0.18)] text-[#f7d4cf]',
} as const

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: keyof typeof toneClasses
}

export function Badge({ className, tone = 'neutral', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium tracking-[0.02em]',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
