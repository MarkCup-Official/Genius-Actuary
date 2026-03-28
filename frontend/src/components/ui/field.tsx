import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

import { cn } from '@/lib/utils/cn'

const baseFieldClassName =
  'w-full rounded-[20px] border border-border-subtle bg-app-bg-elevated px-4 py-3 text-sm text-text-primary outline-none transition placeholder:text-text-muted focus:border-border-strong focus-gold'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return <input ref={ref} className={cn(baseFieldClassName, className)} {...props} />
  },
)

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...props }, ref) {
  return <textarea ref={ref} className={cn(baseFieldClassName, 'min-h-28 resize-y', className)} {...props} />
})

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return <select ref={ref} className={cn(baseFieldClassName, className)} {...props} />
  },
)
