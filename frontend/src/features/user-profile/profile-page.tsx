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

const historyColumns: ColumnDef<AnalysisSessionSummary>[] = [
  {
    header: 'Problem',
    accessorKey: 'problemStatement',
  },
  {
    header: 'Mode',
    accessorKey: 'mode',
  },
  {
    header: 'Status',
    accessorKey: 'status',
  },
  {
    header: 'Updated',
    accessorKey: 'updatedAt',
  },
]

export function ProfilePage() {
  const { t } = useTranslation()
  const adapter = useApiAdapter()
  const locale = useAppStore((state) => state.locale)
  const profileQuery = useQuery({
    queryKey: ['profile'],
    queryFn: adapter.profile.get,
  })

  const profile = profileQuery.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Account"
        title={t('profile.title')}
        description={t('profile.subtitle')}
        actions={
          <Button
            variant="secondary"
            onClick={() => {
              if (!profile) return
              exportToCsv({
                title: 'profile-history',
                headers: ['Problem', 'Mode', 'Status', 'Updated'],
                rows: profile.history.map((item) => [item.problemStatement, item.mode, item.status, item.updatedAt]),
              })
            }}
          >
            <Download className="size-4" />
            Export history
          </Button>
        }
      />

      {profile ? (
        <>
          <div className="grid gap-4 xl:grid-cols-[0.7fr_1.3fr]">
            <Card className="space-y-4 p-6">
              <div className="size-20 rounded-full bg-[var(--gradient-gold)]" />
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">{profile.name}</h2>
                <p className="text-sm text-text-secondary">{profile.title}</p>
              </div>
              <p className="text-sm leading-6 text-text-secondary">{profile.bio}</p>
              <div className="grid gap-2 text-sm text-text-secondary">
                <p>Email: {profile.email}</p>
                <p>Timezone: {profile.timezone}</p>
                <p>Roles: {profile.roles.join(', ')}</p>
                <p>Last active: {formatDateTime(profile.lastActiveAt, locale)}</p>
              </div>
            </Card>

            <Card className="space-y-4 p-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Preference snapshot</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Profile export reflects the same persisted settings used across the entire workspace shell.
                </p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {Object.entries(profile.preferences).map(([key, value]) => (
                  <div key={key} className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{key}</p>
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
