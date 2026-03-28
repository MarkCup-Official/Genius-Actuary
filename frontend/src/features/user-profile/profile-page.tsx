import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { type ColumnDef } from '@tanstack/table-core'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { DataTable } from '@/components/ui/data-table'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { exportToCsv } from '@/lib/export/csv'
import { formatDateTime } from '@/lib/utils/format'
import { useAppStore } from '@/lib/store/app-store'
import type { AnalysisSessionSummary } from '@/types'

export function ProfilePage() {
  const { i18n, t } = useTranslation()
  const adapter = useApiAdapter()
  const locale = useAppStore((state) => state.locale)
  const isZh = i18n.language.startsWith('zh')

  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: adapter.profile.get,
  })

  const profile = profileQuery.data

  const text = {
    eyebrow: isZh ? '账户' : 'Account',
    exportHistory: isZh ? '导出历史' : 'Export history',
    problem: isZh ? '问题' : 'Problem',
    mode: isZh ? '模式' : 'Mode',
    status: isZh ? '状态' : 'Status',
    updated: isZh ? '更新时间' : 'Updated',
    email: isZh ? '邮箱' : 'Email',
    timezone: isZh ? '时区' : 'Timezone',
    roles: isZh ? '角色' : 'Roles',
    lastActive: isZh ? '最近活跃' : 'Last active',
    preferencesTitle: isZh ? '偏好快照' : 'Preference snapshot',
    preferencesDescription:
      isZh
        ? '这里展示的是整个工作台当前正在使用的持久化偏好设置。'
        : 'Profile export reflects the same persisted settings used across the entire workspace shell.',
  }

  const preferenceLabel: Record<string, string> = {
    themeMode: isZh ? '主题模式' : 'Theme mode',
    language: isZh ? '语言' : 'Language',
    apiMode: isZh ? '接口模式' : 'API mode',
    displayDensity: isZh ? '信息密度' : 'Display density',
    notificationsEmail: isZh ? '邮件通知' : 'Email notifications',
    notificationsPush: isZh ? '推送通知' : 'Push notifications',
    autoExportPdf: isZh ? '自动导出 PDF' : 'Auto PDF export',
    chartMotion: isZh ? '图表动效' : 'Chart motion',
  }

  const historyColumns: ColumnDef<AnalysisSessionSummary>[] = [
    {
      header: text.problem,
      accessorKey: 'problemStatement',
    },
    {
      header: text.mode,
      accessorKey: 'mode',
    },
    {
      header: text.status,
      accessorKey: 'status',
    },
    {
      header: text.updated,
      accessorKey: 'updatedAt',
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={text.eyebrow}
        title={t('profile.title')}
        description={t('profile.subtitle')}
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              if (!profile) return
              void exportToCsv({
                title: 'profile-history',
                headers: [text.problem, text.mode, text.status, text.updated],
                rows: profile.history.map((item) => [item.problemStatement, item.mode, item.status, item.updatedAt]),
              })
            }}
          >
            <Download className="size-4" />
            {text.exportHistory}
          </Button>
        }
      />

      {profile ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
            <Card className="space-y-4 p-6">
              <div
                className="size-20 rounded-full bg-cover bg-center bg-no-repeat"
                style={{ backgroundColor: 'var(--gold-primary)', backgroundImage: 'var(--gradient-gold)' }}
              />
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">{profile.name}</h2>
                <p className="text-sm text-text-secondary">{profile.title}</p>
              </div>
              <p className="text-sm leading-6 text-text-secondary">{profile.bio}</p>
              <div className="grid gap-2 text-sm text-text-secondary">
                <p>
                  {text.email}: {profile.email}
                </p>
                <p>
                  {text.timezone}: {profile.timezone}
                </p>
                <p>
                  {text.roles}: {profile.roles.join(', ')}
                </p>
                <p>
                  {text.lastActive}: {formatDateTime(profile.lastActiveAt, locale)}
                </p>
              </div>
            </Card>

            <Card className="space-y-4 p-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">{text.preferencesTitle}</h2>
                <p className="mt-1 text-sm leading-7 text-text-secondary">{text.preferencesDescription}</p>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(profile.preferences).map(([key, value]) => (
                  <div key={key} className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-text-muted">
                      {preferenceLabel[key] ?? key}
                    </p>
                    <p className="mt-2 text-sm font-medium text-text-primary">{String(value)}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <DataTable
            data={profile.history.map((item) => ({
              ...item,
              updatedAt: formatDateTime(item.updatedAt, locale),
            }))}
            columns={historyColumns}
          />
        </>
      ) : null}
    </div>
  )
}
