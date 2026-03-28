import { useQuery } from '@tanstack/react-query'
import { ChevronRight, GitCompare, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'

export function ModeSelectionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const adapter = useApiAdapter()

  const modesQuery = useQuery({
    queryKey: ['analysis', 'modes'],
    queryFn: adapter.modes.list,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analysis"
        title={t('analysis.modeTitle')}
        description={t('analysis.modeSubtitle')}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        {modesQuery.data?.map((mode) => (
          <Card key={mode.id} className="group relative overflow-hidden p-6">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.15),transparent_38%)] opacity-0 transition group-hover:opacity-100" />
            <div className="relative space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="inline-flex rounded-full border border-border-subtle bg-app-bg-elevated p-3 text-gold-primary">
                    {mode.id === 'single-option' ? <Sparkles className="size-5" /> : <GitCompare className="size-5" />}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-text-primary">
                      {mode.id === 'single-option' ? t('analysis.singleMode') : t('analysis.multiMode')}
                    </h2>
                    <p className="mt-2 text-sm text-text-secondary">{mode.description}</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                {mode.valueLens.map((item) => (
                  <div key={item} className="rounded-[18px] border border-border-subtle bg-app-bg-elevated px-4 py-3 text-sm text-text-secondary">
                    {item}
                  </div>
                ))}
              </div>

              <Button onClick={() => void navigate(`/analysis/intake?mode=${mode.id}`)}>
                Continue
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
