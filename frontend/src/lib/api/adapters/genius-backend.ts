import type {
  AnalysisMode,
  AnalysisProgress,
  AnalysisReport,
  AnalysisSession,
  ChartArtifact,
  ClarificationQuestion,
  ModeDefinition,
  ResourceRecord,
  User,
  UserAnswer,
} from '@/types'
import { i18n } from '@/lib/i18n'

export const COOKIE_SESSION_TOKEN = 'backend-cookie-session'
const BACKEND_SESSION_INDEX_KEY = 'genius-actuary-rest-session-index'

export interface BackendBootstrapResponse {
  app_name: string
  supported_modes: string[]
  session_statuses: string[]
  next_actions: string[]
  notes: string[]
}

export interface BackendClarificationQuestion {
  question_id: string
  question_text: string
  purpose: string
  options: string[]
  allow_custom_input: boolean
  allow_skip: boolean
  priority: number
  answered: boolean
}

export interface BackendUserAnswer {
  question_id: string
  value: string
  source?: string
  answered_at?: string
}

export interface BackendSearchTask {
  task_id: string
  search_topic: string
  search_goal: string
  search_scope: string
  suggested_queries: string[]
  required_fields: string[]
  freshness_requirement: string
  status: string
}

export interface BackendCalculationTask {
  task_id: string
  objective: string
  formula_hint: string
  input_params: Record<string, unknown>
  status: string
}

export interface BackendEvidenceItem {
  evidence_id: string
  title: string
  source_url: string
  source_name: string
  fetched_at: string
  summary: string
  extracted_facts: string[]
  confidence: number
}

export interface BackendChartArtifact {
  chart_id: string
  chart_type: string
  title: string
  spec: {
    labels?: string[]
    values?: number[]
    unit?: string
    [key: string]: unknown
  }
  notes: string
}

export interface BackendMajorConclusionItem {
  conclusion_id: string
  content: string
  conclusion_type: 'fact' | 'estimate' | 'inference' | string
  basis_refs: string[]
  confidence: number
}

export interface BackendReport {
  summary: string
  assumptions: string[]
  recommendations: string[]
  open_questions: string[]
  chart_refs: string[]
}

export interface BackendSessionEvent {
  timestamp: string
  kind: string
  payload: Record<string, unknown>
}

export interface BackendSession {
  session_id: string
  owner_client_id: string
  mode: 'single_decision' | 'multi_option'
  problem_statement: string
  status:
    | 'INIT'
    | 'CLARIFYING'
    | 'ANALYZING'
    | 'READY_FOR_REPORT'
    | 'REPORTING'
    | 'COMPLETED'
    | 'FAILED'
  clarification_questions: BackendClarificationQuestion[]
  answers: BackendUserAnswer[]
  search_tasks: BackendSearchTask[]
  calculation_tasks: BackendCalculationTask[]
  evidence_items: BackendEvidenceItem[]
  chart_artifacts: BackendChartArtifact[]
  major_conclusions: BackendMajorConclusionItem[]
  report: BackendReport | null
  events: BackendSessionEvent[]
  created_at: string
  updated_at: string
}

export interface BackendSessionStepResponse {
  session_id: string
  status: BackendSession['status']
  next_action: 'ask_user' | 'run_mcp' | 'preview_report' | 'complete'
  prompt_to_user: string
  pending_questions: BackendClarificationQuestion[]
  pending_search_tasks: BackendSearchTask[]
  evidence_items: BackendEvidenceItem[]
  major_conclusions: BackendMajorConclusionItem[]
  report_preview: BackendReport | null
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isChineseLocale() {
  return i18n.language.startsWith('zh')
}

function loadTrackedSessionIds() {
  if (!isBrowser()) {
    return [] as string[]
  }

  try {
    const raw = window.localStorage.getItem(BACKEND_SESSION_INDEX_KEY)
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : []
  } catch {
    return []
  }
}

function persistTrackedSessionIds(sessionIds: string[]) {
  if (!isBrowser()) {
    return
  }

  window.localStorage.setItem(BACKEND_SESSION_INDEX_KEY, JSON.stringify(sessionIds))
}

export function rememberTrackedSession(sessionId: string) {
  const next = Array.from(new Set([sessionId, ...loadTrackedSessionIds()]))
  persistTrackedSessionIds(next)
}

export function getTrackedSessionIds() {
  return loadTrackedSessionIds()
}

export function createBackendPseudoUser(): User {
  const isZh = isChineseLocale()

  return {
    id: 'backend-anonymous',
    name: isZh ? '访客用户' : 'Backend Visitor',
    email: 'cookie-session@genius-actuary.local',
    title: isZh ? '匿名分析会话' : 'Anonymous analysis session',
    locale: 'zh',
    roles: ['analyst'],
    lastActiveAt: new Date().toISOString(),
  }
}

export function mapBackendMode(mode: BackendSession['mode'] | string): AnalysisMode {
  return mode === 'multi_option' ? 'multi-option' : 'single-option'
}

export function mapModeDefinitions(bootstrap: BackendBootstrapResponse): ModeDefinition[] {
  const isZh = isChineseLocale()
  const notesSummary = bootstrap.notes.join(' ')

  return bootstrap.supported_modes.map((mode) => {
    const id = mapBackendMode(mode)
    return {
      id,
      title: id === 'single-option' ? (isZh ? '单项成本 / 风险分析' : 'Single option cost / risk') : isZh ? '多选项决策参考' : 'Multi-option decision reference',
      subtitle:
        id === 'single-option'
          ? isZh
            ? '由后端驱动的单方案分析流程'
            : 'Backend-guided single decision analysis'
          : isZh
            ? '由后端驱动的多方案比较工作台'
            : 'Backend-guided option comparison workspace',
      description:
        id === 'single-option'
          ? isZh
            ? `后端会先澄清目标、约束与不确定性，再进入分析流程。${notesSummary}`
            : `The backend will clarify goals, constraints, and uncertainty before running the analysis loop. ${notesSummary}`
          : isZh
            ? `以后端主导的追问、证据搜集与报告生成来比较多个方案。${notesSummary}`
            : `Compare multiple options with backend-owned clarification, evidence gathering, and report composition. ${notesSummary}`,
      valueLens:
        id === 'single-option'
          ? isZh
            ? ['成本', '风险', '约束', '假设']
            : ['Cost', 'Risk', 'Constraints', 'Assumptions']
          : isZh
            ? ['方案对比', '权衡取舍', '偏好匹配', '证据支撑']
            : ['Comparison', 'Trade-offs', 'Preference fit', 'Evidence'],
      icon: id === 'single-option' ? 'sparkles' : 'git-compare',
    }
  })
}

export function mapBackendQuestion(question: BackendClarificationQuestion): ClarificationQuestion {
  return {
    id: question.question_id,
    sessionId: '',
    question: question.question_text,
    purpose: question.purpose,
    fieldType: question.options.length ? 'single-choice' : 'textarea',
    options: question.options.map((option) => ({
      value: option,
      label: option,
    })),
    allowCustomInput: question.allow_custom_input,
    allowSkip: question.allow_skip,
    priority: question.priority,
    recommended: [],
  }
}

function mapLastInsight(session: BackendSession) {
  const isZh = isChineseLocale()
  const latestConclusion = session.major_conclusions.at(-1)?.content
  const latestEvent = session.events.at(-1)?.kind

  return latestConclusion ?? session.report?.summary ?? latestEvent ?? (isZh ? '后端会话已同步。' : 'Backend session synced.')
}

function mapChartKind(chartType: string): ChartArtifact['kind'] {
  switch (chartType) {
    case 'line':
    case 'bar':
    case 'scatter':
    case 'radar':
    case 'heatmap':
    case 'pie':
      return chartType
    default:
      return 'bar'
  }
}

export function mapBackendChart(chart: BackendChartArtifact, sessionId: string): ChartArtifact {
  const isZh = isChineseLocale()
  const labels = chart.spec.labels ?? []
  const values = chart.spec.values ?? []
  const kind = mapChartKind(chart.chart_type)
  const pairedSeries = labels.map((label, index) => ({
    label,
    value: Number(values[index] ?? 0),
    group: isZh ? '当前' : 'Current',
    nature: 'estimated' as const,
    intensity: 0.7,
  }))

  return {
    id: chart.chart_id,
    sessionId,
    kind,
    title: chart.title,
    unit: typeof chart.spec.unit === 'string' ? chart.spec.unit : undefined,
    note: chart.notes,
    source: isZh ? '后端预览图表' : 'Backend preview artifact',
    compareSeries: kind === 'bar' || kind === 'pie' ? pairedSeries : undefined,
    lineSeries: kind === 'line' ? pairedSeries : undefined,
    scatterSeries:
      kind === 'scatter'
        ? pairedSeries.map((item, index) => ({
            ...item,
            group: String(index + 1),
          }))
        : undefined,
    radarSeries:
      kind === 'radar'
        ? [
            {
              name: isZh ? '后端维度' : 'Backend dimensions',
              values: pairedSeries.map((item) => ({
                dimension: item.label,
                value: Math.max(1, Math.min(10, item.value)),
              })),
            },
          ]
        : undefined,
    heatmapSeries:
      kind === 'heatmap'
        ? pairedSeries.map((item, index) => ({
            x: item.label,
            y: isZh ? `第 ${index + 1} 行` : `Row ${index + 1}`,
            value: item.value,
            nature: 'estimated',
          }))
        : undefined,
  }
}

export function mapBackendSession(session: BackendSession): AnalysisSession {
  return {
    id: session.session_id,
    mode: mapBackendMode(session.mode),
    problemStatement: session.problem_statement,
    status: session.status,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
    lastInsight: mapLastInsight(session),
    questions: session.clarification_questions.map((question) => ({
      ...mapBackendQuestion(question),
      sessionId: session.session_id,
    })),
    answers: session.answers.map((answer) => ({
      id: `${answer.question_id}-${answer.answered_at ?? 'backend'}`,
      questionId: answer.question_id,
      answerStatus: 'answered',
      selectedOptions: [answer.value],
      customInput: undefined,
      numericValue: Number.isFinite(Number(answer.value)) ? Number(answer.value) : undefined,
    })),
    searchTasks: session.search_tasks.map((task) => ({
      id: task.task_id,
      sessionId: session.session_id,
      topic: task.search_topic,
      goal: task.search_goal,
      scope: task.search_scope,
      suggestedQueries: task.suggested_queries,
      requiredFields: task.required_fields,
      freshnessRequirement: task.freshness_requirement === 'high' ? 'high' : 'standard',
      status:
        task.status === 'running' || task.status === 'completed'
          ? task.status
          : 'pending',
    })),
    evidence: session.evidence_items.map((item) => ({
      id: item.evidence_id,
      sessionId: session.session_id,
      sourceType: 'web',
      sourceUrl: item.source_url,
      sourceName: item.source_name,
      title: item.title,
      summary: item.summary,
      extractedFacts: item.extracted_facts,
      fetchedAt: item.fetched_at,
      confidence: item.confidence,
    })),
    conclusions: session.major_conclusions.map((item) => ({
      id: item.conclusion_id,
      sessionId: session.session_id,
      conclusion: item.content,
      conclusionType:
        item.conclusion_type === 'fact' || item.conclusion_type === 'estimate' || item.conclusion_type === 'inference'
          ? item.conclusion_type
          : 'inference',
      basisRefs: item.basis_refs,
      confidence: item.confidence,
      createdAt: session.updated_at,
    })),
    calculations: session.calculation_tasks.map((task) => ({
      id: task.task_id,
      sessionId: session.session_id,
      taskType: task.objective,
      formulaExpression: task.formula_hint,
      inputParams: task.input_params as Record<string, string | number>,
      units: task.status,
      result: task.status === 'completed' ? (isChineseLocale() ? '后端已完成计算' : 'Completed on backend') : isChineseLocale() ? '等待后端计算' : 'Pending backend calculation',
      createdAt: session.updated_at,
    })),
  }
}

function buildReportMarkdown(session: BackendSession) {
  const isZh = isChineseLocale()
  const report = session.report

  if (!report) {
    return [
      isZh ? '# 后端报告待生成' : '# Backend report pending',
      '',
      isZh ? '后端会话暂未产出最终报告。' : 'The backend session has not produced a final report yet.',
      '',
      isZh ? '## 当前证据' : '## Current evidence',
      ...(session.evidence_items.length
        ? session.evidence_items.map((item) => `- ${item.title}: ${item.summary}`)
        : [isZh ? '- 暂无可用证据。' : '- No evidence items available yet.']),
    ].join('\n')
  }

  return [
    `# ${session.problem_statement}`,
    '',
    report.summary,
    '',
    isZh ? '## 建议' : '## Recommendations',
    ...(report.recommendations.length
      ? report.recommendations.map((item) => `- ${item}`)
      : [isZh ? '- 暂无建议。' : '- No recommendations returned.']),
    '',
    isZh ? '## 假设' : '## Assumptions',
    ...(report.assumptions.length
      ? report.assumptions.map((item) => `- ${item}`)
      : [isZh ? '- 未返回明确假设。' : '- No explicit assumptions returned.']),
    '',
    isZh ? '## 待确认问题' : '## Open Questions',
    ...(report.open_questions.length
      ? report.open_questions.map((item) => `- ${item}`)
      : [isZh ? '- 暂无未决问题。' : '- No open questions remain.']),
  ].join('\n')
}

export function mapBackendReport(session: BackendSession): AnalysisReport {
  const isZh = isChineseLocale()

  return {
    id: `report-${session.session_id}`,
    sessionId: session.session_id,
    mode: mapBackendMode(session.mode),
    summaryTitle: session.problem_statement,
    markdown: buildReportMarkdown(session),
    highlights: [
      {
        id: 'backend-status',
        label: isZh ? '后端状态' : 'Backend status',
        value: session.status,
        detail: isZh ? '这里显示 FastAPI 编排器的真实当前状态。' : 'This card reflects the real FastAPI orchestrator state.',
      },
      {
        id: 'answers-count',
        label: isZh ? '已记录回答' : 'Answers captured',
        value: String(session.answers.length),
        detail: isZh ? '后端已收集到的追问回答数量。' : 'Clarification responses recorded by the backend.',
      },
      {
        id: 'evidence-count',
        label: isZh ? '证据条目' : 'Evidence items',
        value: String(session.evidence_items.length),
        detail: isZh ? '后端搜索适配层当前产出的证据数量。' : 'Evidence generated by the backend search adapter.',
      },
      {
        id: 'chart-count',
        label: isZh ? '图表产物' : 'Chart artifacts',
        value: String(session.chart_artifacts.length),
        detail: isZh ? '后端图表适配层返回的预览图表数量。' : 'Preview artifacts returned by the backend chart adapter.',
      },
    ],
    calculations: mapBackendSession(session).calculations,
    charts: session.chart_artifacts.map((item) => mapBackendChart(item, session.session_id)),
    evidence: mapBackendSession(session).evidence,
    assumptions:
      session.report?.assumptions ??
      [isZh ? '当前后端仍在使用 mock 版分析、搜索与图表适配器。' : 'The current backend still uses mock MCP adapters for analysis, search, and chart generation.'],
    disclaimers: [
      isZh
        ? '当前后端运行的是带 mock 分析、搜索和图表适配器的 FastAPI MVP 骨架。'
        : 'This backend currently runs a FastAPI MVP skeleton with mock analysis/search/chart adapters.',
      isZh
        ? '仓库中未发现可供前端直接使用的后端 API Key，当前通过 HTTP-only Cookie 隔离会话。'
        : 'No backend API key was found in the repository; web sessions are isolated via an HTTP-only cookie.',
    ],
  }
}

function progressCursor(status: BackendSession['status']) {
  switch (status) {
    case 'INIT':
      return 0
    case 'CLARIFYING':
      return 1
    case 'ANALYZING':
      return 2
    case 'READY_FOR_REPORT':
    case 'REPORTING':
      return 3
    case 'COMPLETED':
      return 4
    case 'FAILED':
      return 4
    default:
      return 0
  }
}

export function mapBackendProgress(session: BackendSession, step?: BackendSessionStepResponse): AnalysisProgress {
  const isZh = isChineseLocale()
  const stages = [
    {
      id: 'clarify',
      title: isZh ? '澄清决策背景' : 'Clarify decision context',
      description: isZh ? '收集目标、约束与高价值缺失信息。' : 'Collecting goals, constraints, and missing high-value facts.',
    },
    {
      id: 'plan',
      title: isZh ? '规划 MCP 轮次' : 'Plan MCP round',
      description: isZh ? '在后端准备搜索任务与首轮结论。' : 'Preparing search tasks and first-pass conclusions on the backend.',
    },
    {
      id: 'evidence',
      title: isZh ? '收集证据' : 'Gather evidence',
      description: isZh ? '执行后端搜索适配器并生成预览图表。' : 'Executing the backend search adapter and composing preview artifacts.',
    },
    {
      id: 'report',
      title: isZh ? '生成报告' : 'Assemble report',
      description: isZh ? '构建最终摘要、建议与图表引用。' : 'Building the final report summary, recommendations, and chart references.',
    },
  ]

  const cursor = progressCursor(step?.status ?? session.status)

  return {
    sessionId: session.session_id,
    status: step?.status ?? session.status,
    overallProgress: Math.round((cursor / stages.length) * 100),
    currentStepLabel: step?.prompt_to_user ?? mapLastInsight(session),
    stages: stages.map((stage, index) => ({
      ...stage,
      status:
        index + 1 < cursor
          ? 'completed'
          : index + 1 === cursor
            ? (step?.status ?? session.status) === 'COMPLETED'
              ? 'completed'
              : 'active'
            : 'pending',
    })),
  }
}

export function toBackendAnswers(answers: UserAnswer[]): BackendUserAnswer[] {
  return answers.map((answer) => {
    const joinedOptions = answer.selectedOptions?.filter(Boolean).join(', ')
    const value =
      joinedOptions ||
      answer.customInput ||
      (typeof answer.numericValue === 'number' && Number.isFinite(answer.numericValue)
        ? String(answer.numericValue)
        : '') ||
      answer.answerStatus

    return {
      question_id: answer.questionId,
      value,
      source: 'frontend',
      answered_at: new Date().toISOString(),
    }
  })
}

export function backendSessionToResourceRecord(session: AnalysisSession): ResourceRecord {
  return {
    id: session.id,
    title: session.problemStatement,
    subtitle: session.mode,
    status: session.status,
    updatedAt: session.updatedAt,
    createdAt: session.createdAt,
  }
}
