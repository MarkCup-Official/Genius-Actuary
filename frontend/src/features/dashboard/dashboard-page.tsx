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
import type { ActivityItem, ChartArtifact, DashboardMetric } from '@/types'

const metricKeyById: Record<string, string> = {
  'm-1': 'activeSessions',
  'm-2': 'reportsExported',
  'm-3': 'unreadAlerts',
  'm-4': 'confidenceTrend',
  'backend-live-sessions': 'trackedSessions',
  'backend-completed': 'completedLoops',
  'backend-clarifying': 'needInput',
}

const activityKeyById: Record<string, string> = {
  'a-1': 'exchangeComplete',
  'a-2': 'clarifyWaiting',
  'a-3': 'fileIndexed',
  'backend-sync': 'backendSync',
}

export function DashboardPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const adapter = useApiAdapter()
  const locale = useAppStore((state) => state.locale)
  const isZh = i18n.language.startsWith('zh')

  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: adapter.dashboard.getOverview,
  })

  const dashboard = dashboardQuery.data

  const localizeMetric = (metric: DashboardMetric) => {
    const key = metricKeyById[metric.id]
    if (!key) {
      return metric
    }

    const useTranslatedChange = ['activeSessions', 'reportsExported', 'unreadAlerts', 'confidenceTrend'].includes(key)

    return {
      ...metric,
      label: t(`dashboard.metrics.${key}.label`),
      detail: t(`dashboard.metrics.${key}.detail`),
      change: useTranslatedChange ? t(`dashboard.metrics.${key}.change`) : metric.change,
    }
  }

  const localizeActivity = (item: ActivityItem) => {
    const key = activityKeyById[item.id]
    if (!key) {
      return item
    }

    return {
      ...item,
      title: t(`dashboard.activity.${key}.title`),
      detail: t(`dashboard.activity.${key}.detail`),
    }
  }

  const localizeChart = (chart: ChartArtifact): ChartArtifact => {
    if (chart.id === 'dashboard-trend') {
      return {
        ...chart,
        title: t('dashboard.charts.confidenceTrendTitle'),
        note: t('dashboard.charts.confidenceTrendNote'),
        unit: isZh ? '分数 / 100' : 'score / 100',
      }
    }

    if (chart.id === 'dashboard-distribution') {
      return {
        ...chart,
        title: t('dashboard.charts.workflowMixTitle'),
        unit: isZh ? '数量' : 'count',
      }
    }

    return chart
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('dashboard.eyebrow')}
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
          {dashboard.metrics.map((metric) => {
            const localizedMetric = localizeMetric(metric)

            return (
              <Card key={metric.id} className="p-5">
                <p className="text-sm text-text-secondary">{localizedMetric.label}</p>
                <p className="metric-value mt-3 text-3xl font-semibold text-text-primary">{localizedMetric.value}</p>
                <div className="mt-4 flex items-center justify-between gap-3">
                  <Badge tone="gold">{localizedMetric.change}</Badge>
                  <p className="max-w-[12rem] text-right text-xs leading-5 text-text-muted">{localizedMetric.detail}</p>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="space-y-4">
          {dashboard?.charts.map((chart) => <ChartCard key={chart.id} chart={localizeChart(chart)} />)}
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-text-primary">{t('dashboard.recentAnalyses')}</h2>
              <Button variant="ghost" size="sm" onClick={() => void navigate('/resources/analyses')}>
                {t('common.viewAll')}
                <ArrowRight className="size-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {dashboard?.recentSessions.map((session) => {
                const isCompleted = session.status === 'COMPLETED'
                const sessionModeLabel = session.mode === 'single-option' ? t('analysis.singleMode') : t('analysis.multiMode')
                const actionLabel = isCompleted ? t('dashboard.openReport') : t('dashboard.continueAnalysis')

                return (
                  <button
                    key={session.id}
                    type="button"
                    onClick={() =>
                      void navigate(
                        isCompleted ? `/analysis/session/${session.id}/report` : `/analysis/session/${session.id}/clarify`,
                      )
                    }
                    className="w-full rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4 text-left transition hover:border-border-strong hover:bg-panel-strong"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <p className="font-medium leading-7 text-text-primary">{session.problemStatement}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge tone="neutral">{sessionModeLabel}</Badge>
                          <Badge tone={isCompleted ? 'success' : 'warning'}>{t(`common.status.${session.status}`)}</Badge>
                        </div>
                        <p className="text-xs leading-5 text-text-muted">{session.lastInsight}</p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <p className="text-xs text-text-muted">{formatDateTime(session.updatedAt, locale)}</p>
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-gold-ink">
                        {actionLabel}
                        <ArrowRight className="size-4" />
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">{t('dashboard.activityPulse')}</h2>
            <div className="space-y-4">
              {dashboard?.activity.map((item) => {
                const localizedItem = localizeActivity(item)

                return (
                  <div key={item.id} className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-text-primary">{localizedItem.title}</p>
                      <Badge tone={item.tone === 'positive' ? 'success' : item.tone === 'warning' ? 'warning' : 'neutral'}>
                        {t(`common.tone.${item.tone}`)}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-text-secondary">{localizedItem.detail}</p>
                    <p className="mt-3 text-xs text-text-muted">{formatDateTime(localizedItem.createdAt, locale)}</p>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
