import type {
  AnalysisMode,
  AnalysisProgress,
  AnalysisReport,
  AnalysisSession,
  AuditLogEntry,
  ChartArtifact,
  ClarificationQuestion,
  ModeDefinition,
  ResourceRecord,
  User,
  UserAnswer,
} from '@/types'
import { createBrowserBoundUser } from '@/lib/auth/browser-account'
import { i18n } from '@/lib/i18n'

export const COOKIE_SESSION_TOKEN = 'backend-cookie-session'

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
  unit?: string
  result_value?: number | null
  result_text?: string
  result_payload?: Record<string, unknown>
  error_margin?: string
  notes?: string
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
    categories?: string[]
    labels?: string[]
    values?: number[]
    radar_indicators?: string[]
    series?: Array<{
      name?: string
      data?: number[]
    }>
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
  analysis_rounds_completed: number
  follow_up_round_limit: number
  follow_up_rounds_used: number
  follow_up_extensions_used: number
  follow_up_budget_exhausted: boolean
  deferred_follow_up_question_count: number
  activity_status: string
  current_focus: string
  last_stop_reason: string
  error_message?: string | null
  events: BackendSessionEvent[]
  created_at: string
  updated_at: string
}

export interface BackendSessionStepResponse {
  session_id: string
  status: BackendSession['status']
  next_action: 'ask_user' | 'run_mcp' | 'preview_report' | 'complete'
  prompt_to_user: string
  analysis_rounds_completed?: number
  activity_status?: string
  current_focus?: string
  last_stop_reason?: string
  error_message?: string | null
  pending_questions: BackendClarificationQuestion[]
  pending_search_tasks: BackendSearchTask[]
  pending_calculation_tasks?: BackendCalculationTask[]
  pending_chart_tasks?: Array<Record<string, unknown>>
  evidence_items: BackendEvidenceItem[]
  major_conclusions: BackendMajorConclusionItem[]
  report_preview: BackendReport | null
}

export interface BackendRequestMoreFollowUpResponse {
  session: BackendSession
  step: BackendSessionStepResponse
}

export interface BackendPersonalDataDeletionResponse {
  deleted_session_count: number
}

export interface BackendAuditLogEntry {
  log_id: string
  action: string
  actor: string
  target: string
  ip_address: string
  created_at: string
  status: 'success' | 'warning' | 'error'
  summary: string
  metadata: Record<string, string>
}

export interface BackendAuditLogListResponse {
  logs: BackendAuditLogEntry[]
}

export interface BackendDebugAuthStatusResponse {
  username: string
  role: string
}

export interface BackendDebugSessionSummary {
  session_id: string
  owner_client_id: string
  mode: BackendSession['mode']
  problem_statement: string
  status: BackendSession['status']
  event_count: number
  answer_count: number
  evidence_count: number
  search_task_count: number
  created_at: string
  updated_at: string
}

export interface BackendDebugSessionListResponse {
  sessions: BackendDebugSessionSummary[]
}

export interface DebugSessionSummary {
  id: string
  ownerClientId: string
  mode: BackendSession['mode']
  problemStatement: string
  status: BackendSession['status']
  eventCount: number
  answerCount: number
  evidenceCount: number
  searchTaskCount: number
  createdAt: string
  updatedAt: string
}

export interface DebugSessionDetail {
  summary: DebugSessionSummary
  session: BackendSession
}

function isChineseLocale() {
  return i18n.language.startsWith('zh')
}

export function createBackendPseudoUser(): User {
  return createBrowserBoundUser()
}

export function mapBackendMode(
  mode: BackendSession['mode'] | string,
): AnalysisMode {
  return mode === 'multi_option' ? 'multi-option' : 'single-option'
}

export function mapModeDefinitions(
  bootstrap: BackendBootstrapResponse,
): ModeDefinition[] {
  const isZh = isChineseLocale()
  const notesSummary = bootstrap.notes.join(' ')

  return bootstrap.supported_modes.map((mode) => {
    const id = mapBackendMode(mode)
    return {
      id,
      title:
        id === 'single-option'
          ? isZh
            ? '单项成本 / 风险分析'
            : 'Single option cost / risk'
          : isZh
            ? '多选项决策参考'
            : 'Multi-option decision reference',
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

export function mapBackendQuestion(
  question: BackendClarificationQuestion,
): ClarificationQuestion {
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
    allowCustomInput: true,
    allowSkip: question.allow_skip,
    priority: question.priority,
    recommended: [],
    answered: question.answered,
  }
}

function mapLastInsight(session: BackendSession) {
  const isZh = isChineseLocale()
  const latestConclusion = session.major_conclusions.at(-1)?.content
  const latestEvent = session.events.at(-1)?.kind

  return (
    latestConclusion ??
    session.report?.summary ??
    latestEvent ??
    (isZh ? '后端会话已同步。' : 'Backend session synced.')
  )
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

function coerceStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => String(item).trim())
    .filter(Boolean)
}

function coerceNumberArray(value: unknown) {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
}

function buildFallbackCategories(values: number[]) {
  return values.map((_, index) => `#${index + 1}`)
}

export function mapBackendChart(
  chart: BackendChartArtifact,
  sessionId: string,
): ChartArtifact {
  const isZh = isChineseLocale()
  const kind = mapChartKind(chart.chart_type)
  const categories = coerceStringArray(chart.spec.categories ?? chart.spec.labels)
  const fallbackValues = coerceNumberArray(chart.spec.values)
  const resolvedCategories =
    categories.length || !fallbackValues.length
      ? categories
      : buildFallbackCategories(fallbackValues)
  const backendSeries = Array.isArray(chart.spec.series) ? chart.spec.series : []
  const normalizedSeries = backendSeries
    .map((series, index) => ({
      name:
        typeof series?.name === 'string' && series.name.trim()
          ? series.name.trim()
          : `${isZh ? '序列' : 'Series'} ${index + 1}`,
      data: coerceNumberArray(series?.data),
    }))
    .filter((series) => series.data.length > 0)
  const pairedSeries =
    normalizedSeries.length > 0
      ? normalizedSeries.flatMap((series) =>
          (resolvedCategories.length
            ? resolvedCategories
            : buildFallbackCategories(series.data)
          ).map((label, index) => ({
            label,
            value: Number(series.data[index] ?? 0),
            group: series.name,
            nature: 'actual' as const,
            intensity: 0.7,
          })),
        )
      : (resolvedCategories.length
          ? resolvedCategories
          : buildFallbackCategories(fallbackValues)
        ).map((label, index) => ({
          label,
          value: Number(fallbackValues[index] ?? 0),
          group: isZh ? '当前' : 'Current',
          nature: 'actual' as const,
          intensity: 0.7,
        }))
  const lineSeries =
    kind === 'line'
      ? pairedSeries.filter(
          (item) =>
            item.group ===
            (normalizedSeries[0]?.name ?? (isZh ? '当前' : 'Current')),
        )
      : undefined
  const radarIndicators = coerceStringArray(
    chart.spec.radar_indicators ?? chart.spec.categories ?? chart.spec.labels,
  )
  const resolvedRadarIndicators =
    radarIndicators.length || !pairedSeries.length
      ? radarIndicators
      : pairedSeries.map((item) => item.label)
  const radarSeries =
    kind === 'radar'
      ? (normalizedSeries.length
          ? normalizedSeries
          : [{ name: chart.title, data: fallbackValues }]
        ).map((series) => ({
          name: series.name,
          values: resolvedRadarIndicators.map((dimension, index) => ({
            dimension,
            value: Math.max(0, Math.min(10, Number(series.data[index] ?? 0))),
          })),
        }))
      : undefined

  return {
    id: chart.chart_id,
    sessionId,
    kind,
    title: chart.title,
    unit: typeof chart.spec.unit === 'string' ? chart.spec.unit : undefined,
    note: chart.notes,
    source: isZh ? '后端图表 MCP' : 'Backend chart MCP',
    compareSeries: kind === 'bar' || kind === 'pie' ? pairedSeries : undefined,
    lineSeries,
    scatterSeries:
      kind === 'scatter'
        ? pairedSeries.map((item, index) => ({
            ...item,
            group: String(index + 1),
          }))
        : undefined,
    radarSeries,
    heatmapSeries:
      kind === 'heatmap'
        ? pairedSeries.map((item, index) => ({
            x: item.label,
            y: isZh ? `第 ${index + 1} 行` : `Row ${index + 1}`,
            value: item.value,
            nature: 'actual',
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
    errorMessage: session.error_message ?? undefined,
    followUpRoundLimit: session.follow_up_round_limit,
    followUpRoundsUsed: session.follow_up_rounds_used,
    followUpExtensionsUsed: session.follow_up_extensions_used,
    followUpBudgetExhausted: session.follow_up_budget_exhausted,
    deferredFollowUpQuestionCount: session.deferred_follow_up_question_count,
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
      numericValue: Number.isFinite(Number(answer.value))
        ? Number(answer.value)
        : undefined,
    })),
    searchTasks: session.search_tasks.map((task) => ({
      id: task.task_id,
      sessionId: session.session_id,
      topic: task.search_topic,
      goal: task.search_goal,
      scope: task.search_scope,
      suggestedQueries: task.suggested_queries,
      requiredFields: task.required_fields,
      freshnessRequirement:
        task.freshness_requirement === 'high' ? 'high' : 'standard',
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
        item.conclusion_type === 'fact' ||
        item.conclusion_type === 'estimate' ||
        item.conclusion_type === 'inference'
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
      units: task.unit ?? '',
      result:
        task.result_text?.trim() ||
        (typeof task.result_value === 'number' &&
        Number.isFinite(task.result_value)
          ? String(task.result_value)
          : task.status === 'completed'
            ? isChineseLocale()
              ? '后端已完成计算'
              : 'Completed on backend'
            : task.status === 'failed'
              ? isChineseLocale()
                ? '计算失败'
                : 'Calculation failed'
              : isChineseLocale()
                ? '等待后端计算'
                : 'Pending backend calculation'),
      errorMargin: task.error_margin || undefined,
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
      isZh
        ? '后端会话暂未产出最终报告。'
        : 'The backend session has not produced a final report yet.',
      '',
      isZh ? '## 当前证据' : '## Current evidence',
      ...(session.evidence_items.length
        ? session.evidence_items.map(
            (item) => `- ${item.title}: ${item.summary}`,
          )
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
        detail: isZh
          ? '这里显示 FastAPI 编排器的真实当前状态。'
          : 'This card reflects the real FastAPI orchestrator state.',
      },
      {
        id: 'answers-count',
        label: isZh ? '已记录回答' : 'Answers captured',
        value: String(session.answers.length),
        detail: isZh
          ? '后端已收集到的追问回答数量。'
          : 'Clarification responses recorded by the backend.',
      },
      {
        id: 'evidence-count',
        label: isZh ? '证据条目' : 'Evidence items',
        value: String(session.evidence_items.length),
        detail: isZh
          ? '后端搜索适配层当前产出的证据数量。'
          : 'Evidence generated by the backend search adapter.',
      },
      {
        id: 'chart-count',
        label: isZh ? '图表产物' : 'Chart artifacts',
        value: String(session.chart_artifacts.length),
        detail: isZh
          ? '后端图表适配层返回的预览图表数量。'
          : 'Preview artifacts returned by the backend chart adapter.',
      },
    ],
    calculations: mapBackendSession(session).calculations,
    charts: session.chart_artifacts.map((item) =>
      mapBackendChart(item, session.session_id),
    ),
    evidence: mapBackendSession(session).evidence,
    assumptions: session.report?.assumptions ?? [
      isZh
        ? '当前结果依赖后端已收集到的用户输入、证据与结构化计算任务。'
        : 'The current result depends on the user inputs, evidence, and structured calculation tasks collected by the backend.',
    ],
    disclaimers: [
      isZh
        ? '数值结果只对输入参数本身负责；如果输入是假设值、估算值或过期值，结论也会随之偏移。'
        : 'Numeric outputs are only as reliable as their inputs; assumed, estimated, or stale parameters will propagate into the result.',
      isZh
        ? '图表用于帮助理解趋势和权衡，不应替代对原始参数、公式和证据来源的复核。'
        : 'Charts are explanatory aids for trends and trade-offs and should not replace review of the underlying parameters, formulas, and evidence sources.',
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

export function mapBackendProgress(
  session: BackendSession,
  step?: BackendSessionStepResponse,
): AnalysisProgress {
  const isZh = isChineseLocale()
  const stages = [
    {
      id: 'clarify',
      title: isZh ? '澄清决策背景' : 'Clarify decision context',
      description: isZh
        ? '收集目标、约束与高价值缺失信息。'
        : 'Collecting goals, constraints, and missing high-value facts.',
    },
    {
      id: 'plan',
      title: isZh ? '规划 MCP 轮次' : 'Plan MCP round',
      description: isZh
        ? '在后端准备搜索、计算、绘图任务与首轮结论。'
        : 'Preparing search, calculation, chart tasks, and first-pass conclusions on the backend.',
    },
    {
      id: 'evidence',
      title: isZh ? '收集证据' : 'Gather evidence',
      description: isZh
        ? '执行后端搜索、计算与图表适配器，并回注结构化结果。'
        : 'Executing the backend search, calculation, and chart adapters and injecting structured results.',
    },
    {
      id: 'report',
      title: isZh ? '生成报告' : 'Assemble report',
      description: isZh
        ? '构建最终摘要、建议与图表引用。'
        : 'Building the final report summary, recommendations, and chart references.',
    },
  ]

  const cursor = progressCursor(step?.status ?? session.status)

  return {
    sessionId: session.session_id,
    status: step?.status ?? session.status,
    overallProgress: Math.round((cursor / stages.length) * 100),
    currentStepLabel: step?.prompt_to_user ?? mapLastInsight(session),
    errorMessage: step?.error_message ?? session.error_message ?? undefined,
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

export function mapDebugSessionSummary(
  session: BackendDebugSessionSummary,
): DebugSessionSummary {
  return {
    id: session.session_id,
    ownerClientId: session.owner_client_id,
    mode: session.mode,
    problemStatement: session.problem_statement,
    status: session.status,
    eventCount: session.event_count,
    answerCount: session.answer_count,
    evidenceCount: session.evidence_count,
    searchTaskCount: session.search_task_count,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  }
}

export function mapAuditLogEntry(entry: BackendAuditLogEntry): AuditLogEntry {
  return {
    id: entry.log_id,
    action: entry.action,
    actor: entry.actor,
    target: entry.target,
    ipAddress: entry.ip_address,
    createdAt: entry.created_at,
    status: entry.status,
    summary: entry.summary,
    metadata: entry.metadata,
  }
}

export function toBackendAnswers(answers: UserAnswer[]): BackendUserAnswer[] {
  return answers.map((answer) => {
    const joinedOptions = answer.selectedOptions?.filter(Boolean).join(', ')
    const value =
      joinedOptions ||
      answer.customInput ||
      (typeof answer.numericValue === 'number' &&
      Number.isFinite(answer.numericValue)
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

export function backendSessionToResourceRecord(
  session: AnalysisSession,
): ResourceRecord {
  return {
    id: session.id,
    title: session.problemStatement,
    subtitle: session.mode,
    status: session.status,
    updatedAt: session.updatedAt,
    createdAt: session.createdAt,
  }
}
