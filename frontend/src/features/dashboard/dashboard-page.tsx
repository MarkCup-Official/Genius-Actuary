import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Bell, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ChartCard } from '@/components/charts/chart-card'
import { Skeleton } from '@/components/feedback/skeleton'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { formatDateTime } from '@/lib/utils/format'
import { useAppStore } from '@/lib/store/app-store'

export function DashboardPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const adapter = useApiAdapter()
  const locale = useAppStore((state) => state.locale)

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: adapter.dashboard.getOverview,
  })

  const dashboard = dashboardQuery.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title={t('dashboard.title')}
        description={t('dashboard.subtitle')}
        actions={
          <>
            <Button variant="secondary" onClick={() => void navigate('/notifications')}>
              <Bell className="size-4" />
              {t('nav.notifications')}
            </Button>
            <Button onClick={() => void navigate('/analysis/modes')}>
              <Sparkles className="size-4" />
              {t('nav.analyze')}
            </Button>
          </>
        }
      />

      {dashboardQuery.isLoading || !dashboard ? (
        <div className="grid gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-32 rounded-[24px]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-4">
          {dashboard.metrics.map((metric) => (
            <Card key={metric.id} className="p-5">
              <p className="text-sm text-text-secondary">{metric.label}</p>
              <p className="metric-value mt-3 text-3xl font-semibold text-text-primary">{metric.value}</p>
              <div className="mt-4 flex items-center justify-between">
                <Badge tone="gold">{metric.change}</Badge>
                <p className="text-xs text-text-muted">{metric.detail}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="space-y-4">
          {dashboard?.charts.map((chart) => <ChartCard key={chart.id} chart={chart} />)}
        </div>
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-text-primary">Recent analyses</h2>
              <Button variant="ghost" size="sm" onClick={() => void navigate('/resources/analyses')}>
                {t('common.viewAll')}
                <ArrowRight className="size-4" />
              </Button>
            </div>
            <div className="space-y-3">
              {dashboard?.recentSessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() =>
                    void navigate(
                      session.status === 'COMPLETED'
                        ? `/analysis/session/${session.id}/report`
                        : `/analysis/session/${session.id}/clarify`,
                    )
                  }
                  className="w-full rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4 text-left transition hover:border-border-strong"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="font-medium text-text-primary">{session.problemStatement}</p>
                      <p className="text-xs text-text-muted">{session.lastInsight}</p>
                    </div>
                    <Badge tone={session.status === 'COMPLETED' ? 'success' : 'warning'}>
                      {session.status}
                    </Badge>
                  </div>
                  <p className="mt-4 text-xs text-text-muted">{formatDateTime(session.updatedAt, locale)}</p>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">Activity pulse</h2>
            <div className="space-y-4">
              {dashboard?.activity.map((item) => (
                <div key={item.id} className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-text-primary">{item.title}</p>
                    <Badge tone={item.tone === 'positive' ? 'success' : item.tone === 'warning' ? 'warning' : 'neutral'}>
                      {item.tone}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-text-secondary">{item.detail}</p>
                  <p className="mt-3 text-xs text-text-muted">{formatDateTime(item.createdAt, locale)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
