import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { ChartCard } from '@/components/charts/chart-card'
import { PageHeader } from '@/components/layout/page-header'
import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'

export function DataVizPage() {
  const { t } = useTranslation()
  const adapter = useApiAdapter()

  const bundleQuery = useQuery({
    queryKey: ['dataviz'],
    queryFn: adapter.dataviz.getBundle,
  })

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Dataviz" title={t('dataviz.title')} description={t('dataviz.subtitle')} />
      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          {bundleQuery.data?.charts.map((chart) => <ChartCard key={chart.id} chart={chart} />)}
        </div>
        <Card className="space-y-4 p-6">
          <h2 className="text-lg font-semibold text-text-primary">Visualization rules in practice</h2>
          <div className="space-y-3 text-sm text-text-secondary">
            {bundleQuery.data?.notes.map((note) => (
              <div key={note} className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                {note}
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
