import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  Languages,
  MoonStar,
  PanelLeftClose,
  PanelLeftOpen,
  SunMedium,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { BackendBootstrapResponse } from '@/lib/api/adapters/genius-backend'
import { apiClient } from '@/lib/api/client'
import { endpoints } from '@/lib/api/endpoints'
import { resolveRuntimeApiMode } from '@/lib/api/runtime-mode'
import { useAppStore } from '@/lib/store/app-store'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

function resolveBackendAnalysisAdapter(notes: string[]) {
  const adapterNote = notes.find((note) => note.startsWith('Adapters:'))
  if (!adapterNote) {
    return ''
  }

  const match = adapterNote.match(/analysis=([^,]+)/i)
  return match?.[1]?.trim().toLowerCase() ?? ''
}

export function Topbar() {
  const { i18n, t } = useTranslation()
  const currentUser = useAppStore((state) => state.currentUser)
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const toggleSidebar = useAppStore((state) => state.toggleSidebar)
  const themeMode = useAppStore((state) => state.themeMode)
  const setThemeMode = useAppStore((state) => state.setThemeMode)
  const locale = useAppStore((state) => state.locale)
  const setLocale = useAppStore((state) => state.setLocale)
  const apiMode = useAppStore((state) => state.apiMode)
  const isZh = i18n.language.startsWith('zh')
  const runtimeApiMode = resolveRuntimeApiMode(apiMode)

  const bootstrapQuery = useQuery({
    queryKey: ['backend', 'bootstrap', 'runtime-indicator'],
    queryFn: () =>
      apiClient.request<BackendBootstrapResponse>(endpoints.backend.bootstrap),
    enabled: runtimeApiMode === 'rest',
    staleTime: 60_000,
    retry: false,
  })

  const backendAnalysisAdapter = resolveBackendAnalysisAdapter(
    bootstrapQuery.data?.notes ?? [],
  )
  const shouldShowMockHint =
    runtimeApiMode === 'mock' || backendAnalysisAdapter.startsWith('mock')
  const mockHint =
    runtimeApiMode === 'mock'
      ? isZh
        ? '\u5f53\u524d\u524d\u7aef\u6b63\u5728\u4f7f\u7528 Mock \u9002\u914d\u5668\uff0c\u9875\u9762\u5185\u5bb9\u4e0d\u662f\u5b9e\u65f6\u540e\u7aef LLM \u7ed3\u679c\u3002'
        : 'The frontend is currently using the mock adapter instead of the live backend LLM.'
      : isZh
        ? '\u5f53\u524d\u540e\u7aef\u5206\u6790\u9002\u914d\u5668\u4e3a Mock\uff0c\u9875\u9762\u5185\u5bb9\u4e0d\u4f1a\u8d70\u771f\u5b9e LLM\u3002'
        : 'The backend analysis adapter is currently mock, so this is not a live LLM run.'

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
    { value: 'zh' as const, label: '\u4e2d\u6587' },
    { value: 'en' as const, label: 'EN' },
  ]
  const workspaceEyebrow = isZh ? '\u5206\u6790\u5de5\u4f5c\u53f0' : 'Workspace'
  const workspaceTitle =
    isZh ? '\u4e2a\u4eba\u51b3\u7b56\u5206\u6790' : 'Personal Decision Analysis'
  const workspaceDescription = isZh
    ? '\u53d1\u8d77\u65b0\u7684\u5206\u6790\u3001\u7ee7\u7eed\u56de\u7b54\u8ffd\u95ee\uff0c\u5e76\u968f\u65f6\u56de\u770b\u5386\u53f2\u5206\u6790\u8bb0\u5f55\u3002'
    : 'Start new analyses, continue follow-ups, and revisit your analysis history at any time.'
  const workspaceBadge =
    isZh ? '\u5f53\u524d\u6d4f\u89c8\u5668\u5df2\u7ed1\u5b9a' : 'Bound to this browser'

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

            {shouldShowMockHint ? (
              <div className="border-border-strong mt-1 flex max-w-[48rem] items-start gap-3 rounded-[18px] border bg-[rgba(212,175,55,0.08)] px-4 py-3 text-sm leading-6 text-text-secondary">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-gold-primary" />
                <span>{mockHint}</span>
              </div>
            ) : null}
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
