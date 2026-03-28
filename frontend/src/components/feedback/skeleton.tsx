import { cn } from '@/lib/utils/cn'

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-2xl bg-[linear-gradient(90deg,rgba(255,255,255,0.03),rgba(249,228,159,0.08),rgba(255,255,255,0.03))] bg-[length:200%_100%]',
        className,
      )}
    />
  )
}
