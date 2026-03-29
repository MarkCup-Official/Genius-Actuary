import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  GitCompare,
  Lightbulb,
  ReceiptText,
  Sparkles,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/field'
import { AnalysisPendingView } from '@/features/analysis/components/analysis-pending-view'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import type { AnalysisMode } from '@/types'

const modeCopy: Record<
  AnalysisMode,
  {
    title: string
    subtitle: string
    hints: string[]
    examples: string[]
    outputs: string[]
  }
> = {
  'single-option': {
    title: '成本预估',
    subtitle: '预算范围、成本拆分、回收与风险',
    hints: [
      '适合一个具体计划，例如办比赛、开项目、做留学预算、买车等。',
      '问题里尽量写清目标规模、时间、预算上限、收入来源和担心的超支点。',
      '结果会输出预算范围、每一项可能的成本、潜在收入回收和执行风险。',
    ],
    examples: [
      '举办一场 300 人规模的比赛，大概要准备多少预算？',
      '去美国读一年硕士，完整预算范围大概是多少？',
      '公司是否值得办一次大型线下发布会，成本和回收怎么估？',
    ],
    outputs: ['预算范围', '成本项目拆分', '收入回收', '风险提醒'],
  },
  'multi-option': {
    title: '多项决策',
    subtitle: '识别方案、平行优缺点、成本与适配度',
    hints: [
      '适合开放式决策，例如留学还是工作、买车还是公共交通、A/B/C 方案怎么选。',
      '问题里尽量写清真正想解决的目标、预算约束、时间窗口和更看重什么。',
      '结果会识别可行方案，并按平行结构输出优点、缺点、成本、适合对象和建议。',
    ],
    examples: [
      '我应该现在去留学，还是先工作两年再决定？',
      '住在上海通勤，买车、公共交通和混合出行哪个更适合我？',
      '创业、进大厂还是读研，未来三年哪个路径更稳妥？',
    ],
    outputs: ['方案识别', '平行优缺点', '成本对比', '偏好适配'],
  },
}

export function ModeSelectionPage() {
  const navigate = useNavigate()
  const adapter = useApiAdapter()
  const [selectedMode, setSelectedMode] = useState<AnalysisMode>('single-option')
  const [problemStatement, setProblemStatement] = useState(
    modeCopy['single-option'].examples[0],
  )

  const modesQuery = useQuery({
    queryKey: ['analysis', 'modes'],
    queryFn: adapter.modes.list,
  })

  const createMutation = useMutation({
    mutationFn: adapter.analysis.create,
    onSuccess: (session) => {
      void navigate(`/analysis/session/${session.id}`)
    },
  })

  const selectedPreset = modeCopy[selectedMode]
  const availableModes = useMemo(
    () => modesQuery.data?.length ? modesQuery.data : undefined,
    [modesQuery.data],
  )

  if (createMutation.isPending) {
    return (
      <AnalysisPendingView
        eyebrow="发起分析"
        title="正在创建分析会话"
        description="系统会先建立本轮分析，再自动进入分析界面，继续提问并同步展示 AI 当前状态。"
        loaderLabel="正在初始化分析流程，请稍候。"
        stageLabel="初始化"
        stageTitle="准备分析工作台"
        stageDescription="正在根据你选择的模式组织提问结构、状态追踪和结果模板。"
        tips={[
          '成本预估会进入预算与成本拆分流程。',
          '多项决策会进入方案识别与平行比较流程。',
        ]}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="分析工作台"
        title="发起分析"
        description="先选择分析流程，再输入问题。接下来会进入统一的分析界面，回答 AI 追问并实时查看状态。"
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-3 text-sm text-text-secondary">
          <Badge tone="gold">第 1 页 / 发起</Badge>
          <span>第 2 页会进入分析界面，同屏展示 AI 提问与状态。</span>
          <span>第 3 页输出图表、表格和完整分析结果。</span>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        {(availableModes ?? []).map((mode) => {
          const isSelected = selectedMode === mode.id

          return (
            <Card
              key={mode.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => {
                setSelectedMode(mode.id)
                setProblemStatement(modeCopy[mode.id].examples[0])
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  setSelectedMode(mode.id)
                  setProblemStatement(modeCopy[mode.id].examples[0])
                }
              }}
              className={`interactive-lift relative overflow-hidden p-6 ${
                isSelected
                  ? 'border-border-strong bg-[linear-gradient(180deg,rgba(249,228,159,0.08),transparent_100%),var(--panel)] shadow-[0_0_0_1px_rgba(249,228,159,0.18),0_24px_72px_rgba(212,175,55,0.16)]'
                  : ''
              }`}
            >
              {isSelected ? (
                <div className="absolute inset-y-6 left-0 w-1 rounded-full bg-[var(--gold-primary)]" />
              ) : null}

              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="inline-flex rounded-full border border-border-subtle bg-app-bg-elevated p-3 text-gold-primary">
                    {mode.id === 'single-option' ? (
                      <ReceiptText className="size-5" />
                    ) : (
                      <GitCompare className="size-5" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold tracking-[-0.03em] text-text-primary">
                      {modeCopy[mode.id].title}
                    </h2>
                    <p className="mt-2 text-sm leading-7 text-text-secondary">
                      {modeCopy[mode.id].subtitle}
                    </p>
                  </div>
                </div>
                {isSelected ? (
                  <Badge tone="gold" className="gap-1 px-3 py-1.5">
                    <CheckCircle2 className="size-3.5" />
                    当前已选
                  </Badge>
                ) : null}
              </div>

              <div className="mt-6 grid gap-2">
                {modeCopy[mode.id].outputs.map((item) => (
                  <div
                    key={item}
                    className={`rounded-[18px] border px-4 py-3 text-sm ${
                      isSelected
                        ? 'border-border-strong bg-[rgba(212,175,55,0.12)] text-text-primary'
                        : 'border-border-subtle bg-app-bg-elevated text-text-secondary'
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="space-y-5 p-6">
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone="gold">{selectedPreset.title}</Badge>
            <Badge tone="neutral">视觉风格不变，流程已重构</Badge>
          </div>

          <div className="space-y-2">
            <label htmlFor="problemStatement" className="text-sm text-text-secondary">
              输入你的问题
            </label>
            <Textarea
              id="problemStatement"
              value={problemStatement}
              onChange={(event) => setProblemStatement(event.target.value)}
              placeholder="尽量写清楚你想解决的问题、约束和最在意的结果。"
              className="min-h-44 text-base"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs text-text-muted">问题示例</p>
            <div className="flex flex-wrap gap-2">
              {selectedPreset.examples.map((example) => {
                const isActive = problemStatement === example

                return (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setProblemStatement(example)}
                    className={`interactive-lift rounded-full border px-4 py-2 text-sm transition ${
                      isActive
                        ? 'border-border-strong bg-[rgba(212,175,55,0.14)] text-text-primary'
                        : 'border-border-subtle bg-app-bg-elevated text-text-secondary hover:border-border-strong hover:text-text-primary'
                    }`}
                  >
                    {example}
                  </button>
                )
              })}
            </div>
          </div>

          <Button
            onClick={() =>
              void createMutation.mutateAsync({
                mode: selectedMode,
                problemStatement,
              })
            }
            disabled={!problemStatement.trim() || createMutation.isPending}
          >
            <Sparkles className="size-4" />
            开始分析
            <ArrowRight className="size-4" />
          </Button>

          {createMutation.isError ? (
            <div className="rounded-2xl border border-[rgba(197,109,99,0.35)] bg-[rgba(197,109,99,0.12)] px-4 py-3 text-sm text-[#f7d4cf]">
              创建分析失败，请检查后端服务或稍后再试。
            </div>
          ) : null}
        </Card>

        <div className="space-y-4">
          <Card className="space-y-4 p-6">
            <div className="flex items-center gap-3 text-gold-primary">
              <Lightbulb className="size-5" />
              <h2 className="text-lg font-semibold text-text-primary">问题提示</h2>
            </div>
            <div className="space-y-3">
              {selectedPreset.hints.map((hint) => (
                <div
                  key={hint}
                  className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4 text-sm leading-7 text-text-secondary"
                >
                  {hint}
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 p-6">
            <div className="flex items-center gap-3 text-gold-primary">
              <ClipboardList className="size-5" />
              <h2 className="text-lg font-semibold text-text-primary">接下来会发生什么</h2>
            </div>
            <div className="space-y-3 text-sm leading-7 text-text-secondary">
              <p>1. 系统创建本轮分析，并进入分析界面。</p>
              <p>2. 你在同一个页面回答 AI 追问，同时看到“等待回答 / 搜索网页中 / 分析思考中”等状态。</p>
              <p>3. 分析完成后进入结果页，输出图表、表格和整段文字分析。</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
