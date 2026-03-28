import type { ReactNode } from 'react'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description: string
  actions?: ReactNode
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        {eyebrow ? (
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-gold-primary">{eyebrow}</p>
        ) : null}
        <h1 className="text-3xl font-semibold tracking-[-0.04em] text-text-primary">{title}</h1>
        <p className="max-w-3xl text-sm text-text-secondary">{description}</p>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
    </div>
  )
}
