import { useQuery } from '@tanstack/react-query'
import {
  Banknote,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  GitCompare,
  TriangleAlert,
} from 'lucide-react'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ChartCard } from '@/components/charts/chart-card'
import { PageHeader } from '@/components/layout/page-header'
import { ReportMarkdown } from '@/components/markdown/report-markdown'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ReportTableCard } from '@/features/analysis/components/report-table-card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'

function formatMoney(value?: number, currency = 'CNY') {
  if (typeof value !== 'number') {
    return '—'
  }

  return `${Math.round(value).toLocaleString('zh-CN')} ${currency}`
}

export function ReportPage() {
  const navigate = useNavigate()
  const { sessionId = '' } = useParams()
  const adapter = useApiAdapter()

  const sessionQuery = useQuery({
    queryKey: ['analysis', sessionId],
    queryFn: () => adapter.analysis.getById(sessionId),
  })

  const reportQuery = useQuery({
    queryKey: ['analysis', sessionId, 'report'],
    queryFn: () => adapter.analysis.getReport(sessionId),
  })

  const session = sessionQuery.data
  const report = reportQuery.data

  useEffect(() => {
    if (!session) {
      return
    }

    if (session.status !== 'COMPLETED' && session.status !== 'FAILED') {
      void navigate(`/analysis/session/${sessionId}`, { replace: true })
    }
  }, [navigate, session, sessionId])

  if (!report || !session) {
    return (
      <Card className="p-6 text-sm text-text-secondary">
        正在准备结果页...
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="第 3 页 / 结果界面"
        title={report.summaryTitle}
        description="最终结果会同时展示结构化指标、图表、表格和长文分析。"
        actions={
          <Button variant="secondary" onClick={() => void navigate(`/analysis/session/${sessionId}`)}>
            返回分析界面
          </Button>
        }
      />

      {session.status === 'FAILED' ? (
        <Card className="space-y-4 border-[rgba(197,109,99,0.35)] bg-[rgba(197,109,99,0.08)] p-6">
          <h2 className="text-lg font-semibold text-[#f7d4cf]">分析失败</h2>
          <p className="text-sm leading-7 text-[#f1cbc6]">
            {session.errorMessage ?? '后端在生成结果时失败，请返回分析界面查看状态或重新发起。'}
          </p>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {report.highlights.map((highlight) => (
          <Card key={highlight.id} className="p-5">
            <p className="text-sm text-text-secondary">{highlight.label}</p>
            <p className="mt-3 text-3xl font-semibold text-text-primary">{highlight.value}</p>
            <p className="mt-3 text-sm leading-7 text-text-secondary">{highlight.detail}</p>
          </Card>
        ))}
      </div>

      {report.budgetSummary ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Banknote className="size-5 text-gold-primary" />
            <h2 className="text-xl font-semibold text-text-primary">预算总览</h2>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-text-primary">
                <CircleDollarSign className="size-4 text-gold-primary" />
                <span className="font-medium">净预算范围</span>
              </div>
              <p className="text-2xl font-semibold text-text-primary">
                {formatMoney(report.budgetSummary.netLow, report.budgetSummary.currency)} -{' '}
                {formatMoney(report.budgetSummary.netHigh, report.budgetSummary.currency)}
              </p>
              <p className="text-sm leading-7 text-text-secondary">
                基准净预算：{formatMoney(report.budgetSummary.netBase, report.budgetSummary.currency)}
              </p>
            </Card>

            <Card className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-text-primary">
                <BarChart3 className="size-4 text-gold-primary" />
                <span className="font-medium">总成本区间</span>
              </div>
              <p className="text-2xl font-semibold text-text-primary">
                {formatMoney(report.budgetSummary.totalCostLow, report.budgetSummary.currency)} -{' '}
                {formatMoney(report.budgetSummary.totalCostHigh, report.budgetSummary.currency)}
              </p>
              <p className="text-sm leading-7 text-text-secondary">
                基准总成本：{formatMoney(report.budgetSummary.totalCostBase, report.budgetSummary.currency)}
              </p>
            </Card>

            <Card className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-text-primary">
                <TriangleAlert className="size-4 text-gold-primary" />
                <span className="font-medium">预算提醒</span>
              </div>
              <p className="text-sm leading-7 text-text-secondary">
                {report.budgetSummary.reserveNote || '建议为不确定项单独预留缓冲。'}
              </p>
            </Card>
          </div>
        </div>
      ) : null}

      {report.optionProfiles?.length ? (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <GitCompare className="size-5 text-gold-primary" />
            <h2 className="text-xl font-semibold text-text-primary">方案平行比较</h2>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {report.optionProfiles.map((option) => (
              <Card key={option.id} className="space-y-4 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">{option.name}</h3>
                    <p className="mt-2 text-sm leading-7 text-text-secondary">{option.summary}</p>
                  </div>
                  {typeof option.score === 'number' ? <Badge tone="gold">{option.score.toFixed(1)}</Badge> : null}
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-text-muted">优点</p>
                  {option.pros.map((item) => (
                    <div key={`${option.id}-pro-${item}`} className="rounded-[18px] border border-border-subtle bg-app-bg-elevated px-4 py-3 text-sm text-text-secondary">
                      {item}
                    </div>
                  ))}
                </div>

                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-text-muted">缺点</p>
                  {option.cons.map((item) => (
                    <div key={`${option.id}-con-${item}`} className="rounded-[18px] border border-border-subtle bg-app-bg-elevated px-4 py-3 text-sm text-text-secondary">
                      {item}
                    </div>
                  ))}
                </div>

                <div className="rounded-[18px] border border-border-subtle bg-app-bg-elevated px-4 py-3 text-sm text-text-secondary">
                  基准成本：{formatMoney(option.estimatedCostBase, option.currency)}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ) : null}

      {report.tables?.length ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">结构化表格</h2>
          {report.tables.map((table) => (
            <ReportTableCard key={table.id} table={table} />
          ))}
        </div>
      ) : null}

      {report.charts.length ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">图表结果</h2>
          {report.charts.map((chart) => (
            <ChartCard key={chart.id} chart={chart} />
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="space-y-4 p-6">
          <h2 className="text-xl font-semibold text-text-primary">完整分析</h2>
          <ReportMarkdown markdown={report.markdown} />
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-text-primary">假设与限制</h2>
            <div className="space-y-3">
              {report.assumptions.map((assumption) => (
                <div
                  key={assumption}
                  className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4 text-sm leading-7 text-text-secondary"
                >
                  {assumption}
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-text-primary">证据与提醒</h2>
            <div className="space-y-3">
              {report.evidence.length ? (
                report.evidence.map((evidence) => (
                  <div
                    key={evidence.id}
                    className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-text-primary">{evidence.title}</p>
                      <Badge tone="gold">{Math.round(evidence.confidence * 100)}%</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-text-secondary">{evidence.summary}</p>
                    <a
                      href={evidence.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-xs text-gold-ink underline-offset-4 hover:underline"
                    >
                      {evidence.sourceName}
                    </a>
                  </div>
                ))
              ) : (
                <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4 text-sm leading-7 text-text-secondary">
                  当前结果主要基于你的输入、系统估算和结构化分析流程生成。
                </div>
              )}

              {report.disclaimers.map((disclaimer) => (
                <div
                  key={disclaimer}
                  className="rounded-[20px] border border-[rgba(249,228,159,0.16)] bg-[rgba(212,175,55,0.08)] p-4 text-sm leading-7 text-text-secondary"
                >
                  {disclaimer}
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-text-primary">计算摘要</h2>
            <div className="space-y-3">
              {report.calculations.map((calculation) => (
                <div
                  key={calculation.id}
                  className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4"
                >
                  <div className="flex items-center gap-2 text-text-primary">
                    <CheckCircle2 className="size-4 text-gold-primary" />
                    <p className="font-medium">{calculation.taskType}</p>
                  </div>
                  <p className="mt-3 text-sm text-gold-ink">
                    {calculation.result} {calculation.units}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-text-secondary">{calculation.formulaExpression}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
