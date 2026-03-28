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
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { sessionId = '' } = useParams()
  const adapter = useApiAdapter()

  const progressQuery = useQuery({
    queryKey: ['analysis', sessionId, 'progress'],
    queryFn: () => adapter.analysis.getProgress(sessionId),
    refetchInterval: (query) => (query.state.data?.status === 'COMPLETED' ? false : 1400),
  })

  const progress = progressQuery.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pipeline"
        title={t('analysis.progressTitle')}
        description="A high-value action should feel deliberate and calm. The loader here intentionally avoids generic spinners."
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
              ? 'The report core has converged. You can open the final reading flow now.'
              : progress?.currentStepLabel ?? 'Preparing structured analysis'
          }
        />

        <Card className="space-y-4 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-text-primary">Stage progression</h2>
            <Badge tone={progress?.status === 'COMPLETED' ? 'success' : 'gold'}>
              {progress?.overallProgress ?? 0}%
            </Badge>
          </div>
          <div className="space-y-3">
            {progress?.stages.map((stage) => (
              <div key={stage.id} className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-text-primary">{stage.title}</p>
                    <p className="mt-1 text-sm text-text-secondary">{stage.description}</p>
                  </div>
                  {stage.status === 'completed' ? (
                    <CheckCircle2 className="size-5 text-[#ccebd7]" />
                  ) : (
                    <Hourglass className="size-5 text-gold-primary" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
