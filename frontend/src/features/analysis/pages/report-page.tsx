import { useQuery } from '@tanstack/react-query'
import { Download, FileText } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ChartCard } from '@/components/charts/chart-card'
import { PageHeader } from '@/components/layout/page-header'
import { ReportMarkdown } from '@/components/markdown/report-markdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { exportToCsv } from '@/lib/export/csv'
import { exportToPdf } from '@/lib/export/pdf'
import { serializeChartRows } from '@/components/charts/option-factories'

export function ReportPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { sessionId = '' } = useParams()
  const adapter = useApiAdapter()

  const reportQuery = useQuery({
    queryKey: ['analysis', sessionId, 'report'],
    queryFn: () => adapter.analysis.getReport(sessionId),
  })

  const sessionQuery = useQuery({
    queryKey: ['analysis', sessionId],
    queryFn: () => adapter.analysis.getById(sessionId),
  })

  const report = reportQuery.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Final report"
        title={report?.summaryTitle ?? t('analysis.reportTitle')}
        description="Markdown narrative, metrics, charts, evidence, assumptions, and disclaimers are assembled into one deliberate reading flow."
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                if (!report) return
                void exportToCsv({
                  title: `report-${sessionId}`,
                  headers: ['Label', 'Value', 'Detail'],
                  rows: report.highlights.map((highlight) => [highlight.label, highlight.value, highlight.detail]),
                })
              }}
            >
              <Download className="size-4" />
              CSV
            </Button>
            <Button
              onClick={() => {
                if (!report) return
                void exportToPdf({
                  title: `report-${sessionId}`,
                  headers: ['Section', 'Content'],
                  rows: [
                    ...report.highlights.map((item) => [item.label, `${item.value} | ${item.detail}`]),
                    ...report.charts.map((chart) => [chart.title, serializeChartRows(chart).join(', ')]),
                  ],
                })
              }}
            >
              <FileText className="size-4" />
              PDF
            </Button>
          </>
        }
      />

      {report ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {report.highlights.map((highlight) => (
              <Card key={highlight.id} className="p-5">
                <p className="text-sm text-text-secondary">{highlight.label}</p>
                <p className="metric-value mt-3 text-3xl font-semibold text-text-primary">{highlight.value}</p>
                <p className="mt-3 text-sm text-text-secondary">{highlight.detail}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="space-y-4 p-6">
              <ReportMarkdown markdown={report.markdown} />
            </Card>
            <Card className="space-y-4 p-6">
              <div>
                <h2 className="text-lg font-semibold text-text-primary">Evidence & assumptions</h2>
                <p className="mt-1 text-sm text-text-secondary">
                  Distinguish facts, estimates, and inferences before taking irreversible action.
                </p>
              </div>
              <div className="space-y-3">
                {report.assumptions.map((assumption) => (
                  <div key={assumption} className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4 text-sm text-text-secondary">
                    {assumption}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                {report.disclaimers.map((disclaimer) => (
                  <Badge key={disclaimer} tone="warning" className="w-full justify-start rounded-[20px] px-4 py-3 text-left text-sm">
                    {disclaimer}
                  </Badge>
                ))}
              </div>
              <Button variant="secondary" onClick={() => void navigate(`/analysis/session/${sessionId}/clarify`)}>
                Re-open clarification
              </Button>
            </Card>
          </div>

          <div className="space-y-4">
            {report.charts.map((chart) => <ChartCard key={chart.id} chart={chart} />)}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card className="space-y-4 p-6">
              <h2 className="text-lg font-semibold text-text-primary">Calculation outputs</h2>
              <div className="space-y-3">
                {report.calculations.map((calculation) => (
                  <div key={calculation.id} className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                    <p className="font-medium text-text-primary">{calculation.taskType}</p>
                    <p className="mono mt-2 text-sm text-gold-ink">{calculation.result} {calculation.units}</p>
                    <p className="mt-2 text-sm text-text-secondary">{calculation.formulaExpression}</p>
                  </div>
                ))}
              </div>
            </Card>
            <Card className="space-y-4 p-6">
              <h2 className="text-lg font-semibold text-text-primary">Evidence trail</h2>
              <div className="space-y-3">
                {report.evidence.map((evidence) => (
                  <div key={evidence.id} className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-text-primary">{evidence.title}</p>
                      <Badge tone="gold">{Math.round(evidence.confidence * 100)}%</Badge>
                    </div>
                    <p className="mt-2 text-sm text-text-secondary">{evidence.summary}</p>
                    <a
                      href={evidence.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-xs text-gold-ink underline-offset-4 hover:underline"
                    >
                      {evidence.sourceName}
                    </a>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </>
      ) : null}

      {sessionQuery.data && !report ? (
        <Card className="p-6 text-sm text-text-secondary">
          The session exists, but the report bundle is still unavailable. This is where the fallback adapter state would surface.
        </Card>
      ) : null}
    </div>
  )
}
