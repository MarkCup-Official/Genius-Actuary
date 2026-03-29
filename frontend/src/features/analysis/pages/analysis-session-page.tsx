import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Brain,
  CheckCircle2,
  CircleHelp,
  Clock3,
  LoaderCircle,
  Search,
  TableProperties,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input, Textarea } from '@/components/ui/field'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import type { AnalysisProgress, AnalysisSession, UserAnswer } from '@/types'

type DraftAnswer = {
  selectedOptions: string[]
  customInput: string
  answerStatus: UserAnswer['answerStatus']
}

function buildDraftAnswers(session: AnalysisSession) {
  return Object.fromEntries(
    session.questions
      .filter((question) => !question.answered)
      .map((question) => [
        question.id,
        {
          selectedOptions: [],
          customInput: '',
          answerStatus: 'answered' as const,
        },
      ]),
  ) satisfies Record<string, DraftAnswer>
}

function toAnswers(session: AnalysisSession, drafts: Record<string, DraftAnswer>) {
  return session.questions
    .filter((question) => !question.answered)
    .flatMap((question) => {
      const draft = drafts[question.id]
      if (!draft) {
        return []
      }

      const hasAnswer = draft.selectedOptions.length > 0 || draft.customInput.trim().length > 0
      if (draft.answerStatus === 'answered' && !hasAnswer) {
        return []
      }

      return [
        {
          id: `${question.id}-answer`,
          questionId: question.id,
          answerStatus: draft.answerStatus,
          selectedOptions: draft.selectedOptions.length ? draft.selectedOptions : undefined,
          customInput: draft.customInput.trim() || undefined,
        } satisfies UserAnswer,
      ]
    })
}

function statusLabel(status?: string) {
  const labels: Record<string, string> = {
    waiting_for_user_clarification_answers: '等待用户回答问题',
    searching_web_for_evidence: '搜索网页中',
    searching_and_synthesizing: '搜索并综合证据中',
    running_deterministic_calculations: '执行计算中',
    preparing_visualizations: '生成图表与表格中',
    running_analysis_pipeline: '分析思考中',
    analyzing: '分析思考中',
    completed: '分析完成',
    failed: '分析失败',
  }

  return labels[status ?? ''] ?? '等待系统推进'
}

function toneForStage(status: AnalysisProgress['stages'][number]['status']) {
  if (status === 'completed') {
    return 'success'
  }

  if (status === 'active') {
    return 'gold'
  }

  return 'neutral'
}

export function AnalysisSessionPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { sessionId = '' } = useParams()
  const adapter = useApiAdapter()
  const [drafts, setDrafts] = useState<Record<string, DraftAnswer>>({})

  const sessionQuery = useQuery({
    queryKey: ['analysis', sessionId],
    queryFn: () => adapter.analysis.getById(sessionId),
  })

  const progressQuery = useQuery({
    queryKey: ['analysis', sessionId, 'progress'],
    queryFn: () => adapter.analysis.getProgress(sessionId),
    enabled:
      !!sessionQuery.data &&
      sessionQuery.data.status !== 'COMPLETED' &&
      sessionQuery.data.status !== 'FAILED',
    refetchInterval: sessionQuery.data?.status === 'CLARIFYING' ? 3000 : 1400,
  })

  const submitMutation = useMutation({
    mutationFn: (answers: UserAnswer[]) => adapter.analysis.submitAnswers(sessionId, { answers }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['analysis', sessionId] })
      await queryClient.invalidateQueries({ queryKey: ['analysis', sessionId, 'progress'] })
    },
  })

  const session = sessionQuery.data
  const progress = progressQuery.data
  const pendingQuestions = useMemo(
    () => session?.questions.filter((question) => !question.answered) ?? [],
    [session?.questions],
  )

  useEffect(() => {
    if (!session) {
      return
    }

    setDrafts((current) => ({
      ...buildDraftAnswers(session),
      ...current,
    }))
  }, [session])

  useEffect(() => {
    if (progress?.status === 'COMPLETED' || session?.status === 'COMPLETED') {
      void navigate(`/analysis/session/${sessionId}/result`, { replace: true })
    }
  }, [navigate, progress?.status, session?.status, sessionId])

  useEffect(() => {
    if (progressQuery.data) {
      void queryClient.invalidateQueries({ queryKey: ['analysis', sessionId] })
    }
  }, [progressQuery.data, queryClient, sessionId])

  if (!session) {
    return (
      <Card className="p-6 text-sm text-text-secondary">
        正在加载分析会话...
      </Card>
    )
  }

  const liveStatus = progress?.activityStatus ?? session.activityStatus
  const currentFocus = progress?.currentFocus ?? session.currentFocus
  const lastStopReason = progress?.lastStopReason ?? session.lastStopReason
  const liveStages = progress?.stages ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="第 2 页 / 分析界面"
        title={session.problemStatement}
        description="在这个页面回答 AI 追问，并实时查看系统当前处于等待回答、搜索网页、生成图表还是撰写结果。"
      />

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <Card className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <CircleHelp className="size-5 text-gold-primary" />
              <div>
                <h2 className="text-lg font-semibold text-text-primary">AI 追问</h2>
                <p className="text-sm leading-7 text-text-secondary">
                  当前页面会根据模式提出问题。回答越具体，预算或方案比较结果越可靠。
                </p>
              </div>
            </div>

            {pendingQuestions.length ? (
              <div className="space-y-4">
                {pendingQuestions.map((question, index) => {
                  const draft = drafts[question.id] ?? {
                    selectedOptions: [],
                    customInput: '',
                    answerStatus: 'answered' as const,
                  }

                  return (
                    <div
                      key={question.id}
                      className="rounded-[24px] border border-border-subtle bg-app-bg-elevated p-5"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="neutral">Q{index + 1}</Badge>
                        <Badge tone="gold">P{question.priority}</Badge>
                        {question.questionGroup ? <Badge tone="neutral">{question.questionGroup}</Badge> : null}
                      </div>
                      <h3 className="mt-3 text-lg font-semibold text-text-primary">{question.question}</h3>
                      <p className="mt-2 text-sm leading-7 text-text-secondary">{question.purpose}</p>
                      {question.exampleAnswer ? (
                        <p className="mt-2 text-xs text-text-muted">示例回答：{question.exampleAnswer}</p>
                      ) : null}

                      {question.options?.length ? (
                        <div className="mt-4 grid gap-2 md:grid-cols-2">
                          {question.options.map((option) => {
                            const isActive = draft.selectedOptions.includes(option.value)
                            return (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() =>
                                  setDrafts((current) => ({
                                    ...current,
                                    [question.id]: {
                                      ...draft,
                                      selectedOptions: isActive ? [] : [option.value],
                                      answerStatus: 'answered',
                                    },
                                  }))
                                }
                                className={`rounded-[18px] border px-4 py-4 text-left text-sm ${
                                  isActive
                                    ? 'border-border-strong bg-[rgba(212,175,55,0.14)] text-text-primary'
                                    : 'border-border-subtle bg-app-bg text-text-secondary hover:border-border-strong'
                                }`}
                              >
                                {option.label}
                              </button>
                            )
                          })}
                        </div>
                      ) : null}

                      <div className="mt-4 space-y-2">
                        <label className="text-sm text-text-secondary">{question.inputHint || '补充说明'}</label>
                        {question.fieldType === 'text' ? (
                          <Input
                            value={draft.customInput}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [question.id]: {
                                  ...draft,
                                  customInput: event.target.value,
                                  answerStatus: 'answered',
                                },
                              }))
                            }
                            placeholder="补充关键事实、约束或担心的问题"
                          />
                        ) : (
                          <Textarea
                            value={draft.customInput}
                            onChange={(event) =>
                              setDrafts((current) => ({
                                ...current,
                                [question.id]: {
                                  ...draft,
                                  customInput: event.target.value,
                                  answerStatus: 'answered',
                                },
                              }))
                            }
                            placeholder="用自然语言补充背景、约束、预算或偏好。"
                          />
                        )}
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <Button
                          variant={draft.answerStatus === 'answered' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() =>
                            setDrafts((current) => ({
                              ...current,
                              [question.id]: {
                                ...draft,
                                answerStatus: 'answered',
                              },
                            }))
                          }
                        >
                          正常回答
                        </Button>
                        <Button
                          variant={draft.answerStatus === 'uncertain' ? 'secondary' : 'ghost'}
                          size="sm"
                          onClick={() =>
                            setDrafts((current) => ({
                              ...current,
                              [question.id]: {
                                ...draft,
                                answerStatus: 'uncertain',
                              },
                            }))
                          }
                        >
                          暂不确定
                        </Button>
                        {question.allowSkip ? (
                          <Button
                            variant={draft.answerStatus === 'skipped' ? 'secondary' : 'ghost'}
                            size="sm"
                            onClick={() =>
                              setDrafts((current) => ({
                                ...current,
                                [question.id]: {
                                  ...draft,
                                  answerStatus: 'skipped',
                                },
                              }))
                            }
                          >
                            跳过
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  )
                })}

                <Button
                  onClick={() => void submitMutation.mutateAsync(toAnswers(session, drafts))}
                  disabled={submitMutation.isPending}
                >
                  {submitMutation.isPending ? <LoaderCircle className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                  提交本轮回答
                </Button>
              </div>
            ) : (
              <div className="rounded-[24px] border border-border-subtle bg-app-bg-elevated p-5 text-sm leading-7 text-text-secondary">
                当前没有待回答问题。系统会继续推进分析，或者你可以稍等片刻自动进入结果页。
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="space-y-5 p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Brain className="size-5 text-gold-primary" />
                <div>
                  <h2 className="text-lg font-semibold text-text-primary">AI 当前状态</h2>
                  <p className="text-sm leading-7 text-text-secondary">这个状态来自后端当前会话，而不是前端本地猜测。</p>
                </div>
              </div>
              <Badge tone={session.status === 'FAILED' ? 'warning' : session.status === 'COMPLETED' ? 'success' : 'gold'}>
                {statusLabel(liveStatus)}
              </Badge>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-text-muted">当前焦点</p>
                <p className="mt-3 text-sm leading-7 text-text-secondary">{currentFocus || '等待系统推进下一步。'}</p>
              </div>
              <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-text-muted">最近停顿原因</p>
                <p className="mt-3 text-sm leading-7 text-text-secondary">{lastStopReason || '当前没有额外停顿原因。'}</p>
              </div>
            </div>

            {session.status === 'FAILED' ? (
              <div className="rounded-[20px] border border-[rgba(197,109,99,0.35)] bg-[rgba(197,109,99,0.08)] p-4 text-sm leading-7 text-[#f1cbc6]">
                {session.errorMessage ?? '分析失败，请检查后端日志或重新发起分析。'}
              </div>
            ) : null}

            <div className="space-y-3">
              {liveStages.map((stage) => (
                <div key={stage.id} className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-text-primary">{stage.title}</p>
                      <p className="mt-1 text-sm leading-7 text-text-secondary">{stage.description}</p>
                    </div>
                    <Badge tone={toneForStage(stage.status)}>{stage.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4 p-6">
            <h2 className="text-lg font-semibold text-text-primary">任务与产物</h2>

            <div className="space-y-3">
              <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                <div className="flex items-center gap-2 text-text-primary">
                  <Search className="size-4 text-gold-primary" />
                  <span className="font-medium">搜索任务</span>
                </div>
                <p className="mt-2 text-sm text-text-secondary">
                  {(progress?.pendingSearchTasks?.length ?? session.searchTasks.length) || 0} 个
                </p>
              </div>

              <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                <div className="flex items-center gap-2 text-text-primary">
                  <Clock3 className="size-4 text-gold-primary" />
                  <span className="font-medium">已回答问题</span>
                </div>
                <p className="mt-2 text-sm text-text-secondary">{session.answers.length} 个</p>
              </div>

              <div className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
                <div className="flex items-center gap-2 text-text-primary">
                  <TableProperties className="size-4 text-gold-primary" />
                  <span className="font-medium">图表预览</span>
                </div>
                <p className="mt-2 text-sm text-text-secondary">{progress?.chartArtifacts?.length ?? session.chartArtifacts?.length ?? 0} 个</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
