import { BrainCircuit, Sparkles } from 'lucide-react'

import { GoldenSandLoader } from '@/components/feedback/golden-sand-loader'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

interface AnalysisPendingViewProps {
  eyebrow: string
  title: string
  description: string
  loaderLabel: string
  stageLabel: string
  stageTitle: string
  stageDescription: string
  tips: [string, string]
}

export function AnalysisPendingView({
  eyebrow,
  title,
  description,
  loaderLabel,
  stageLabel,
  stageTitle,
  stageDescription,
  tips,
}: AnalysisPendingViewProps) {
  return (
    <div className="space-y-6">
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <GoldenSandLoader label={loaderLabel} />

        <Card className="space-y-5 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full border border-border-subtle bg-app-bg-elevated p-3 text-gold-primary">
              <BrainCircuit className="size-5" />
            </div>
            <div className="space-y-1">
              <Badge tone="gold">{stageLabel}</Badge>
              <h2 className="text-lg font-semibold text-text-primary">{stageTitle}</h2>
            </div>
          </div>

          <p className="text-sm leading-7 text-text-secondary">{stageDescription}</p>

          <div className="space-y-3">
            {tips.map((tip) => (
              <div
                key={tip}
                className="flex items-start gap-3 rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4"
              >
                <Sparkles className="mt-0.5 size-4 shrink-0 text-gold-primary" />
                <p className="text-sm leading-7 text-text-secondary">{tip}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
