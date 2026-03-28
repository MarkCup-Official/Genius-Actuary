import { forwardRef, type ButtonHTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-cover bg-center bg-no-repeat text-[#151316] shadow-[0_14px_40px_rgba(212,175,55,0.28)] hover:brightness-105 hover:shadow-[0_18px_46px_rgba(212,175,55,0.34)]',
  secondary:
    'border border-border-subtle bg-app-bg-elevated text-text-primary hover:border-border-strong hover:bg-panel-strong',
  ghost: 'text-text-secondary hover:bg-white/5 hover:text-text-primary',
  danger:
    'border border-[rgba(197,109,99,0.45)] bg-[rgba(197,109,99,0.14)] text-[#f7d4cf] hover:bg-[rgba(197,109,99,0.2)]',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-full px-4 text-sm',
  md: 'h-11 rounded-full px-5 text-sm',
  lg: 'h-12 rounded-full px-6 text-base',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, size = 'md', style, variant = 'primary', ...props },
  ref,
) {
  const mergedStyle =
    variant === 'primary'
      ? {
          backgroundColor: 'var(--gold-primary)',
          backgroundImage: 'var(--gradient-gold)',
          ...style,
        }
      : style

  return (
    <button
      ref={ref}
      style={mergedStyle}
      className={cn(
        'interactive-lift inline-flex items-center justify-center gap-2 font-medium transition duration-200 disabled:pointer-events-none disabled:opacity-60 disabled:brightness-75',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
})
