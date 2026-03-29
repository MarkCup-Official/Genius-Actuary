import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { ChartCard } from '@/components/charts/chart-card'
import { PageHeader } from '@/components/layout/page-header'
import { ReportMarkdown } from '@/components/markdown/report-markdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'

function stripOpenQuestionsSection(markdown: string) {
  return markdown
    .replace(/\n## Open Questions[\s\S]*?(?=\n## |\s*$)/, '')
    .replace(/\n## 寰呯‘璁ら棶棰[\s\S]*?(?=\n## |\s*$)/, '')
}

export function ReportPage() {
  const { i18n, t } = useTranslation()
  const navigate = useNavigate()
  const { sessionId = '' } = useParams()
  const adapter = useApiAdapter()
  const isZh = i18n.language.startsWith('zh')

  const reportQuery = useQuery({
    queryKey: ['analysis', sessionId, 'report'],
    queryFn: () => adapter.analysis.getReport(sessionId),
  })

  const sessionQuery = useQuery({
    queryKey: ['analysis', sessionId],
    queryFn: () => adapter.analysis.getById(sessionId),
  })

  const report = reportQuery.data
  const session = sessionQuery.data
  const pendingQuestions: Array<{ answered?: boolean }> = []
  const reportMarkdown = report
    ? stripOpenQuestionsSection(report.markdown)
    : ''

  const requestMoreFollowUpMutation = useMutation({
    mutationFn: () => adapter.analysis.requestMoreFollowUp(sessionId),
    onSuccess: (updatedSession) => {
      if (updatedSession.status === 'CLARIFYING') {
        void navigate(`/analysis/session/${sessionId}/clarify`)
        return
      }

      void navigate(`/analysis/session/${sessionId}/progress`)
    },
  })

  const failedMessage =
    session?.status === 'FAILED'
      ? (session.errorMessage ??
        (isZh
          ? '报告生成失败，请检查模型配置后重试。'
          : 'Report generation failed after all retries.'))
      : null

  const localizeHighlight = (highlight: {
    id: string
    label: string
    detail: string
    value: string
  }) => {
    const highlightMap: Record<string, { label: string; detail: string }> = {
      'backend-status': {
        label: isZh ? '当前状态' : 'Current status',
        detail: isZh
          ? '展示当前分析流程的状态概览。'
          : 'Shows the current state of the analysis flow.',
      },
      'answers-count': {
        label: isZh ? '已填写问题' : 'Answered questions',
        detail: isZh
          ? '当前会话中已经补充完成的问题数量。'
          : 'How many clarification questions have been completed in this session.',
      },
      'evidence-count': {
        label: isZh ? '证据条目' : 'Evidence items',
        detail: isZh
          ? '当前报告里整理出的证据与参考条目数量。'
          : 'How many evidence and reference items are included in this report.',
      },
      'chart-count': {
        label: isZh ? '图表预览' : 'Chart previews',
        detail: isZh
          ? '当前报告中可查看的图表数量。'
          : 'How many charts are available to review in this report.',
      },
    }

    const localized = highlightMap[highlight.id]

    return localized ? { ...highlight, ...localized } : highlight
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('common.nextStep')}
        title={report?.summaryTitle ?? t('analysis.reportTitle')}
        description={t('analysis.reportSubtitle')}
      />

      {failedMessage ? (
        <Card className="space-y-4 border-[rgba(197,109,99,0.35)] bg-[rgba(197,109,99,0.08)] p-6">
          <h2 className="text-lg font-semibold text-[#f7d4cf]">
            {isZh ? '报告生成失败' : 'Report generation failed'}
          </h2>
          <p className="text-sm leading-7 text-[#f1cbc6]">{failedMessage}</p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() =>
                void navigate(`/analysis/session/${sessionId}/progress`)
              }
            >
              {isZh ? '返回进度页' : 'Back to progress'}
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                void navigate(`/analysis/session/${sessionId}/clarify`)
              }
            >
              {isZh ? '返回澄清页' : 'Back to clarification'}
            </Button>
          </div>
        </Card>
      ) : report ? (
        <>
          {pendingQuestions.length ? (
            <Card className="border-border-strong bg-app-bg-elevated space-y-4 p-6">
              <div className="space-y-2">
                <h2 className="text-text-primary text-lg font-semibold">
                  {isZh
                    ? '有新的追问等待回答'
                    : 'New follow-up questions are waiting'}
                </h2>
                <p className="text-text-secondary text-sm leading-7">
                  {isZh
                    ? '分析过程中产生的新问题应该直接在问答页回答，不需要先在结果页停留。'
                    : 'Questions raised during analysis should be answered directly in the clarification flow, not postponed here.'}
                </p>
              </div>
              <Button
                onClick={() =>
                  void navigate(`/analysis/session/${sessionId}/clarify`)
                }
              >
                {isZh ? '立即继续回答' : 'Answer now'}
              </Button>
            </Card>
          ) : null}

          {session?.followUpBudgetExhausted ? (
            <Card className="border-border-strong bg-app-bg-elevated space-y-4 p-6">
              <div className="space-y-2">
                <h2 className="text-text-primary text-lg font-semibold">
                  {isZh
                    ? '额外追问轮次已用完'
                    : 'Extra follow-up rounds are exhausted'}
                </h2>
                <p className="text-text-secondary text-sm leading-7">
                  {isZh
                    ? `本轮已达到 ${session.followUpRoundLimit ?? 10} 次额外追问上限，系统先输出当前完整报告。需要继续时，可以在这里再开启下一组 ${session.followUpRoundLimit ?? 10} 次追问。`
                    : `This run reached the ${session.followUpRoundLimit ?? 10}-round follow-up limit, so the current full report was produced first. You can start another ${session.followUpRoundLimit ?? 10}-round follow-up window here.`}
                </p>
                {typeof session.deferredFollowUpQuestionCount === 'number' &&
                session.deferredFollowUpQuestionCount > 0 ? (
                  <Badge tone="gold">
                    {isZh
                      ? `仍有 ${session.deferredFollowUpQuestionCount} 个问题待继续追问`
                      : `${session.deferredFollowUpQuestionCount} deferred question(s) remain`}
                  </Badge>
                ) : null}
              </div>
              <Button
                onClick={() => void requestMoreFollowUpMutation.mutateAsync()}
                disabled={requestMoreFollowUpMutation.isPending}
              >
                {isZh
                  ? `继续 ${session.followUpRoundLimit ?? 10} 次追问`
                  : `Continue ${session.followUpRoundLimit ?? 10} more follow-ups`}
              </Button>
            </Card>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {report.highlights.map((highlight) => {
              const localizedHighlight = localizeHighlight(highlight)

              return (
                <Card key={highlight.id} className="p-5">
                  <p className="text-text-secondary text-sm">
                    {localizedHighlight.label}
                  </p>
                  <p className="metric-value text-text-primary mt-3 text-3xl font-semibold">
                    {localizedHighlight.value}
                  </p>
                  <p className="text-text-secondary mt-3 text-sm leading-7">
                    {localizedHighlight.detail}
                  </p>
                </Card>
              )
            })}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="space-y-4 p-6">
              <ReportMarkdown markdown={reportMarkdown} />
            </Card>

            <Card className="space-y-4 p-6">
              <div>
                <h2 className="text-text-primary text-lg font-semibold">
                  {t('analysis.reportEvidenceTitle')}
                </h2>
                <p className="text-text-secondary mt-1 text-sm leading-7">
                  {t('analysis.reportEvidenceHint')}
                </p>
              </div>

              <div className="space-y-3">
                {report.assumptions.map((assumption) => (
                  <div
                    key={assumption}
                    className="border-border-subtle bg-app-bg-elevated text-text-secondary rounded-[20px] border p-4 text-sm leading-7"
                  >
                    {assumption}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                {report.disclaimers.map((disclaimer) => (
                  <Badge
                    key={disclaimer}
                    tone="warning"
                    className="w-full justify-start rounded-[20px] px-4 py-3 text-left text-sm"
                  >
                    {disclaimer}
                  </Badge>
                ))}
              </div>

              <Button
                variant="secondary"
                onClick={() =>
                  void navigate(`/analysis/session/${sessionId}/clarify`)
                }
              >
                {t('analysis.reportReopenClarification')}
              </Button>
            </Card>
          </div>

          <div className="space-y-4">
            {report.charts.map((chart) => (
              <ChartCard key={chart.id} chart={chart} />
            ))}
          </div>

          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <Card className="space-y-4 p-6">
              <h2 className="text-text-primary text-lg font-semibold">
                {t('analysis.reportCalculations')}
              </h2>
              <div className="space-y-3">
                {report.calculations.map((calculation) => (
                  <div
                    key={calculation.id}
                    className="border-border-subtle bg-app-bg-elevated rounded-[20px] border p-4"
                  >
                    <p className="text-text-primary font-medium">
                      {calculation.taskType}
                    </p>
                    <p className="mono text-gold-ink mt-2 text-sm">
                      {calculation.result} {calculation.units}
                    </p>
                    <p className="text-text-secondary mt-2 text-sm">
                      {calculation.formulaExpression}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="space-y-4 p-6">
              <h2 className="text-text-primary text-lg font-semibold">
                {t('analysis.reportEvidenceTrail')}
              </h2>
              <div className="space-y-3">
                {report.evidence.map((evidence) => (
                  <div
                    key={evidence.id}
                    className="border-border-subtle bg-app-bg-elevated rounded-[20px] border p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-text-primary font-medium">
                        {evidence.title}
                      </p>
                      <Badge tone="gold">
                        {Math.round(evidence.confidence * 100)}%
                      </Badge>
                    </div>
                    <p className="text-text-secondary mt-2 text-sm leading-7">
                      {evidence.summary}
                    </p>
                    <a
                      href={evidence.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-gold-ink mt-3 inline-flex text-xs underline-offset-4 hover:underline"
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

      {session && !report && !failedMessage ? (
        <Card className="text-text-secondary p-6 text-sm leading-7">
          {t('analysis.reportFallback')}
        </Card>
      ) : null}
    </div>
  )
}
