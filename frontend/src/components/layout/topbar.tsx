import { Languages, MoonStar, PanelLeftClose, PanelLeftOpen, SunMedium } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/field'
import { useAppStore } from '@/lib/store/app-store'

export function Topbar() {
  const { i18n } = useTranslation()
  const currentUser = useAppStore((state) => state.currentUser)
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const themeMode = useAppStore((state) => state.themeMode)
  const setThemeMode = useAppStore((state) => state.setThemeMode)
  const locale = useAppStore((state) => state.locale)
  const setLocale = useAppStore((state) => state.setLocale)

  return (
    <header className="panel-card mb-6 flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={toggleSidebar} className="hidden lg:inline-flex">
          {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
        </Button>
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold-primary">Analysis Workspace</p>
          <h2 className="text-lg font-semibold text-text-primary">Professional black-gold control surface</h2>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border border-border-subtle bg-app-bg-elevated px-3 py-2 text-sm text-text-secondary">
          <Languages className="size-4" />
          <Select
            value={locale}
            onChange={(event) => {
              const nextLocale = event.target.value as 'zh' | 'en'
              setLocale(nextLocale)
              void i18n.changeLanguage(nextLocale)
            }}
            className="border-0 bg-transparent px-0 py-0 text-sm shadow-none focus:shadow-none"
          >
            <option value="zh">中文</option>
            <option value="en">EN</option>
          </Select>
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() =>
            setThemeMode(themeMode === 'dark' ? 'light' : themeMode === 'light' ? 'system' : 'dark')
          }
        >
          {themeMode === 'dark' ? <MoonStar className="size-4" /> : <SunMedium className="size-4" />}
          <span>{themeMode}</span>
        </Button>
        {currentUser ? (
          <div className="flex items-center gap-3 rounded-full border border-border-subtle bg-app-bg-elevated px-4 py-2">
            <div className="size-9 rounded-full bg-[var(--gradient-gold)]" />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{currentUser.name}</p>
              <div className="flex items-center gap-2">
                <span className="truncate text-xs text-text-muted">{currentUser.title}</span>
                <Badge tone="gold" className="hidden sm:inline-flex">
                  {currentUser.roles.join(', ')}
                </Badge>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </header>
  )
}
