import {
  Bell,
  ChartColumnIncreasing,
  ClipboardPenLine,
  FileStack,
  LayoutDashboard,
  Settings,
  UserRound,
  Workflow,
} from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils/cn'

const navItems = [
  { to: '/dashboard', key: 'dashboard', icon: LayoutDashboard },
  { to: '/analysis/modes', key: 'analyze', icon: ClipboardPenLine },
  { to: '/notifications', key: 'notifications', icon: Bell },
  { to: '/files', key: 'files', icon: FileStack },
  { to: '/dataviz', key: 'dataviz', icon: ChartColumnIncreasing },
  { to: '/resources/analyses', key: 'resources', icon: Workflow },
  { to: '/settings', key: 'settings', icon: Settings },
  { to: '/profile', key: 'profile', icon: UserRound },
] as const

interface SidebarProps {
  collapsed: boolean
  unreadCount: number
}

export function Sidebar({ collapsed, unreadCount }: SidebarProps) {
  const { t } = useTranslation()

  return (
    <aside
      className={cn(
        'panel-card hidden h-[calc(100vh-2rem)] flex-col justify-between overflow-hidden p-4 lg:flex',
        collapsed ? 'w-[92px]' : 'w-[286px]',
      )}
    >
      <div className="space-y-6">
        <div className="gold-hairline space-y-2 px-3 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-primary">Genius Actuary</p>
          {!collapsed ? (
            <p className="text-sm leading-6 text-text-secondary">
              {t('app.tagline')}
            </p>
          ) : null}
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-sm text-text-secondary transition',
                    isActive
                      ? 'border-border-strong bg-[rgba(212,175,55,0.12)] text-text-primary'
                      : 'hover:border-border-subtle hover:bg-app-bg-elevated hover:text-text-primary',
                  )
                }
              >
                <Icon className="size-5 shrink-0" />
                {!collapsed ? (
                  <>
                    <span className="truncate">{t(`nav.${item.key}`)}</span>
                    {item.key === 'notifications' && unreadCount > 0 ? (
                      <Badge tone="gold" className="ml-auto">
                        {unreadCount}
                      </Badge>
                    ) : null}
                  </>
                ) : null}
              </NavLink>
            )
          })}
        </nav>
      </div>

      {!collapsed ? (
        <div className="rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4">
          <p className="text-sm font-semibold text-text-primary">{t('app.adapterFooterTitle')}</p>
          <p className="mt-2 text-xs leading-5 text-text-secondary">
            {t('app.adapterFooterDetail')}
          </p>
        </div>
      ) : null}
    </aside>
  )
}
