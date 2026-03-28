import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, ChevronRight, GitCompare, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import type { AnalysisMode } from '@/types'

export function ModeSelectionPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const adapter = useApiAdapter()
  const [selectedMode, setSelectedMode] = useState<AnalysisMode | null>(null)

  const modesQuery = useQuery({
    queryKey: ['analysis', 'modes'],
    queryFn: adapter.modes.list,
  })

  const localizedLenses = {
    'single-option': t('analysis.singleValueLens', { returnObjects: true }) as string[],
    'multi-option': t('analysis.multiValueLens', { returnObjects: true }) as string[],
  } satisfies Record<AnalysisMode, string[]>

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('app.workspaceEyebrow')}
        title={t('analysis.modeTitle')}
        description={t('analysis.modeSubtitle')}
      />

      <Card className="p-5">
        <p className="text-sm leading-7 text-text-secondary">{t('analysis.modeGuide')}</p>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {modesQuery.data?.map((mode) => {
          const isSelected = selectedMode === mode.id
          const hasSelection = Boolean(selectedMode)
          const title = mode.id === 'single-option' ? t('analysis.singleMode') : t('analysis.multiMode')
          const description =
            mode.id === 'single-option' ? t('analysis.singleDescription') : t('analysis.multiDescription')
          const valueLens = localizedLenses[mode.id]

          return (
            <Card
              key={mode.id}
              role="button"
              aria-pressed={isSelected}
              tabIndex={0}
              onClick={() => setSelectedMode(mode.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setSelectedMode(mode.id)
                }
              }}
              className={`interactive-lift group relative overflow-hidden p-6 ${
                isSelected
                  ? 'border-border-strong bg-[linear-gradient(180deg,rgba(249,228,159,0.08),transparent_100%),var(--panel)] shadow-[0_0_0_1px_rgba(249,228,159,0.18),0_24px_72px_rgba(212,175,55,0.16)]'
                  : hasSelection
                    ? 'opacity-72'
                    : ''
              }`}
            >
              {isSelected ? <div className="absolute inset-y-6 left-0 w-1 rounded-full bg-[var(--gold-primary)]" /> : null}

              <div
                className={`absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.18),transparent_38%)] transition ${
                  isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                }`}
              />

              <div className="relative space-y-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="inline-flex rounded-full border border-border-subtle bg-app-bg-elevated p-3 text-gold-primary">
                      {mode.id === 'single-option' ? <Sparkles className="size-5" /> : <GitCompare className="size-5" />}
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold tracking-[-0.03em] text-text-primary">{title}</h2>
                      <p className="mt-2 text-sm leading-7 text-text-secondary">{description}</p>
                    </div>
                  </div>
                  {isSelected ? (
                    <Badge tone="gold" className="gap-1 px-3 py-1.5 shadow-[0_0_0_1px_rgba(249,228,159,0.14)]">
                      <CheckCircle2 className="size-3.5" />
                      {t('analysis.modeSelected')}
                    </Badge>
                  ) : null}
                </div>

                <div className="grid gap-2">
                  {valueLens.map((item) => (
                    <div
                      key={item}
                      className={`rounded-[18px] border px-4 py-3 text-sm transition ${
                        isSelected
                          ? 'border-border-strong bg-[rgba(212,175,55,0.12)] text-text-primary shadow-[0_0_0_1px_rgba(249,228,159,0.08)]'
                          : 'border-border-subtle bg-app-bg-elevated text-text-secondary'
                      }`}
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-6 text-text-muted">{t('analysis.modeActionHint')}</p>
                  <Button
                    variant={isSelected ? 'primary' : 'secondary'}
                    onClick={() =>
                      isSelected ? void navigate(`/analysis/intake?mode=${mode.id}`) : setSelectedMode(mode.id)
                    }
                  >
                    {isSelected ? t('analysis.modeActionContinue') : t('analysis.modeActionSelect')}
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
