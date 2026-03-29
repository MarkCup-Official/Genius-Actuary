import {
  Languages,
  MoonStar,
  PanelLeftClose,
  PanelLeftOpen,
  SunMedium,
} from 'lucide-react'
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
  const isZh = i18n.language.startsWith('zh')

  const themeLabel =
    themeMode === 'dark'
      ? t('common.dark')
      : themeMode === 'light'
        ? t('common.light')
        : t('common.system')

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
  const workspaceEyebrow = isZh ? '当前工作区' : 'Workspace'
  const workspaceTitle = isZh ? '个人决策分析' : 'Personal Decision Analysis'
  const workspaceDescription = isZh
    ? '围绕复杂选择发起分析、继续追问，并随时回看历史分析记录。'
    : 'Start new analyses, continue follow-ups, and revisit your analysis history at any time.'
  const workspaceBadge = isZh ? '当前浏览器已绑定' : 'Bound to this browser'

  return (
    <header className="panel-card mb-6 p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="mt-1 hidden lg:inline-flex"
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-4" />
            ) : (
              <PanelLeftOpen className="size-4" />
            )}
          </Button>

          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-gold-primary text-xs font-medium tracking-[0.22em] uppercase">
                {workspaceEyebrow}
              </p>
              <Badge
                tone="neutral"
                className="rounded-full px-3 py-1 text-[11px]"
              >
                {workspaceBadge}
              </Badge>
            </div>

            <h2 className="text-text-primary max-w-[34rem] text-2xl leading-tight font-semibold">
              {workspaceTitle}
            </h2>

            <p className="text-text-secondary max-w-[44rem] text-sm leading-6">
              {workspaceDescription}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-3 xl:max-w-[52rem]">
          <div className="border-border-subtle bg-app-bg-elevated text-text-secondary flex min-h-14 min-w-[188px] items-center gap-2 rounded-full border px-2 py-2 text-sm">
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
                    className={`interactive-lift min-w-[72px] flex-1 rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition ${
                      active
                        ? 'text-text-primary bg-[rgba(212,175,55,0.16)] shadow-[0_0_0_1px_rgba(249,228,159,0.12)]'
                        : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
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
              setThemeMode(
                themeMode === 'dark'
                  ? 'light'
                  : themeMode === 'light'
                    ? 'system'
                    : 'dark',
              )
            }
          >
            {themeMode === 'dark' ? (
              <MoonStar className="size-4" />
            ) : (
              <SunMedium className="size-4" />
            )}
            <span>{themeLabel}</span>
          </Button>

          {currentUser ? (
            <div className="border-border-subtle bg-app-bg-elevated flex min-h-14 min-w-[270px] items-center gap-3 rounded-full border px-4 py-3">
              <div
                className="size-11 shrink-0 rounded-full bg-cover bg-center bg-no-repeat"
                style={{
                  backgroundColor: 'var(--gold-primary)',
                  backgroundImage: 'var(--gradient-gold)',
                }}
              />
              <div className="min-w-0 flex-1">
                <p className="text-text-primary truncate text-sm font-medium">
                  {currentUser.name}
                </p>
                <p className="text-text-muted truncate text-xs">
                  {currentUser.title}
                </p>
              </div>
              {displayRoles?.length ? (
                <Badge tone="gold" className="shrink-0 whitespace-nowrap">
                  {displayRoles.join(' / ')}
                </Badge>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  )
}
