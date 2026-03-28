import ReactEChartsCore from 'echarts-for-react/lib/core'

import { EmptyState } from '@/components/ui/empty-state'
import { buildChartOption } from '@/components/charts/option-factories'
import { Card } from '@/components/ui/card'
import { echarts } from '@/lib/charts/echarts'
import type { ChartArtifact } from '@/types'

interface ChartCardProps {
  chart: ChartArtifact
}

export function ChartCard({ chart }: ChartCardProps) {
  const option = buildChartOption(chart)

  return (
    <Card className="overflow-hidden p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{chart.title}</h3>
          {chart.subtitle ? <p className="text-sm text-text-secondary">{chart.subtitle}</p> : null}
        </div>
        {chart.unit ? <p className="mono text-xs text-gold-ink">{chart.unit}</p> : null}
      </div>
      {option ? (
        <ReactEChartsCore
          echarts={echarts}
          option={option}
          style={{ height: 320, width: '100%' }}
          notMerge
          lazyUpdate
        />
      ) : (
        <EmptyState
          title="Insufficient chart data"
          description="This visualization was intentionally withheld because the underlying dataset is incomplete."
        />
      )}
      <div className="mt-4 flex flex-wrap gap-3 text-xs text-text-muted">
        {chart.source ? <span>Source: {chart.source}</span> : null}
        {chart.note ? <span>{chart.note}</span> : null}
      </div>
    </Card>
  )
}
