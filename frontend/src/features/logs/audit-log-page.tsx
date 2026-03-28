import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { formatDateTime } from '@/lib/utils/format'
import { useAppStore } from '@/lib/store/app-store'

export function AuditLogPage() {
  const { t } = useTranslation()
  const adapter = useApiAdapter()
  const locale = useAppStore((state) => state.locale)
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)

  const logsQuery = useQuery({
    queryKey: ['logs'],
    queryFn: () => adapter.logs.list({ page: 1, pageSize: 20 }),
  })

  const detailQuery = useQuery({
    queryKey: ['logs', selectedLogId],
    queryFn: () => adapter.logs.getById(selectedLogId!),
    enabled: Boolean(selectedLogId),
  })

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Audit" title={t('logs.title')} description={t('logs.subtitle')} />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Event stream</h2>
            <Badge tone="gold">{logsQuery.data?.total ?? 0} rows</Badge>
          </div>
          <div className="space-y-3">
            {logsQuery.data?.items.map((log) => (
              <button
                key={log.id}
                type="button"
                onClick={() => setSelectedLogId(log.id)}
                className="w-full rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4 text-left transition hover:border-border-strong"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-text-primary">{log.action}</p>
                    <p className="text-sm text-text-secondary">{log.summary}</p>
                  </div>
                  <Badge tone={log.status === 'success' ? 'success' : log.status === 'warning' ? 'warning' : 'danger'}>
                    {log.status}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-text-muted">
                  <span>{log.actor}</span>
                  <span>{log.target}</span>
                  <span>{formatDateTime(log.createdAt, locale)}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card className="space-y-4 p-6">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">Selected event</h2>
            <p className="mt-1 text-sm text-text-secondary">Tight detail ranges keep audit investigation readable.</p>
          </div>
          {detailQuery.data ? (
            <>
              <div className="space-y-1">
                <p className="text-2xl font-semibold text-text-primary">{detailQuery.data.action}</p>
                <p className="text-sm text-text-secondary">{detailQuery.data.summary}</p>
              </div>
              <div className="grid gap-3">
                <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Actor</p>
                  <p className="mt-2 text-sm text-text-primary">{detailQuery.data.actor}</p>
                </div>
                <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Target</p>
                  <p className="mt-2 text-sm text-text-primary">{detailQuery.data.target}</p>
                </div>
                <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Metadata</p>
                  <div className="mt-2 space-y-2 text-sm text-text-secondary">
                    {Object.entries(detailQuery.data.metadata).map(([key, value]) => (
                      <div key={key} className="flex justify-between gap-3">
                        <span>{key}</span>
                        <span className="mono">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-text-secondary">Select an audit event to inspect its metadata and trace hints.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
