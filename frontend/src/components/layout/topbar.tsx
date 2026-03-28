import { Languages, MoonStar, PanelLeftClose, PanelLeftOpen, SunMedium } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/lib/store/app-store'

export function Topbar() {
  const { i18n, t } = useTranslation()
  const currentUser = useAppStore((state) => state.currentUser)
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const themeMode = useAppStore((state) => state.themeMode)
  const setThemeMode = useAppStore((state) => state.setThemeMode)
  const locale = useAppStore((state) => state.locale)
  const setLocale = useAppStore((state) => state.setLocale)

  const themeLabel =
    themeMode === 'dark'
      ? t('common.dark')
      : themeMode === 'light'
        ? t('common.light')
        : t('common.system')

  const displayName = currentUser?.id === 'backend-anonymous' ? t('app.anonymousUser') : currentUser?.name
  const displayTitle =
    currentUser?.id === 'backend-anonymous' ? t('app.anonymousSession') : currentUser?.title
  const displayRoles = currentUser?.roles.map((role) => {
    if (role === 'analyst' || role === 'admin' || role === 'reviewer') {
      return t(`roles.${role}`)
    }

    return role
  })

  const languageOptions = [
    { value: 'zh' as const, label: '中文' },
    { value: 'en' as const, label: 'EN' },
  ]

  return (
    <header className="panel-card mb-6 grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
      <div className="flex min-w-0 items-start gap-3 pt-1">
        <Button variant="ghost" size="sm" onClick={toggleSidebar} className="mt-1 hidden lg:inline-flex">
          {sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
        </Button>
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold-primary">{t('app.workspaceEyebrow')}</p>
          <h2 className="max-w-[34rem] text-lg font-semibold leading-[1.35] text-text-primary">
            {t('app.workspaceTitle')}
          </h2>
        </div>
      </div>

      <div className="flex w-full flex-col items-end gap-3 xl:self-start">
        <div className="flex w-full flex-wrap items-start justify-end gap-3">
          <div className="flex min-h-14 min-w-[188px] items-center gap-2 rounded-full border border-border-subtle bg-app-bg-elevated px-2 py-2 text-sm text-text-secondary">
            <Languages className="ml-1 size-4 shrink-0" />
            <div className="flex flex-1 items-center gap-1">
              {languageOptions.map((option) => {
                const active = locale === option.value

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => {
                      setLocale(option.value)
                      void i18n.changeLanguage(option.value)
                    }}
                    className={`interactive-lift min-w-[72px] flex-1 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                      active
                        ? 'bg-[rgba(212,175,55,0.16)] text-text-primary shadow-[0_0_0_1px_rgba(249,228,159,0.12)]'
                        : 'text-text-secondary hover:bg-white/5 hover:text-text-primary'
                    }`}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="min-h-14 min-w-[160px] justify-center whitespace-nowrap"
            onClick={() =>
              setThemeMode(themeMode === 'dark' ? 'light' : themeMode === 'light' ? 'system' : 'dark')
            }
          >
            {themeMode === 'dark' ? <MoonStar className="size-4" /> : <SunMedium className="size-4" />}
            <span>{themeLabel}</span>
          </Button>
        </div>

        {currentUser ? (
          <div className="flex w-full items-center gap-3 rounded-full border border-border-subtle bg-app-bg-elevated px-4 py-3">
            <div
              className="size-11 shrink-0 rounded-full bg-cover bg-center bg-no-repeat"
              style={{ backgroundColor: 'var(--gold-primary)', backgroundImage: 'var(--gradient-gold)' }}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-text-primary">{displayName}</p>
              <p className="truncate text-xs text-text-muted">{displayTitle}</p>
            </div>
            {displayRoles?.length ? (
              <Badge tone="gold" className="shrink-0 whitespace-nowrap">
                {displayRoles.join(' / ')}
              </Badge>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  )
}
