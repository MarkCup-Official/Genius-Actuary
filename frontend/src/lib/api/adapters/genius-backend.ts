import type {
  AnalysisMode,
  AnalysisProgress,
  AnalysisReport,
  AnalysisSession,
  AuditLogEntry,
  BudgetLineItem,
  BudgetSummary,
  CalculationTask,
  ChartArtifact,
  ChartTask,
  ClarificationQuestion,
  ModeDefinition,
  OptionProfile,
  ReportTable,
  ResourceRecord,
  SearchTask,
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
  question_group?: string
  input_hint?: string
  example_answer?: string
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
  task_group?: string
  notes?: string
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

export interface BackendChartTask {
  task_id: string
  objective: string
  chart_type: string
  title: string
  preferred_unit?: string
  source_task_ids?: string[]
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

export interface BackendBudgetSummary {
  currency: string
  total_cost_low: number
  total_cost_base: number
  total_cost_high: number
  total_income_low: number
  total_income_base: number
  total_income_high: number
  net_low: number
  net_base: number
  net_high: number
  reserve_note?: string
}

export interface BackendBudgetLineItem {
  line_item_id: string
  name: string
  category: string
  item_type: string
  low: number
  base: number
  high: number
  currency: string
  rationale?: string
  basis_refs?: string[]
  confidence?: number
}

export interface BackendOptionProfile {
  option_id: string
  name: string
  summary?: string
  pros?: string[]
  cons?: string[]
  conditions?: string[]
  fit_for?: string[]
  caution_flags?: string[]
  estimated_cost_low?: number | null
  estimated_cost_base?: number | null
  estimated_cost_high?: number | null
  currency?: string
  score?: number | null
  confidence?: number
  basis_refs?: string[]
}

export interface BackendReportTable {
  table_id: string
  title: string
  columns: string[]
  rows: Array<Record<string, unknown>>
  notes?: string
}

export interface BackendReport {
  summary: string
  assumptions: string[]
  recommendations: string[]
  open_questions: string[]
  chart_refs: string[]
  markdown?: string
  budget_summary?: BackendBudgetSummary | null
  budget_items?: BackendBudgetLineItem[]
  option_profiles?: BackendOptionProfile[]
  tables?: BackendReportTable[]
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
  chart_tasks: BackendChartTask[]
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
  pending_chart_tasks?: BackendChartTask[]
  evidence_items: BackendEvidenceItem[]
  chart_artifacts?: BackendChartArtifact[]
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

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.map((item) => String(item).trim()).filter(Boolean)
}

function numberList(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item))
}

function buildFallbackLabels(values: number[]) {
  return values.map((_, index) => `#${index + 1}`)
}

function normalizeActivityLabel(activityStatus?: string) {
  const isZh = isChineseLocale()
  const mapping: Record<string, string> = {
    idle: isZh ? '等待启动' : 'Idle',
    waiting_for_user_clarification_answers: isZh
      ? '等待用户回答问题'
      : 'Waiting for answers',
    searching_web_for_evidence: isZh ? '搜索网页中' : 'Searching the web',
    running_deterministic_calculations: isZh
      ? '执行预算或对比计算'
      : 'Running calculations',
    preparing_visualizations: isZh ? '生成图表中' : 'Preparing charts',
    searching_and_synthesizing: isZh ? '搜索并综合证据中' : 'Searching and synthesizing',
    running_analysis_pipeline: isZh ? '分析思考中' : 'Running analysis',
    analyzing: isZh ? '分析思考中' : 'Analyzing',
    completed: isZh ? '分析完成' : 'Completed',
    failed: isZh ? '分析失败' : 'Failed',
  }

  if (!activityStatus) {
    return isZh ? '等待系统推进' : 'Waiting for orchestration'
  }

  return mapping[activityStatus] ?? activityStatus.replaceAll('_', ' ')
}

function resolveFieldType(
  question: BackendClarificationQuestion,
): ClarificationQuestion['fieldType'] {
  if (question.options.length) {
    return 'single-choice'
  }

  return 'textarea'
}

function mapBackendQuestion(
  question: BackendClarificationQuestion,
): ClarificationQuestion {
  return {
    id: question.question_id,
    sessionId: '',
    question: question.question_text,
    purpose: question.purpose,
    questionGroup: question.question_group ?? '',
    inputHint: question.input_hint ?? '',
    exampleAnswer: question.example_answer ?? '',
    fieldType: resolveFieldType(question),
    options: question.options.map((option) => ({
      value: option,
      label: option,
    })),
    allowCustomInput: question.allow_custom_input,
    allowSkip: question.allow_skip,
    priority: question.priority,
    recommended: [],
    answered: question.answered,
  }
}

function mapBackendSearchTask(task: BackendSearchTask, sessionId: string): SearchTask {
  return {
    id: task.task_id,
    sessionId,
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
    taskGroup: task.task_group ?? '',
    notes: task.notes ?? '',
  }
}

function mapBackendCalculationTask(
  task: BackendCalculationTask,
  sessionId: string,
  fallbackCreatedAt: string,
): CalculationTask {
  const result =
    task.result_text?.trim() ||
    (typeof task.result_value === 'number' && Number.isFinite(task.result_value)
      ? String(task.result_value)
      : task.status === 'completed'
        ? isChineseLocale()
          ? '已完成计算'
          : 'Completed'
        : task.status === 'failed'
          ? isChineseLocale()
            ? '计算失败'
            : 'Failed'
          : isChineseLocale()
            ? '等待计算'
            : 'Pending')

  return {
    id: task.task_id,
    sessionId,
    taskType: task.objective,
    formulaExpression: task.formula_hint,
    inputParams: Object.fromEntries(
      Object.entries(task.input_params ?? {}).map(([key, value]) => {
        if (typeof value === 'number') {
          return [key, value]
        }

        return [key, String(value)]
      }),
    ),
    units: task.unit ?? '',
    result,
    errorMargin: task.error_margin ?? undefined,
    notes: task.notes ?? undefined,
    status: task.status,
    createdAt: fallbackCreatedAt,
  }
}

function mapBackendChartTask(task: BackendChartTask, sessionId: string): ChartTask {
  return {
    id: task.task_id,
    sessionId,
    objective: task.objective,
    chartType: mapChartKind(task.chart_type),
    title: task.title,
    preferredUnit: task.preferred_unit,
    sourceTaskIds: task.source_task_ids ?? [],
    notes: task.notes ?? '',
    status:
      task.status === 'running' ||
      task.status === 'completed' ||
      task.status === 'failed'
        ? task.status
        : 'pending',
  }
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

export function mapBackendChart(
  chart: BackendChartArtifact,
  sessionId: string,
): ChartArtifact {
  const isZh = isChineseLocale()
  const kind = mapChartKind(chart.chart_type)
  const fallbackValues = numberList(chart.spec.values)
  const categories = stringList(chart.spec.categories ?? chart.spec.labels)
  const resolvedCategories =
    categories.length || !fallbackValues.length
      ? categories
      : buildFallbackLabels(fallbackValues)
  const backendSeries = Array.isArray(chart.spec.series) ? chart.spec.series : []
  const normalizedSeries = backendSeries
    .map((series, index) => ({
      name:
        typeof series?.name === 'string' && series.name.trim()
          ? series.name.trim()
          : `${isZh ? '序列' : 'Series'} ${index + 1}`,
      data: numberList(series?.data),
    }))
    .filter((series) => series.data.length > 0)

  const compareSeries =
    normalizedSeries.length > 0
      ? normalizedSeries.flatMap((series) =>
          (resolvedCategories.length
            ? resolvedCategories
            : buildFallbackLabels(series.data)
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
          : buildFallbackLabels(fallbackValues)
        ).map((label, index) => ({
          label,
          value: Number(fallbackValues[index] ?? 0),
          group: isZh ? '当前' : 'Current',
          nature: 'actual' as const,
          intensity: 0.7,
        }))

  const radarIndicators = stringList(
    chart.spec.radar_indicators ?? chart.spec.categories ?? chart.spec.labels,
  )
  const resolvedRadarIndicators =
    radarIndicators.length || !compareSeries.length
      ? radarIndicators
      : compareSeries.map((item) => item.label)

  return {
    id: chart.chart_id,
    sessionId,
    kind,
    title: chart.title,
    unit: typeof chart.spec.unit === 'string' ? chart.spec.unit : undefined,
    note: chart.notes,
    source: isZh ? '后端图表生成' : 'Backend chart generation',
    compareSeries: kind === 'bar' || kind === 'pie' ? compareSeries : undefined,
    lineSeries:
      kind === 'line'
        ? compareSeries
            .filter(
              (item) =>
                item.group ===
                (normalizedSeries[0]?.name ?? (isZh ? '当前' : 'Current')),
            )
            .map(({ label, value, group, nature, intensity }) => ({
              label,
              value,
              group,
              nature,
              intensity,
            }))
        : undefined,
    scatterSeries:
      kind === 'scatter'
        ? compareSeries.map((item, index) => ({
            ...item,
            group: String(index + 1),
          }))
        : undefined,
    radarSeries:
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
        : undefined,
    heatmapSeries:
      kind === 'heatmap'
        ? compareSeries.map((item, index) => ({
            x: item.label,
            y: `${isZh ? '行' : 'Row'} ${index + 1}`,
            value: item.value,
            nature: 'actual',
          }))
        : undefined,
  }
}

function mapBudgetSummary(
  summary?: BackendBudgetSummary | null,
): BudgetSummary | undefined {
  if (!summary) {
    return undefined
  }

  return {
    currency: summary.currency,
    totalCostLow: summary.total_cost_low,
    totalCostBase: summary.total_cost_base,
    totalCostHigh: summary.total_cost_high,
    totalIncomeLow: summary.total_income_low,
    totalIncomeBase: summary.total_income_base,
    totalIncomeHigh: summary.total_income_high,
    netLow: summary.net_low,
    netBase: summary.net_base,
    netHigh: summary.net_high,
    reserveNote: summary.reserve_note ?? '',
  }
}

function mapBudgetItems(items?: BackendBudgetLineItem[]): BudgetLineItem[] {
  return (items ?? []).map((item) => ({
    id: item.line_item_id,
    name: item.name,
    category: item.category,
    itemType: item.item_type,
    low: item.low,
    base: item.base,
    high: item.high,
    currency: item.currency,
    rationale: item.rationale ?? '',
    basisRefs: item.basis_refs ?? [],
    confidence: item.confidence ?? 0.6,
  }))
}

function mapOptionProfiles(items?: BackendOptionProfile[]): OptionProfile[] {
  return (items ?? []).map((item) => ({
    id: item.option_id,
    name: item.name,
    summary: item.summary ?? '',
    pros: item.pros ?? [],
    cons: item.cons ?? [],
    conditions: item.conditions ?? [],
    fitFor: item.fit_for ?? [],
    cautionFlags: item.caution_flags ?? [],
    estimatedCostLow:
      typeof item.estimated_cost_low === 'number' ? item.estimated_cost_low : undefined,
    estimatedCostBase:
      typeof item.estimated_cost_base === 'number' ? item.estimated_cost_base : undefined,
    estimatedCostHigh:
      typeof item.estimated_cost_high === 'number' ? item.estimated_cost_high : undefined,
    currency: item.currency ?? 'CNY',
    score: typeof item.score === 'number' ? item.score : undefined,
    confidence: item.confidence ?? 0.6,
    basisRefs: item.basis_refs ?? [],
  }))
}

function mapReportTables(tables?: BackendReportTable[]): ReportTable[] {
  return (tables ?? []).map((table) => ({
    id: table.table_id,
    title: table.title,
    columns: table.columns,
    rows: table.rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => {
          if (typeof value === 'number') {
            return [key, value]
          }

          if (value == null) {
            return [key, null]
          }

          return [key, String(value)]
        }),
      ),
    ),
    notes: table.notes ?? '',
  }))
}

function buildFallbackMarkdown(session: BackendSession): string {
  const isZh = isChineseLocale()
  const report = session.report

  if (!report) {
    return [
      `# ${session.problem_statement}`,
      '',
      isZh ? '报告仍在生成，请先回到分析界面查看当前状态。' : 'The report is still being prepared.',
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
      : [isZh ? '- 暂无明确建议。' : '- No recommendation available yet.']),
    '',
    isZh ? '## 假设' : '## Assumptions',
    ...(report.assumptions.length
      ? report.assumptions.map((item) => `- ${item}`)
      : [isZh ? '- 暂无明确假设。' : '- No explicit assumptions returned.']),
    '',
    isZh ? '## 待确认问题' : '## Open Questions',
    ...(report.open_questions.length
      ? report.open_questions.map((item) => `- ${item}`)
      : [isZh ? '- 当前没有额外待确认问题。' : '- No open questions remain.']),
  ].join('\n')
}

function mapLastInsight(session: BackendSession) {
  return (
    session.current_focus ||
    session.major_conclusions.at(-1)?.content ||
    session.report?.summary ||
    normalizeActivityLabel(session.activity_status)
  )
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

  return bootstrap.supported_modes.map((mode) => {
    const id = mapBackendMode(mode)

    return {
      id,
      title:
        id === 'single-option'
          ? isZh
            ? '成本预估'
            : 'Cost estimation'
          : isZh
            ? '多项决策'
            : 'Multi-option decision',
      subtitle:
        id === 'single-option'
          ? isZh
            ? '输出预算范围、成本拆分、潜在回收与执行风险。'
            : 'Estimate budget range, itemized costs, offsets, and risk.'
          : isZh
            ? '识别可选方案，并平行比较优缺点、成本与适配度。'
            : 'Identify options and compare pros, cons, cost, and fit in parallel.',
      description:
        id === 'single-option'
          ? isZh
            ? '适合评估一个具体计划值不值得推进，重点输出预算区间、成本项、收入回收和关键风险。'
            : 'Best for a single plan where you need budget ranges, cost breakdowns, and downside control.'
          : isZh
            ? '适合开放式决策题，让系统先识别可能方案，再输出平行对比和建议。'
            : 'Best for open-ended choices where the model should infer and compare viable options.',
      valueLens:
        id === 'single-option'
          ? isZh
            ? ['预算范围', '成本拆分', '收入回收', '风险约束']
            : ['Budget range', 'Cost breakdown', 'Revenue offsets', 'Execution risk']
          : isZh
            ? ['方案识别', '平行优缺点', '成本对比', '偏好适配']
            : ['Option discovery', 'Parallel pros/cons', 'Cost comparison', 'Preference fit'],
      icon: id === 'single-option' ? 'sparkles' : 'git-compare',
    }
  })
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
    activityStatus: session.activity_status,
    currentFocus: session.current_focus,
    lastStopReason: session.last_stop_reason,
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
      numericValue: Number.isFinite(Number(answer.value))
        ? Number(answer.value)
        : undefined,
    })),
    searchTasks: session.search_tasks.map((task) =>
      mapBackendSearchTask(task, session.session_id),
    ),
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
    calculations: session.calculation_tasks.map((task) =>
      mapBackendCalculationTask(task, session.session_id, session.updated_at),
    ),
    chartTasks: (session.chart_tasks ?? []).map((task) =>
      mapBackendChartTask(task, session.session_id),
    ),
    chartArtifacts: session.chart_artifacts.map((artifact) =>
      mapBackendChart(artifact, session.session_id),
    ),
  }
}

function buildHighlights(session: BackendSession) {
  const isZh = isChineseLocale()
  const report = session.report
  const mode = mapBackendMode(session.mode)
  const budgetSummary = mapBudgetSummary(report?.budget_summary)
  const optionProfiles = mapOptionProfiles(report?.option_profiles)

  if (mode === 'single-option' && budgetSummary) {
    return [
      {
        id: 'budget-range',
        label: isZh ? '预算范围' : 'Budget range',
        value: `${Math.round(budgetSummary.netLow)} - ${Math.round(budgetSummary.netHigh)} ${budgetSummary.currency}`,
        detail: isZh ? '净预算区间，已计入潜在收入或回收。' : 'Net range including potential offsets.',
      },
      {
        id: 'base-budget',
        label: isZh ? '基准净预算' : 'Base net budget',
        value: `${Math.round(budgetSummary.netBase)} ${budgetSummary.currency}`,
        detail: isZh ? '最适合作为决策时的默认预算线。' : 'The most useful default planning figure.',
      },
      {
        id: 'budget-items',
        label: isZh ? '预算项目数' : 'Budget items',
        value: String(report?.budget_items?.length ?? 0),
        detail: isZh ? '包含直接成本、机会成本、收入和回收项。' : 'Direct cost, opportunity cost, and revenue items.',
      },
      {
        id: 'evidence-count',
        label: isZh ? '证据条目' : 'Evidence items',
        value: String(session.evidence_items.length),
        detail: isZh ? '用于支撑预算与风险判断的外部证据。' : 'Evidence backing the estimate.',
      },
    ]
  }

  if (mode === 'multi-option' && optionProfiles.length > 0) {
    const bestOption = [...optionProfiles]
      .sort((left, right) => (right.score ?? 0) - (left.score ?? 0))
      .at(0)

    return [
      {
        id: 'option-count',
        label: isZh ? '识别方案数' : 'Options identified',
        value: String(optionProfiles.length),
        detail: isZh ? '系统根据问题识别并整理出的候选路径。' : 'Paths identified and compared in parallel.',
      },
      {
        id: 'best-option',
        label: isZh ? '当前优先方案' : 'Current lead option',
        value: bestOption?.name ?? (isZh ? '待判断' : 'Pending'),
        detail: isZh ? '基于当前证据和偏好约束的领先选项。' : 'Lead option under current evidence and constraints.',
      },
      {
        id: 'best-score',
        label: isZh ? '综合评分' : 'Composite score',
        value:
          typeof bestOption?.score === 'number'
            ? `${bestOption.score.toFixed(1)}`
            : isZh
              ? '未评分'
              : 'Unscored',
        detail: isZh ? '仅用于排序辅助，不代表绝对结论。' : 'Useful for ranking, not an absolute truth.',
      },
      {
        id: 'evidence-count',
        label: isZh ? '证据条目' : 'Evidence items',
        value: String(session.evidence_items.length),
        detail: isZh ? '支撑方案比较和成本判断的证据数量。' : 'Evidence supporting the comparison.',
      },
    ]
  }

  return [
    {
      id: 'session-status',
      label: isZh ? '当前状态' : 'Current status',
      value: session.status,
      detail: normalizeActivityLabel(session.activity_status),
    },
    {
      id: 'answer-count',
      label: isZh ? '已回答问题' : 'Answered questions',
      value: String(session.answers.length),
      detail: isZh ? '本轮会话中已记录的用户回答数量。' : 'Answers recorded in the session.',
    },
  ]
}

export function mapBackendReport(session: BackendSession): AnalysisReport {
  const mappedSession = mapBackendSession(session)
  const report = session.report

  return {
    id: `report-${session.session_id}`,
    sessionId: session.session_id,
    mode: mappedSession.mode,
    summaryTitle: session.problem_statement,
    markdown: report?.markdown?.trim() || buildFallbackMarkdown(session),
    highlights: buildHighlights(session),
    calculations: mappedSession.calculations,
    charts: mappedSession.chartArtifacts ?? [],
    evidence: mappedSession.evidence,
    assumptions: report?.assumptions ?? [],
    disclaimers: [
      isChineseLocale()
        ? '预算、成本和方案评分都依赖当前输入与证据，若关键假设变化，结论也会同步变化。'
        : 'Budget estimates and option scores only hold under the current assumptions and evidence.',
      isChineseLocale()
        ? '表格和图表用于帮助比较与沟通，不应代替你对原始条件、合同和外部政策的复核。'
        : 'Tables and charts aid comparison and communication and should not replace source verification.',
    ],
    budgetSummary: mapBudgetSummary(report?.budget_summary),
    budgetItems: mapBudgetItems(report?.budget_items),
    optionProfiles: mapOptionProfiles(report?.option_profiles),
    tables: mapReportTables(report?.tables),
  }
}

function buildStages(mode: AnalysisMode): AnalysisProgress['stages'] {
  const isZh = isChineseLocale()

  if (mode === 'multi-option') {
    return [
      {
        id: 'clarify',
        title: isZh ? '澄清决策目标' : 'Clarify the decision goal',
        description: isZh
          ? '补齐目标、约束和偏好，让系统知道真正要解决什么问题。'
          : 'Clarify the real goal, constraints, and preference structure.',
        status: 'pending',
      },
      {
        id: 'search',
        title: isZh ? '识别并搜索方案' : 'Discover and research options',
        description: isZh
          ? '识别可能方案，并搜索支持或反驳每种方案的外部证据。'
          : 'Identify plausible options and gather evidence for each.',
        status: 'pending',
      },
      {
        id: 'compare',
        title: isZh ? '整理平行优缺点' : 'Organize parallel pros and cons',
        description: isZh
          ? '把每种方案的收益、代价、门槛和风险整理到同一比较框架里。'
          : 'Normalize pros, cons, cost, and constraints into one frame.',
        status: 'pending',
      },
      {
        id: 'visualize',
        title: isZh ? '生成对比图表' : 'Generate comparison visuals',
        description: isZh
          ? '输出分数图、成本图和辅助比较图表。'
          : 'Generate score, cost, and comparison visuals.',
        status: 'pending',
      },
      {
        id: 'report',
        title: isZh ? '撰写决策结果' : 'Draft the decision report',
        description: isZh
          ? '汇总结论、建议、表格和长文分析。'
          : 'Assemble recommendations, tables, and narrative analysis.',
        status: 'pending',
      },
    ]
  }

  return [
    {
      id: 'clarify',
      title: isZh ? '澄清预算边界' : 'Clarify the planning boundary',
      description: isZh
        ? '补齐目标范围、规模、关键约束和预算敏感点。'
        : 'Clarify the scope, scale, constraints, and budget sensitivity.',
      status: 'pending',
    },
    {
      id: 'search',
      title: isZh ? '搜索成本证据' : 'Research cost evidence',
      description: isZh
        ? '搜索成本、收益、价格和市场基准。'
        : 'Gather benchmarks for cost, revenue, and market assumptions.',
      status: 'pending',
    },
    {
      id: 'calculate',
      title: isZh ? '估算预算区间' : 'Estimate the budget range',
      description: isZh
        ? '汇总预算项，形成低位、基准和高位区间。'
        : 'Estimate low, base, and high budget ranges.',
      status: 'pending',
    },
    {
      id: 'visualize',
      title: isZh ? '生成预算图表' : 'Generate budget visuals',
      description: isZh
        ? '把预算结构、回收和净投入绘制成图表。'
        : 'Turn the budget structure and offsets into charts.',
      status: 'pending',
    },
    {
      id: 'report',
      title: isZh ? '撰写预算结果' : 'Draft the budget report',
      description: isZh
        ? '输出预算范围、成本明细、表格和文字结论。'
        : 'Produce the final budget range, tables, and narrative.',
      status: 'pending',
    },
  ]
}

function resolveActiveStageIndex(
  status: BackendSession['status'],
  activityStatus?: string,
) {
  if (status === 'INIT' || status === 'CLARIFYING') {
    return 0
  }

  if (status === 'ANALYZING') {
    if (
      activityStatus === 'searching_web_for_evidence' ||
      activityStatus === 'searching_and_synthesizing'
    ) {
      return 1
    }

    if (activityStatus === 'running_deterministic_calculations') {
      return 2
    }

    if (activityStatus === 'preparing_visualizations') {
      return 3
    }

    return 2
  }

  return 4
}

export function mapBackendProgress(
  session: BackendSession,
  step?: BackendSessionStepResponse,
): AnalysisProgress {
  const activityStatus = step?.activity_status ?? session.activity_status
  const mode = mapBackendMode(session.mode)
  const activeStageIndex = resolveActiveStageIndex(
    step?.status ?? session.status,
    activityStatus,
  )
  const stages: AnalysisProgress['stages'] = buildStages(mode).map((stage, index) => {
    const status: AnalysisProgress['stages'][number]['status'] =
      (step?.status ?? session.status) === 'COMPLETED'
        ? 'completed'
        : index < activeStageIndex
          ? 'completed'
          : index === activeStageIndex
            ? 'active'
            : 'pending'

    return {
      ...stage,
      status,
    }
  })

  return {
    sessionId: session.session_id,
    status: step?.status ?? session.status,
    overallProgress:
      (step?.status ?? session.status) === 'COMPLETED'
        ? 100
        : Math.round(((activeStageIndex + 1) / stages.length) * 100),
    currentStepLabel:
      step?.prompt_to_user ||
      normalizeActivityLabel(activityStatus) ||
      session.current_focus ||
      mapLastInsight(session),
    errorMessage: step?.error_message ?? session.error_message ?? undefined,
    nextAction: step?.next_action,
    activityStatus,
    currentFocus: step?.current_focus ?? session.current_focus,
    lastStopReason: step?.last_stop_reason ?? session.last_stop_reason,
    stages,
    pendingQuestions: step?.pending_questions?.map((question) => ({
      ...mapBackendQuestion(question),
      sessionId: session.session_id,
    })),
    pendingSearchTasks: step?.pending_search_tasks?.map((task) =>
      mapBackendSearchTask(task, session.session_id),
    ),
    pendingCalculationTasks: (step?.pending_calculation_tasks ?? []).map((task) =>
      mapBackendCalculationTask(task, session.session_id, session.updated_at),
    ),
    pendingChartTasks: (step?.pending_chart_tasks ?? []).map((task) =>
      mapBackendChartTask(task, session.session_id),
    ),
    chartArtifacts: (step?.chart_artifacts ?? session.chart_artifacts).map(
      (artifact) => mapBackendChart(artifact, session.session_id),
    ),
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
