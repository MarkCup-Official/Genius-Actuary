import type {
  AnalysisMode,
  AnalysisReport,
  BudgetLineItem,
  BudgetSummary,
  CalculationTask,
  ChartArtifact,
  ChartTask,
  ClarificationQuestion,
  MetricHighlight,
  ModeDefinition,
  OptionProfile,
  ReportTable,
  SearchTask,
} from '@/types'

interface MockAnalysisBundle {
  questions: ClarificationQuestion[]
  searchTasks: SearchTask[]
  calculations: CalculationTask[]
  chartTasks: ChartTask[]
  charts: ChartArtifact[]
  report: AnalysisReport
}

function makeQuestion(
  sessionId: string,
  id: string,
  question: string,
  purpose: string,
  options?: string[],
  extra?: Partial<ClarificationQuestion>,
): ClarificationQuestion {
  return {
    id,
    sessionId,
    question,
    purpose,
    questionGroup: extra?.questionGroup ?? '',
    inputHint: extra?.inputHint ?? '',
    exampleAnswer: extra?.exampleAnswer ?? '',
    fieldType: options?.length ? 'single-choice' : 'textarea',
    options: options?.map((option) => ({ value: option, label: option })),
    allowCustomInput: true,
    allowSkip: extra?.allowSkip ?? true,
    priority: extra?.priority ?? 1,
    recommended: [],
    answered: false,
  }
}

function makeCalculation(
  sessionId: string,
  id: string,
  taskType: string,
  formulaExpression: string,
  inputParams: Record<string, string | number>,
  units: string,
  result: string,
): CalculationTask {
  return {
    id,
    sessionId,
    taskType,
    formulaExpression,
    inputParams,
    units,
    result,
    status: 'completed',
    createdAt: new Date().toISOString(),
  }
}

function makeChartTask(
  sessionId: string,
  id: string,
  title: string,
  chartType: ChartTask['chartType'],
  objective: string,
): ChartTask {
  return {
    id,
    sessionId,
    title,
    chartType,
    objective,
    status: 'pending',
  }
}

function money(value: number, currency = 'CNY') {
  return `${Math.round(value).toLocaleString('zh-CN')} ${currency}`
}

function buildModeDefinitions(): ModeDefinition[] {
  return [
    {
      id: 'single-option',
      title: '成本预估',
      subtitle: '预算范围、项目拆分、回收与风险',
      description: '适合评估一个具体计划是否值得推进，输出预算区间、详细成本项和可能回收。',
      valueLens: ['预算范围', '成本拆分', '收入回收', '执行风险'],
      icon: 'sparkles',
    },
    {
      id: 'multi-option',
      title: '多项决策',
      subtitle: '方案识别、平行优缺点、成本与适配度',
      description: '适合开放式问题，先识别可能方案，再平行输出每种方案的优缺点、成本和建议。',
      valueLens: ['方案识别', '平行优缺点', '成本对比', '偏好适配'],
      icon: 'git-compare',
    },
  ]
}

function buildBudgetCharts(sessionId: string, summary: BudgetSummary, items: BudgetLineItem[]): ChartArtifact[] {
  const costItems = items.filter((item) => item.itemType !== 'income')
  const incomeItems = items.filter((item) => item.itemType === 'income')

  return [
    {
      id: `${sessionId}-budget-range`,
      sessionId,
      kind: 'bar',
      title: '预算区间总览',
      unit: summary.currency,
      note: '低位、基准、高位用于表达不确定性边界。',
      compareSeries: [
        { label: '低位', value: summary.totalCostLow, group: '总成本', nature: 'estimated' },
        { label: '基准', value: summary.totalCostBase, group: '总成本', nature: 'estimated' },
        { label: '高位', value: summary.totalCostHigh, group: '总成本', nature: 'estimated' },
        { label: '低位', value: summary.netLow, group: '净预算', nature: 'estimated' },
        { label: '基准', value: summary.netBase, group: '净预算', nature: 'estimated' },
        { label: '高位', value: summary.netHigh, group: '净预算', nature: 'estimated' },
      ],
    },
    {
      id: `${sessionId}-budget-mix`,
      sessionId,
      kind: 'pie',
      title: '基准成本构成',
      unit: summary.currency,
      note: '只展示成本侧项目。',
      compareSeries: costItems.map((item) => ({
        label: item.name,
        value: item.base,
        group: '成本',
        nature: 'estimated',
      })),
    },
    {
      id: `${sessionId}-income-offsets`,
      sessionId,
      kind: 'bar',
      title: '潜在收入与回收',
      unit: summary.currency,
      note: '收入和回收项需要单独看，不宜直接当作已到账现金。',
      compareSeries: incomeItems.map((item) => ({
        label: item.name,
        value: item.base,
        group: '收入',
        nature: 'estimated',
      })),
    },
  ]
}

function buildOptionCharts(sessionId: string, options: OptionProfile[]): ChartArtifact[] {
  return [
    {
      id: `${sessionId}-option-score`,
      sessionId,
      kind: 'bar',
      title: '方案综合评分',
      unit: 'score',
      note: '评分只用于帮助排序，不代表绝对正确答案。',
      compareSeries: options.map((option) => ({
        label: option.name,
        value: option.score ?? 0,
        group: '评分',
        nature: 'estimated',
      })),
    },
    {
      id: `${sessionId}-option-cost`,
      sessionId,
      kind: 'bar',
      title: '方案成本对比',
      unit: options[0]?.currency ?? 'CNY',
      note: '成本图显示基准值，具体预算仍要结合明细和边界看。',
      compareSeries: options.map((option) => ({
        label: option.name,
        value: option.estimatedCostBase ?? 0,
        group: '基准成本',
        nature: 'estimated',
      })),
    },
    {
      id: `${sessionId}-option-radar`,
      sessionId,
      kind: 'radar',
      title: '方案平衡雷达',
      unit: 'score',
      note: '用于帮助理解增长、稳定性、成本压力和灵活性的平衡。',
      radarSeries: options.slice(0, 3).map((option) => ({
        name: option.name,
        values: [
          { dimension: '成长性', value: Math.min(10, (option.score ?? 6) + 1) },
          { dimension: '稳定性', value: Math.max(3, 8 - option.cautionFlags.length) },
          { dimension: '成本压力', value: Math.min(10, Math.max(2, (option.estimatedCostBase ?? 0) / 120000)) },
          { dimension: '灵活性', value: Math.max(3, 8 - option.conditions.length) },
        ],
      })),
    },
  ]
}

function buildBudgetTable(title: string, items: BudgetLineItem[]): ReportTable {
  return {
    id: `${title}-table`,
    title,
    columns: ['项目', '类别', '类型', '低位', '基准', '高位', '币种', '说明'],
    rows: items.map((item) => ({
      项目: item.name,
      类别: item.category,
      类型: item.itemType,
      低位: item.low,
      基准: item.base,
      高位: item.high,
      币种: item.currency,
      说明: item.rationale ?? '',
    })),
    notes: '建议优先按基准值做决策，再为不确定项单独预留缓冲。',
  }
}

function buildOptionTable(title: string, options: OptionProfile[]): ReportTable {
  return {
    id: `${title}-table`,
    title,
    columns: ['方案', '优点', '缺点', '基准成本', '适合谁', '风险提示', '评分'],
    rows: options.map((option) => ({
      方案: option.name,
      优点: option.pros.join('；'),
      缺点: option.cons.join('；'),
      基准成本: option.estimatedCostBase ?? null,
      适合谁: option.fitFor.join('；'),
      风险提示: option.cautionFlags.join('；'),
      评分: option.score ?? null,
    })),
    notes: '建议结合你的预算、时间窗口和风险承受能力一起看。',
  }
}

function buildHighlights(items: Array<[string, string, string, string]>): MetricHighlight[] {
  return items.map(([id, label, value, detail]) => ({ id, label, value, detail }))
}

export function buildMockModeDefinitions() {
  return buildModeDefinitions()
}

export function buildMockAnalysisBundle(
  sessionId: string,
  problemStatement: string,
  mode: AnalysisMode,
): MockAnalysisBundle {
  if (mode === 'single-option') {
    const budgetItems: BudgetLineItem[] = [
      { id: `${sessionId}-item-1`, name: '工作人员工资', category: '人力成本', itemType: 'cost', low: 60000, base: 90000, high: 130000, currency: 'CNY', rationale: '含执行、裁判和临时支持人员。', basisRefs: [], confidence: 0.72 },
      { id: `${sessionId}-item-2`, name: '场地租用', category: '执行成本', itemType: 'cost', low: 80000, base: 120000, high: 180000, currency: 'CNY', rationale: '取决于城市、档期和场馆等级。', basisRefs: [], confidence: 0.76 },
      { id: `${sessionId}-item-3`, name: '设备与物料', category: '执行成本', itemType: 'cost', low: 30000, base: 60000, high: 100000, currency: 'CNY', rationale: '音响、灯光、摄影、赛事物料。', basisRefs: [], confidence: 0.68 },
      { id: `${sessionId}-item-4`, name: '宣发投放', category: '市场成本', itemType: 'cost', low: 20000, base: 50000, high: 90000, currency: 'CNY', rationale: '决定曝光和到场率。', basisRefs: [], confidence: 0.7 },
      { id: `${sessionId}-item-5`, name: '组织机会成本', category: '机会成本', itemType: 'opportunity_cost', low: 30000, base: 50000, high: 80000, currency: 'CNY', rationale: '团队时间被占用导致的替代损失。', basisRefs: [], confidence: 0.63 },
      { id: `${sessionId}-item-6`, name: '赞助收入', category: '收入回收', itemType: 'income', low: 80000, base: 160000, high: 300000, currency: 'CNY', rationale: '取决于招商质量和合同落地率。', basisRefs: [], confidence: 0.65 },
      { id: `${sessionId}-item-7`, name: '门票与报名费', category: '收入回收', itemType: 'income', low: 30000, base: 70000, high: 140000, currency: 'CNY', rationale: '受转化率和上座率影响。', basisRefs: [], confidence: 0.61 },
    ]

    const budgetSummary: BudgetSummary = {
      currency: 'CNY',
      totalCostLow: 220000,
      totalCostBase: 370000,
      totalCostHigh: 580000,
      totalIncomeLow: 110000,
      totalIncomeBase: 230000,
      totalIncomeHigh: 440000,
      netLow: 110000,
      netBase: 140000,
      netHigh: 140000,
      reserveNote: '建议额外预留 15% 到 20% 的现金缓冲。',
    }

    const questions = [
      makeQuestion(sessionId, `${sessionId}-q-1`, '这次计划最终想做到什么规模和结果？', '预算判断必须先知道目标规模和成功标准。'),
      makeQuestion(sessionId, `${sessionId}-q-2`, '当前最硬的预算或现金流约束是什么？', '预算上限会直接改变可执行范围和风险承受方式。'),
      makeQuestion(sessionId, `${sessionId}-q-3`, '是否存在赞助、补贴或其他收入来源？', '结果页需要同时输出成本项和回收项。'),
    ]

    const calculations = [
      makeCalculation(sessionId, `${sessionId}-calc-1`, '预算区间汇总', 'sum(cost_items) - sum(income_items)', { 成本基准: 370000, 收入基准: 230000 }, 'CNY', '140000'),
      makeCalculation(sessionId, `${sessionId}-calc-2`, '安全缓冲估算', 'net_base * 15%', { 净预算基准: 140000 }, 'CNY', '21000'),
    ]

    const tables = [buildBudgetTable('预算项目拆分表', budgetItems)]
    const charts = buildBudgetCharts(sessionId, budgetSummary, budgetItems)
    const highlights = buildHighlights([
      ['budget-range', '预算范围', `${money(budgetSummary.netLow)} - ${money(budgetSummary.netHigh)}`, '已经把收入回收一并计入净预算。'],
      ['base-budget', '基准净预算', money(budgetSummary.netBase), '适合作为默认决策预算线。'],
      ['budget-count', '预算项目数', String(budgetItems.length), '覆盖直接成本、机会成本与收入项。'],
      ['reserve', '建议缓冲', '15% - 20%', budgetSummary.reserveNote ?? ''],
    ])

    const report: AnalysisReport = {
      id: `report-${sessionId}`,
      sessionId,
      mode,
      summaryTitle: problemStatement,
      markdown: `# 成本预估结果\n\n## 结论\n\n当前更合理的做法是把 **${money(budgetSummary.netBase)}** 视为基准净预算，并准备额外缓冲。这个计划不是不能做，而是非常依赖收入回收是否落地，以及场地、人力和宣发是否超支。\n\n## 成本视角\n\n- 直接成本主要集中在人力、场地和设备。\n- 机会成本不能忽略，它会吞掉团队的时间和后续机会。\n- 如果赞助和门票没有及时落地，现金压力会明显上升。\n\n## 建议动作\n\n1. 先锁定场地和关键人力报价，再决定规模。\n2. 把收入项和已确定成本拆开看，不要提前乐观抵扣。\n3. 在合同未签和赞助未到账前，按基准预算而不是高位收入做决策。`,
      highlights,
      calculations,
      charts,
      evidence: [],
      assumptions: ['当前预算按中型线下活动估算。', '收入项按中性转化率和落地率估算。'],
      disclaimers: ['预算区间是辅助决策的估算，不应代替真实报价和合同条款。'],
      budgetSummary,
      budgetItems,
      tables,
    }

    return {
      questions,
      searchTasks: [
        { id: `${sessionId}-search-1`, sessionId, topic: '场地与执行成本基准', goal: '验证场地、人力和设备的市场区间', scope: '当前城市和相近规模活动', suggestedQueries: ['线下活动 场地租赁 成本', '赛事执行 人力 成本'], requiredFields: ['报价区间', '影响因子'], freshnessRequirement: 'high', status: 'pending' },
      ],
      calculations,
      chartTasks: [
        makeChartTask(sessionId, `${sessionId}-chart-task-1`, '预算区间总览', 'bar', '绘制低位、基准、高位预算对比'),
        makeChartTask(sessionId, `${sessionId}-chart-task-2`, '基准成本构成', 'pie', '展示主要成本项占比'),
      ],
      charts,
      report,
    }
  }

  const options: OptionProfile[] = [
    { id: `${sessionId}-option-1`, name: '去美国留学一年', summary: '成长快，但资金和执行压力大。', pros: ['国际视野和资源扩张明显', '对部分职业路径有加速作用'], cons: ['资金投入高', '执行链条长，时间与签证风险大'], conditions: ['需要明确预算来源', '最好有明确项目或学校方向'], fitFor: ['明确想做国际化路径的人', '愿意承担更高不确定性的人'], cautionFlags: ['预算可能接近或超过 100 万', '中途退出成本高'], estimatedCostLow: 700000, estimatedCostBase: 1000000, estimatedCostHigh: 1300000, currency: 'CNY', score: 7.2, confidence: 0.7, basisRefs: [] },
    { id: `${sessionId}-option-2`, name: '留在国内继续发展', summary: '现金压力低，试错空间更大。', pros: ['成本低很多', '行动快，回撤小'], cons: ['国际化增量较有限', '短期认知扩展没有留学强'], conditions: ['需要主动寻找高质量项目和环境'], fitFor: ['优先保现金流和确定性的人'], cautionFlags: ['成长速度可能更依赖个人主动性'], estimatedCostLow: 60000, estimatedCostBase: 100000, estimatedCostHigh: 180000, currency: 'CNY', score: 7.8, confidence: 0.74, basisRefs: [] },
    { id: `${sessionId}-option-3`, name: '先工作两年再决定', summary: '把选择权往后留，换取更强的资金和判断基础。', pros: ['先积累资金和经验', '两年后判断会更成熟'], cons: ['推迟潜在的国际化窗口', '需要持续自律地准备'], conditions: ['工作内容需要对长期目标有帮助'], fitFor: ['暂时不想高风险投入的人', '还在摸清长期方向的人'], cautionFlags: ['容易在工作惯性中放弃后续计划'], estimatedCostLow: 80000, estimatedCostBase: 160000, estimatedCostHigh: 260000, currency: 'CNY', score: 8.1, confidence: 0.76, basisRefs: [] },
  ]

  const questions = [
    makeQuestion(sessionId, `${sessionId}-q-1`, '你最在意的是长期成长、现金流稳定，还是尽快开始行动？', '多项决策必须先知道排序标准。'),
    makeQuestion(sessionId, `${sessionId}-q-2`, '你当前不能突破的预算上限是多少？', '预算上限会直接淘汰一部分看似不错但不现实的方案。'),
    makeQuestion(sessionId, `${sessionId}-q-3`, '如果没有完美方案，你更愿意保住什么？', '推荐必须体现你的真实取舍。'),
  ]

  const calculations = [
    makeCalculation(sessionId, `${sessionId}-calc-1`, '方案成本对比', 'compare(option_cost_base)', { 留学: 1000000, 国内: 100000, 先工作: 160000 }, 'CNY', 'completed'),
  ]

  const tables = [buildOptionTable('方案平行对比表', options)]
  const charts = buildOptionCharts(sessionId, options)
  const highlights = buildHighlights([
    ['option-count', '识别方案数', String(options.length), '系统为当前问题整理了三种可执行路径。'],
    ['lead-option', '当前优先方案', options[2].name, '在兼顾现金流、选择权和长期准备的情况下更稳妥。'],
    ['score-gap', '最高评分', `${options[2].score}`, '仅用于排序辅助。'],
    ['cost-gap', '最大成本差', `${money((options[0].estimatedCostBase ?? 0) - (options[1].estimatedCostBase ?? 0))}`, '不同方案之间的成本差距非常大。'],
  ])

  const report: AnalysisReport = {
    id: `report-${sessionId}`,
    sessionId,
    mode,
    summaryTitle: problemStatement,
    markdown: `# 多项决策结果\n\n## 结论\n\n当前更稳妥的默认方案是 **先工作两年再决定**。它不是理论上最耀眼的方案，但在保持现金流、保留选择权、同时继续为留学做准备这三点上更平衡。\n\n## 为什么不是直接去留学\n\n- 去留学的上行空间明显，但资金和执行压力也最大。\n- 如果预算接近上限，任何突发变量都会明显放大风险。\n- 在准备不足时直接推进，容易把高成本方案变成高压力方案。\n\n## 为什么不是直接留在国内不动\n\n- 成本低和行动快是优势。\n- 但如果你的真实目标是国际化发展，只停留在国内会损失部分长期弹性。\n\n## 建议动作\n\n1. 先验证 2 年内最有帮助的工作路径是否存在。\n2. 用工作期积累资金与判断，再决定是否出国。\n3. 如果未来能拿到明确资助，再重新评估直接留学方案。`,
    highlights,
    calculations,
    charts,
    evidence: [],
    assumptions: ['方案成本按常见区间和中性情境估算。'],
    disclaimers: ['方案评分和成本区间只用于帮助比较，不是唯一决策依据。'],
    optionProfiles: options,
    tables,
  }

  return {
    questions,
    searchTasks: [
      { id: `${sessionId}-search-1`, sessionId, topic: '留学与国内路径成本基准', goal: '验证不同路径的一年成本与机会成本差异', scope: '近一年公开信息', suggestedQueries: ['美国 留学 一年 成本', '国内 一年 生活 开销'], requiredFields: ['成本区间', '关键变量'], freshnessRequirement: 'high', status: 'pending' },
    ],
    calculations,
    chartTasks: [
      makeChartTask(sessionId, `${sessionId}-chart-task-1`, '方案综合评分', 'bar', '绘制方案排序'),
      makeChartTask(sessionId, `${sessionId}-chart-task-2`, '方案平衡雷达', 'radar', '展示成长、稳定性、成本压力和灵活性'),
    ],
    charts,
    report,
  }
}
