import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Hourglass } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { GoldenSandLoader } from '@/components/feedback/golden-sand-loader'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'

export function ProgressPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const { sessionId = '' } = useParams()
  const adapter = useApiAdapter()
  const isZh = i18n.language.startsWith('zh')

  const progressQuery = useQuery({
    queryKey: ['analysis', sessionId, 'progress'],
    queryFn: () => adapter.analysis.getProgress(sessionId),
    refetchInterval: (query) => (query.state.data?.status === 'COMPLETED' ? false : 1400),
  })

  const progress = progressQuery.data

  const stageText = {
    clarify: {
      title: isZh ? '梳理决策上下文' : 'Clarify decision context',
      description: isZh ? '补齐目标、约束与缺失的关键事实。' : 'Collect goals, constraints, and missing high-value facts.',
    },
    plan: {
      title: isZh ? '规划分析轮次' : 'Plan analysis round',
      description: isZh ? '后端正在准备搜索任务和第一版结论框架。' : 'Prepare search tasks and first-pass conclusions on the backend.',
    },
    evidence: {
      title: isZh ? '汇聚证据与图表' : 'Gather evidence',
      description: isZh ? '执行搜索、汇总证据，并生成预览图表。' : 'Execute search, gather evidence, and compose preview artifacts.',
    },
    report: {
      title: isZh ? '组装最终报告' : 'Assemble report',
      description: isZh ? '整合摘要、建议、依据与图表引用。' : 'Build the final report summary, recommendations, and chart references.',
    },
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('common.nextStep')}
        title={t('analysis.progressTitle')}
        description={t('analysis.progressSubtitle')}
        actions={
          progress?.status === 'COMPLETED' ? (
            <Button onClick={() => void navigate(`/analysis/session/${sessionId}/report`)}>
              {t('analysis.generateReport')}
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1fr_0.95fr]">
        <GoldenSandLoader
          label={
            progress?.status === 'COMPLETED'
              ? t('analysis.progressReadyHint')
              : progress?.currentStepLabel ?? (isZh ? '正在整理结构化分析结果' : 'Preparing structured analysis')
          }
        />

        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">{t('analysis.progressStageTitle')}</h2>
            <Badge tone={progress?.status === 'COMPLETED' ? 'success' : 'gold'}>
              {progress?.overallProgress ?? 0}%
            </Badge>
          </div>

          <div className="space-y-3">
            {progress?.stages.map((stage) => {
              const localizedStage = stageText[stage.id as keyof typeof stageText]

              return (
                <div key={stage.id} className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-text-primary">{localizedStage?.title ?? stage.title}</p>
                      <p className="mt-1 text-sm text-text-secondary">
                        {localizedStage?.description ?? stage.description}
                      </p>
                    </div>
                    {stage.status === 'completed' ? (
                      <CheckCircle2 className="size-5 text-[#ccebd7]" />
                    ) : (
                      <Hourglass className="size-5 text-gold-primary" />
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
