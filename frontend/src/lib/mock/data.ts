import type {
  AnalysisMode,
  AnalysisReport,
  AnalysisSession,
  AuditLogEntry,
  CalculationTask,
  ChartArtifact,
  ClarificationQuestion,
  DashboardOverview,
  DataVizBundle,
  EvidenceItem,
  FileItem,
  MetricHighlight,
  ModeDefinition,
  NotificationItem,
  Permission,
  Role,
  SearchTask,
  SettingsPayload,
  User,
} from '@/types'

const iso = (value: string) => new Date(value).toISOString()

export const permissions: Permission[] = [
  {
    id: 'analysis.run',
    label: 'Run analysis',
    description: 'Create and advance decision analysis sessions.',
    resource: 'analysis',
  },
  {
    id: 'analysis.export',
    label: 'Export report',
    description: 'Export analysis bundles to CSV/PDF.',
    resource: 'analysis',
  },
  {
    id: 'notifications.manage',
    label: 'Manage notifications',
    description: 'Read and update notification status.',
    resource: 'notifications',
  },
  {
    id: 'files.manage',
    label: 'Manage files',
    description: 'Upload and preview analysis attachments.',
    resource: 'files',
  },
  {
    id: 'logs.read',
    label: 'Read audit logs',
    description: 'Inspect system and user audit events.',
    resource: 'logs',
  },
  {
    id: 'users.manage',
    label: 'Manage users',
    description: 'Maintain users and account roles.',
    resource: 'users',
  },
  {
    id: 'roles.manage',
    label: 'Manage roles',
    description: 'Inspect or modify role permissions.',
    resource: 'roles',
  },
  {
    id: 'settings.manage',
    label: 'Manage settings',
    description: 'Update workspace preferences and API wiring.',
    resource: 'settings',
  },
]

export const roles: Role[] = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Workspace-wide visibility and role assignment.',
    permissions: permissions.map((permission) => permission.id),
    memberCount: 2,
  },
  {
    id: 'analyst',
    name: 'Analyst',
    description: 'Can run analysis, inspect files, and export reports.',
    permissions: [
      'analysis.run',
      'analysis.export',
      'notifications.manage',
      'files.manage',
      'logs.read',
      'settings.manage',
    ],
    memberCount: 8,
  },
  {
    id: 'reviewer',
    name: 'Reviewer',
    description: 'Read-only access for audit and resource inspection.',
    permissions: ['logs.read', 'notifications.manage'],
    memberCount: 3,
  },
]

export const users: User[] = [
  {
    id: 'u-analyst',
    name: 'Ada Shen',
    email: 'analyst@geniusactuary.ai',
    title: 'Lead Decision Analyst',
    locale: 'zh',
    roles: ['admin', 'analyst'],
    lastActiveAt: iso('2026-03-28T15:15:00+08:00'),
  },
  {
    id: 'u-reviewer',
    name: 'Milo Turner',
    email: 'reviewer@geniusactuary.ai',
    title: 'Risk Reviewer',
    locale: 'en',
    roles: ['reviewer'],
    lastActiveAt: iso('2026-03-28T12:30:00+08:00'),
  },
]

export const defaultSettings: SettingsPayload = {
  themeMode: 'dark',
  language: 'zh',
  apiMode: 'mock',
  displayDensity: 'cozy',
  notificationsEmail: true,
  notificationsPush: false,
  autoExportPdf: false,
  chartMotion: true,
}

export const analysisModes: ModeDefinition[] = [
  {
    id: 'single-option',
    title: 'Single option cost / risk',
    subtitle: 'Evaluate one plan deeply before committing.',
    description:
      'Best for a single action, plan, or investment where cost, uncertainty, and prerequisites matter.',
    valueLens: ['Cost panorama', 'Risk exposure', 'Prerequisites', 'Mitigation plan'],
    icon: 'sparkles',
  },
  {
    id: 'multi-option',
    title: 'Multi-option decision reference',
    subtitle: 'Compare several paths under different preferences.',
    description:
      'Best for A/B or multi-path decisions where trade-offs, weighting, and scenario fit matter.',
    valueLens: ['Option matrix', 'Weighting & fit', 'Trade-off clarity', 'Preference-aware guidance'],
    icon: 'git-compare',
  },
]

export const notificationsSeed: NotificationItem[] = [
  {
    id: 'n-1',
    title: 'Report ready',
    message: 'Exchange feasibility report has finished rendering with 3 charts.',
    level: 'success',
    channel: 'in-app',
    read: false,
    createdAt: iso('2026-03-28T14:42:00+08:00'),
  },
  {
    id: 'n-2',
    title: 'Risk warning surfaced',
    message: 'Visa timing uncertainty increased in the latest exchange scenario.',
    level: 'warning',
    channel: 'in-app',
    read: false,
    createdAt: iso('2026-03-28T12:15:00+08:00'),
  },
  {
    id: 'n-3',
    title: 'Daily digest mailed',
    message: 'Your dashboard digest was delivered to analyst@geniusactuary.ai.',
    level: 'info',
    channel: 'email',
    read: true,
    createdAt: iso('2026-03-28T09:00:00+08:00'),
  },
]

export const logsSeed: AuditLogEntry[] = [
  {
    id: 'log-1',
    action: 'LOGIN',
    actor: 'Ada Shen',
    target: 'Workspace',
    ipAddress: '10.0.1.15',
    createdAt: iso('2026-03-28T15:11:00+08:00'),
    status: 'success',
    summary: 'MFA verified and access token issued.',
    metadata: {
      method: 'POST /api/auth/login',
      session: 'sess_auth_1',
    },
  },
  {
    id: 'log-2',
    action: 'REPORT_READY',
    actor: 'System',
    target: 'sess-exchange',
    ipAddress: 'internal',
    createdAt: iso('2026-03-28T14:42:00+08:00'),
    status: 'success',
    summary: 'Rendered markdown report and synchronized chart bundle.',
    metadata: {
      stages: 'clarify,search,calculate,report',
      transport: 'mock-realtime',
    },
  },
  {
    id: 'log-3',
    action: 'FILE_UPLOAD',
    actor: 'Ada Shen',
    target: 'BudgetNotes.pdf',
    ipAddress: '10.0.1.15',
    createdAt: iso('2026-03-28T11:02:00+08:00'),
    status: 'warning',
    summary: 'Upload accepted, virus scan pending.',
    metadata: {
      endpoint: 'POST /api/files',
      mime: 'application/pdf',
    },
  },
  {
    id: 'log-4',
    action: 'ROLE_UPDATE',
    actor: 'Ada Shen',
    target: 'Milo Turner',
    ipAddress: '10.0.1.15',
    createdAt: iso('2026-03-27T18:12:00+08:00'),
    status: 'success',
    summary: 'Reviewer role permissions refreshed after policy review.',
    metadata: {
      endpoint: 'PATCH /api/users/u-reviewer/roles',
      count: '2',
    },
  },
]

export const filesSeed: FileItem[] = [
  {
    id: 'f-1',
    name: 'exchange_budget_v2.pdf',
    size: 524288,
    mime: 'application/pdf',
    tags: ['budget', 'exchange'],
    createdAt: iso('2026-03-28T11:01:00+08:00'),
    status: 'available',
    intent: 'report',
  },
  {
    id: 'f-2',
    name: 'visa_policy_notes.xlsx',
    size: 183500,
    mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    tags: ['policy', 'evidence'],
    createdAt: iso('2026-03-27T16:40:00+08:00'),
    status: 'available',
    intent: 'evidence',
  },
  {
    id: 'f-3',
    name: 'commute_sensitivity.csv',
    size: 7240,
    mime: 'text/csv',
    tags: ['commute', 'model'],
    createdAt: iso('2026-03-26T20:16:00+08:00'),
    status: 'processing',
    intent: 'attachment',
  },
]

function buildExchangeCharts(sessionId: string): ChartArtifact[] {
  return [
    {
      id: `chart-${sessionId}-cashflow`,
      sessionId,
      kind: 'line',
      title: 'Exchange budget burn-down',
      subtitle: 'Projected monthly cash requirement',
      unit: 'USD',
      source: 'User inputs + public cost-of-living references',
      note: 'Solid points are confirmed estimates, dim points are inferred buffers.',
      lineSeries: [
        { label: '2026-03', value: 1200, nature: 'actual' },
        { label: '2026-04', value: 1620, nature: 'estimated' },
        { label: '2026-05', value: 1880, nature: 'estimated' },
        { label: '2026-06', value: 2140, nature: 'inferred' },
        { label: '2026-07', value: 2075, nature: 'estimated' },
      ],
    },
    {
      id: `chart-${sessionId}-risk-radar`,
      sessionId,
      kind: 'radar',
      title: 'Exchange risk posture',
      unit: 'score / 10',
      note: 'Lower is safer. Policy and funding remain the main volatility nodes.',
      radarSeries: [
        {
          name: 'Exchange',
          values: [
            { dimension: 'Budget strain', value: 7.4 },
            { dimension: 'Visa timing', value: 6.8 },
            { dimension: 'Career upside', value: 8.7 },
            { dimension: 'Reversibility', value: 5.1 },
            { dimension: 'Execution load', value: 6.2 },
          ],
        },
      ],
    },
    {
      id: `chart-${sessionId}-source-heatmap`,
      sessionId,
      kind: 'heatmap',
      title: 'Confidence by source and dimension',
      note: 'Used to distinguish confirmed facts from inferred ranges.',
      heatmapSeries: [
        { x: 'Living cost', y: 'Official university', value: 9, nature: 'actual' },
        { x: 'Living cost', y: 'Community forum', value: 5, nature: 'inferred' },
        { x: 'Visa timing', y: 'Official embassy', value: 8, nature: 'actual' },
        { x: 'Visa timing', y: 'Social posts', value: 4, nature: 'inferred' },
        { x: 'Scholarship', y: 'Program office', value: 7, nature: 'estimated' },
      ],
    },
  ]
}

function buildCarCharts(sessionId: string): ChartArtifact[] {
  return [
    {
      id: `chart-${sessionId}-line`,
      sessionId,
      kind: 'line',
      title: 'Car ownership vs public transit cost',
      subtitle: '24-month cumulative outlay',
      unit: 'USD',
      note: 'Line glow indicates decision sensitivity near the crossover zone.',
      lineSeries: [
        { label: 'Month 1', value: 850, nature: 'actual' },
        { label: 'Month 6', value: 4200, nature: 'estimated' },
        { label: 'Month 12', value: 7700, nature: 'estimated' },
        { label: 'Month 18', value: 10950, nature: 'estimated' },
        { label: 'Month 24', value: 14100, nature: 'inferred' },
      ],
    },
    {
      id: `chart-${sessionId}-bar`,
      sessionId,
      kind: 'bar',
      title: 'Key cost buckets',
      unit: 'USD / year',
      compareSeries: [
        { label: 'Loan + depreciation', value: 6200, group: 'Car', nature: 'estimated' },
        { label: 'Fuel + parking', value: 3400, group: 'Car', nature: 'estimated' },
        { label: 'Transit + ridehail', value: 4100, group: 'Transit', nature: 'actual' },
      ],
    },
    {
      id: `chart-${sessionId}-scatter`,
      sessionId,
      kind: 'scatter',
      title: 'Convenience vs annual cost scenarios',
      unit: 'score / cost',
      note: 'Point aura strength represents probability weight.',
      scatterSeries: [
        { label: 'Car optimistic', value: 74, group: '6400', intensity: 0.8, nature: 'estimated' },
        { label: 'Car base', value: 61, group: '9400', intensity: 1, nature: 'estimated' },
        { label: 'Transit base', value: 49, group: '4100', intensity: 0.7, nature: 'actual' },
        { label: 'Transit with frequent taxis', value: 56, group: '5800', intensity: 0.5, nature: 'estimated' },
      ],
    },
  ]
}

function buildGraduateCharts(sessionId: string): ChartArtifact[] {
  return [
    {
      id: `chart-${sessionId}-bar`,
      sessionId,
      kind: 'bar',
      title: 'Two-year value comparison',
      unit: 'score / 100',
      compareSeries: [
        { label: 'Graduate school', value: 78, group: 'Upside', nature: 'estimated' },
        { label: 'Work first', value: 69, group: 'Upside', nature: 'estimated' },
        { label: 'Graduate school', value: 64, group: 'Risk', nature: 'estimated' },
        { label: 'Work first', value: 46, group: 'Risk', nature: 'actual' },
      ],
    },
    {
      id: `chart-${sessionId}-radar`,
      sessionId,
      kind: 'radar',
      title: 'Option fit by dimension',
      unit: 'score / 10',
      radarSeries: [
        {
          name: 'Graduate school',
          values: [
            { dimension: 'Skill acceleration', value: 8.8 },
            { dimension: 'Cash pressure', value: 6.9 },
            { dimension: 'Optionality', value: 7.8 },
            { dimension: 'Execution complexity', value: 7.2 },
          ],
        },
        {
          name: 'Work first',
          values: [
            { dimension: 'Skill acceleration', value: 7.1 },
            { dimension: 'Cash pressure', value: 3.8 },
            { dimension: 'Optionality', value: 7.3 },
            { dimension: 'Execution complexity', value: 4.1 },
          ],
        },
      ],
    },
  ]
}

function buildGenericCharts(sessionId: string): ChartArtifact[] {
  return [
    {
      id: `chart-${sessionId}-line`,
      sessionId,
      kind: 'line',
      title: 'Outcome confidence over time',
      unit: 'confidence',
      lineSeries: [
        { label: 'Week 1', value: 42, nature: 'actual' },
        { label: 'Week 2', value: 51, nature: 'estimated' },
        { label: 'Week 3', value: 63, nature: 'estimated' },
        { label: 'Week 4', value: 71, nature: 'inferred' },
      ],
    },
  ]
}

function buildQuestions(
  sessionId: string,
  scenario: 'exchange' | 'car' | 'graduate' | 'generic',
): ClarificationQuestion[] {
  const common: ClarificationQuestion[] = [
    {
      id: `${sessionId}-risk`,
      sessionId,
      question: '你对这次决策的风险容忍度更偏保守还是进取？',
      purpose: '风险偏好会影响我们如何解读收益与代价，以及最终推荐的阈值。',
      fieldType: 'slider',
      allowCustomInput: true,
      allowSkip: true,
      min: 1,
      max: 10,
      unit: '/10',
      priority: 1,
      recommended: ['4'],
    },
    {
      id: `${sessionId}-deadline`,
      sessionId,
      question: '你希望在多长时间内做出最终决定？',
      purpose: '时间窗口决定我们是偏向保守行动建议，还是允许等待更多外部信息。',
      fieldType: 'single-choice',
      allowCustomInput: true,
      allowSkip: true,
      priority: 2,
      options: [
        { value: '1-week', label: '1 周内' },
        { value: '1-month', label: '1 个月内' },
        { value: '2-months', label: '2 个月内' },
      ],
      recommended: ['1-month'],
    },
  ]

  if (scenario === 'exchange') {
    return [
      {
        id: `${sessionId}-country`,
        sessionId,
        question: '目标交换国家 / 学校已经确定了吗？',
        purpose: '生活成本、签证、课程匹配和奖学金都强依赖于目标国家与院校。',
        fieldType: 'text',
        allowCustomInput: true,
        allowSkip: false,
        priority: 1,
      },
      {
        id: `${sessionId}-budget`,
        sessionId,
        question: '你目前可接受的总预算区间是多少？',
        purpose: '预算决定交换是否可持续，也影响安全冗余和替代方案推荐。',
        fieldType: 'single-choice',
        allowCustomInput: true,
        allowSkip: false,
        priority: 1,
        options: [
          { value: '<8k', label: '低于 8k USD' },
          { value: '8k-15k', label: '8k - 15k USD' },
          { value: '>15k', label: '15k USD 以上' },
        ],
        recommended: ['8k-15k'],
      },
      ...common,
    ]
  }

  if (scenario === 'car') {
    return [
      {
        id: `${sessionId}-commute`,
        sessionId,
        question: '你的典型通勤距离和频率如何？',
        purpose: '通勤模式直接影响车的便利性价值和与公共交通的真实比较。',
        fieldType: 'textarea',
        allowCustomInput: true,
        allowSkip: false,
        priority: 1,
      },
      {
        id: `${sessionId}-cash`,
        sessionId,
        question: '你更在意月度现金流压力还是总拥有成本？',
        purpose: '同一方案在月供压力与两年总成本上的结论可能完全不同。',
        fieldType: 'single-choice',
        allowCustomInput: true,
        allowSkip: false,
        priority: 1,
        options: [
          { value: 'cashflow', label: '月度现金流压力' },
          { value: 'total-cost', label: '总拥有成本' },
        ],
        recommended: ['cashflow'],
      },
      ...common,
    ]
  }

  if (scenario === 'graduate') {
    return [
      {
        id: `${sessionId}-goal`,
        sessionId,
        question: '你的长期目标更偏向升学、研究、行业经验积累还是尽快提高收入？',
        purpose: '目标不同，会显著改变“读研”和“先工作”的优先级排序。',
        fieldType: 'multi-choice',
        allowCustomInput: true,
        allowSkip: false,
        priority: 1,
        options: [
          { value: 'research', label: '研究 / 学术积累' },
          { value: 'income', label: '尽快提升收入' },
          { value: 'career', label: '行业经验与简历厚度' },
          { value: 'overseas', label: '海外申请或迁移准备' },
        ],
        recommended: ['career', 'income'],
      },
      {
        id: `${sessionId}-funding`,
        sessionId,
        question: '读研期间的资金来源是否已有明确方案？',
        purpose: '资金可得性会直接改变现金压力、机会成本和行动顺序。',
        fieldType: 'single-choice',
        allowCustomInput: true,
        allowSkip: true,
        priority: 1,
        options: [
          { value: 'self-funded', label: '主要自费' },
          { value: 'family', label: '家庭支持' },
          { value: 'scholarship', label: '奖学金 / 助研助教' },
        ],
        recommended: ['scholarship'],
      },
      ...common,
    ]
  }

  return [
    {
      id: `${sessionId}-success`,
      sessionId,
      question: '如果这个计划做成了，你最在意的结果是什么？',
      purpose: '先明确胜利条件，才能判断成本与风险是否值得承担。',
      fieldType: 'textarea',
      allowCustomInput: true,
      allowSkip: false,
      priority: 1,
    },
    {
      id: `${sessionId}-constraint`,
      sessionId,
      question: '当前最硬的约束条件是什么？',
      purpose: '硬约束决定分析是否应以保守模式推进。',
      fieldType: 'text',
      allowCustomInput: true,
      allowSkip: true,
      priority: 1,
    },
    ...common,
  ]
}

function buildEvidence(sessionId: string, scenario: string): EvidenceItem[] {
  const common: EvidenceItem[] = [
    {
      id: `${sessionId}-e1`,
      sessionId,
      sourceType: 'web',
      sourceUrl: 'https://www.oecd.org',
      sourceName: 'OECD',
      title: 'Macroeconomic benchmark references',
      summary: 'Used as a contextual baseline for cost and salary comparison assumptions.',
      extractedFacts: ['Inflation and wage data should be normalized by region and year.'],
      fetchedAt: iso('2026-03-28T10:30:00+08:00'),
      confidence: 0.84,
    },
  ]

  if (scenario === 'exchange') {
    return [
      ...common,
      {
        id: `${sessionId}-e2`,
        sessionId,
        sourceType: 'web',
        sourceUrl: 'https://www.studyinjapan.go.jp',
        sourceName: 'Study in Japan',
        title: 'Student living cost reference',
        summary: 'Reference living cost ranges for students in Japan, used for monthly estimate validation.',
        extractedFacts: ['Urban regions require a larger housing buffer.', 'Insurance costs vary by program.'],
        fetchedAt: iso('2026-03-28T10:34:00+08:00'),
        confidence: 0.91,
      },
      {
        id: `${sessionId}-e3`,
        sessionId,
        sourceType: 'web',
        sourceUrl: 'https://www.mofa.go.jp',
        sourceName: 'MOFA',
        title: 'Visa application timing notes',
        summary: 'Processing windows suggest a timing buffer should be included in the schedule.',
        extractedFacts: ['Buffer of 2-4 weeks recommended around document review.'],
        fetchedAt: iso('2026-03-28T10:36:00+08:00'),
        confidence: 0.88,
      },
    ]
  }

  if (scenario === 'car') {
    return [
      ...common,
      {
        id: `${sessionId}-e2`,
        sessionId,
        sourceType: 'web',
        sourceUrl: 'https://www.aaa.com',
        sourceName: 'AAA',
        title: 'Vehicle ownership cost benchmark',
        summary: 'Provides annual ownership cost categories used for comparison assumptions.',
        extractedFacts: ['Fuel, maintenance, and depreciation dominate the yearly total.'],
        fetchedAt: iso('2026-03-28T09:50:00+08:00'),
        confidence: 0.86,
      },
    ]
  }

  if (scenario === 'graduate') {
    return [
      ...common,
      {
        id: `${sessionId}-e2`,
        sessionId,
        sourceType: 'web',
        sourceUrl: 'https://gradschool.cornell.edu',
        sourceName: 'Cornell Graduate School',
        title: 'Graduate funding structure examples',
        summary: 'Used to frame scholarship and assistantship availability assumptions.',
        extractedFacts: ['Funding uncertainty should be separated from admission uncertainty.'],
        fetchedAt: iso('2026-03-28T08:40:00+08:00'),
        confidence: 0.82,
      },
    ]
  }

  return common
}

function buildCalculations(sessionId: string, scenario: string): CalculationTask[] {
  if (scenario === 'exchange') {
    return [
      {
        id: `${sessionId}-calc-1`,
        sessionId,
        taskType: 'budget-band',
        formulaExpression: 'tuition + housing + transport + insurance + contingency',
        inputParams: { tuition: 4200, housing: 3600, transport: 850, insurance: 600, contingency: 1200 },
        units: 'USD',
        result: '10450',
        errorMargin: '± 12%',
        createdAt: iso('2026-03-28T10:50:00+08:00'),
      },
      {
        id: `${sessionId}-calc-2`,
        sessionId,
        taskType: 'safety-buffer',
        formulaExpression: 'monthly_runway * 2',
        inputParams: { monthly_runway: 1650 },
        units: 'USD',
        result: '3300',
        errorMargin: 'Suggested safety reserve',
        createdAt: iso('2026-03-28T10:51:00+08:00'),
      },
    ]
  }

  if (scenario === 'car') {
    return [
      {
        id: `${sessionId}-calc-1`,
        sessionId,
        taskType: 'break-even',
        formulaExpression: 'ownership_cost(t) = transit_cost(t)',
        inputParams: { monthly_car: 590, monthly_transit: 340, upfront: 3200 },
        units: 'month',
        result: '19.2',
        errorMargin: 'Sensitive to parking variability',
        createdAt: iso('2026-03-28T09:58:00+08:00'),
      },
    ]
  }

  if (scenario === 'graduate') {
    return [
      {
        id: `${sessionId}-calc-1`,
        sessionId,
        taskType: 'opportunity-cost',
        formulaExpression: 'salary_foregone - scholarship_value + skill_delta',
        inputParams: { salary_foregone: 68000, scholarship_value: 18000, skill_delta: 14000 },
        units: 'CNY equivalent score',
        result: '36000',
        errorMargin: 'Excludes long-tail networking upside',
        createdAt: iso('2026-03-28T08:55:00+08:00'),
      },
    ]
  }

  return [
    {
      id: `${sessionId}-calc-1`,
      sessionId,
      taskType: 'confidence-slope',
      formulaExpression: 'signal_score / uncertainty_count',
      inputParams: { signal_score: 71, uncertainty_count: 5 },
      units: 'index',
      result: '14.2',
      createdAt: iso('2026-03-28T08:10:00+08:00'),
    },
  ]
}

function buildConclusions(sessionId: string, scenario: string) {
  if (scenario === 'exchange') {
    return [
      {
        id: `${sessionId}-c1`,
        sessionId,
        conclusion: '若预算上限低于 10.5k USD 且无额外缓冲，交换方案会显著挤压后续应急能力。',
        conclusionType: 'estimate' as const,
        basisRefs: [`${sessionId}-calc-1`, `${sessionId}-e2`],
        confidence: 0.82,
        createdAt: iso('2026-03-28T10:55:00+08:00'),
      },
      {
        id: `${sessionId}-c2`,
        sessionId,
        conclusion: '学术与国际化收益明确，但签证时序和资金缓冲是当前两大高影响未知项。',
        conclusionType: 'inference' as const,
        basisRefs: [`${sessionId}-e3`],
        confidence: 0.79,
        createdAt: iso('2026-03-28T10:56:00+08:00'),
      },
    ]
  }

  if (scenario === 'car') {
    return [
      {
        id: `${sessionId}-c1`,
        sessionId,
        conclusion: '如果你最看重月度现金流压力，买车不是当前更稳妥的选择。',
        conclusionType: 'inference' as const,
        basisRefs: [`${sessionId}-calc-1`],
        confidence: 0.85,
        createdAt: iso('2026-03-28T10:01:00+08:00'),
      },
    ]
  }

  if (scenario === 'graduate') {
    return [
      {
        id: `${sessionId}-c1`,
        sessionId,
        conclusion: '若核心目标是尽快建立现金流和行业经验，先工作 2 年的稳健性更高。',
        conclusionType: 'inference' as const,
        basisRefs: [`${sessionId}-calc-1`],
        confidence: 0.8,
        createdAt: iso('2026-03-28T09:01:00+08:00'),
      },
      {
        id: `${sessionId}-c2`,
        sessionId,
        conclusion: '若你明确瞄准研究型路线且能落实奖学金，读研路径的长期边际价值更高。',
        conclusionType: 'estimate' as const,
        basisRefs: [`${sessionId}-e2`],
        confidence: 0.77,
        createdAt: iso('2026-03-28T09:03:00+08:00'),
      },
    ]
  }

  return [
    {
      id: `${sessionId}-c1`,
      sessionId,
      conclusion: '当前信息足以形成第一版方向，但仍需围绕硬约束验证可执行性。',
      conclusionType: 'inference' as const,
      basisRefs: [`${sessionId}-calc-1`],
      confidence: 0.71,
      createdAt: iso('2026-03-28T08:14:00+08:00'),
    },
  ]
}

function buildSearchTasks(sessionId: string, scenario: string): SearchTask[] {
  if (scenario === 'exchange') {
    return [
      {
        id: `${sessionId}-s1`,
        sessionId,
        topic: 'Target country living cost',
        goal: 'Validate monthly cost assumption and safe buffer.',
        scope: 'Target city, latest academic year',
        suggestedQueries: ['Japan student living cost 2026', 'exchange student housing cost Tokyo'],
        requiredFields: ['housing', 'food', 'insurance', 'transport'],
        freshnessRequirement: 'high',
        status: 'completed',
      },
      {
        id: `${sessionId}-s2`,
        sessionId,
        topic: 'Visa timing and documentation',
        goal: 'Estimate application critical path.',
        scope: 'Official policy',
        suggestedQueries: ['Japan student exchange visa requirements 2026'],
        requiredFields: ['documents', 'processing time'],
        freshnessRequirement: 'high',
        status: 'completed',
      },
    ]
  }

  if (scenario === 'car') {
    return [
      {
        id: `${sessionId}-s1`,
        sessionId,
        topic: 'Annual cost of car ownership',
        goal: 'Benchmark realistic ownership cost categories.',
        scope: 'US major city benchmark',
        suggestedQueries: ['car ownership annual cost benchmark 2026'],
        requiredFields: ['fuel', 'maintenance', 'insurance', 'depreciation'],
        freshnessRequirement: 'standard',
        status: 'completed',
      },
    ]
  }

  if (scenario === 'graduate') {
    return [
      {
        id: `${sessionId}-s1`,
        sessionId,
        topic: 'Graduate funding examples',
        goal: 'Check funding feasibility assumptions.',
        scope: 'Graduate programs, scholarships',
        suggestedQueries: ['graduate program funding assistantship examples'],
        requiredFields: ['scholarship', 'assistantship', 'timeline'],
        freshnessRequirement: 'standard',
        status: 'completed',
      },
    ]
  }

  return []
}

function buildHighlights(scenario: string): MetricHighlight[] {
  if (scenario === 'exchange') {
    return [
      {
        id: 'h1',
        label: 'Recommended budget floor',
        value: '$10.5k',
        detail: 'Below this, execution risk rises materially.',
      },
      {
        id: 'h2',
        label: 'Career / exposure upside',
        value: '8.7 / 10',
        detail: 'Strong if the program aligns with long-term path.',
      },
      {
        id: 'h3',
        label: 'Primary uncertainty',
        value: 'Visa timing',
        detail: 'Buffer 2-4 weeks before commitment.',
      },
    ]
  }

  if (scenario === 'car') {
    return [
      {
        id: 'h1',
        label: 'Break-even horizon',
        value: '19.2 mo',
        detail: 'Only attractive if convenience value remains high.',
      },
      {
        id: 'h2',
        label: 'Annual fixed burden',
        value: '$9.6k',
        detail: 'Includes parking, maintenance, and depreciation.',
      },
      {
        id: 'h3',
        label: 'Decision cue',
        value: 'Cash flow first',
        detail: 'Transit remains stronger if liquidity matters.',
      },
    ]
  }

  if (scenario === 'graduate') {
    return [
      {
        id: 'h1',
        label: 'Short-term stability winner',
        value: 'Work first',
        detail: 'Less capital pressure and lower execution complexity.',
      },
      {
        id: 'h2',
        label: 'Long-term upside upside',
        value: 'Grad school',
        detail: 'Only if funding and research fit both land.',
      },
      {
        id: 'h3',
        label: 'Info gap',
        value: 'Funding certainty',
        detail: 'Scholarship clarity changes the recommendation.',
      },
    ]
  }

  return [
    {
      id: 'h1',
      label: 'Current confidence',
      value: '71 / 100',
      detail: 'Enough for a first recommendation, not for blind commitment.',
    },
  ]
}

function buildReportMarkdown(problem: string, scenario: string, mode: AnalysisMode) {
  if (scenario === 'exchange') {
    return `# 决策结论\n\n**问题定义**：${problem}\n\n## 一句话判断\n\n若你能把总预算稳定在 **10.5k USD 以上**，并提前锁定签证与课程文件窗口，交换方案值得推进；否则更适合延后或寻找低成本替代。\n\n## 成本清单\n\n- 直接成本：学费差额、住宿、交通、保险与应急缓冲。\n- 隐性成本：准备周期、文件协调、课程互认不确定性。\n- 机会成本：放弃本地实习与稳定现金流机会。\n\n## 风险清单\n\n- 签证时间窗口与材料返工。\n- 预算不足导致的中途策略收缩。\n- 对长期目标不匹配时，回报会明显打折。\n\n## 建议动作\n\n1. 先补齐目标国家与学校的官方费用和签证时间表。\n2. 把安全冗余单独留出，不要把全部预算视作可支配。\n3. 若目标偏就业，确认交换是否能显著增强履历与语言环境。`
  }

  if (scenario === 'car') {
    return `# Decision summary\n\n**Problem**: ${problem}\n\n## Executive view\n\nBuying a car only becomes defensible when convenience has repeated weekly value and your monthly cash flow can absorb the fixed burden without compressing savings.\n\n## Cost view\n\n- Upfront cost is the main drag in the first year.\n- Fixed annual burden remains materially above transit in the base case.\n- Convenience upside is real, but unevenly distributed.\n\n## Recommendation\n\n- If liquidity and optionality are priorities, stay with public transit for now.\n- Reopen the decision only if commute complexity rises or ridehail spending remains persistently high.\n- Track the decision with a 3-month commute diary before committing.`
  }

  if (scenario === 'graduate') {
    return `# 综合建议\n\n**决策目标**：${problem}\n\n## 综合判断\n\n当前更稳妥的默认路径是 **先工作 2 年**，同时保留读研选项；如果你能够拿到明确的奖学金或助研支持，并且目标强烈偏研究型发展，那么读研的长期价值会上升。\n\n## 对比维度\n\n- 现金流压力\n- 职业试错空间\n- 长期学历与研究资产\n- 执行复杂度\n\n## 建议动作\n\n1. 在 3 个月内验证读研资金方案的可实现性。\n2. 同步整理工作路径下的成长节奏与目标岗位要求。\n3. 在明确资助与目标项目匹配前，不建议把读研设为唯一方案。`
  }

  if (mode === 'multi-option') {
    return `# Comparison memo\n\n${problem}\n\nThe current evidence supports a **conditional recommendation**, with preference weighting still deciding the final path.\n\n- Keep the option with lower downside as your default.\n- Promote the high-upside option only when the prerequisite checklist turns green.\n- Re-evaluate after the next evidence refresh.`
  }

  return `# Structured report\n\n${problem}\n\nThis report is an initial decision memo built from structured answers, external evidence, and calculation outputs. The recommendation is bounded and should be revisited when the remaining unknowns resolve.`
}

export function detectScenario(problem: string) {
  const normalized = problem.toLowerCase()

  if (normalized.includes('交换') || normalized.includes('exchange')) {
    return 'exchange'
  }

  if (normalized.includes('买车') || normalized.includes('car')) {
    return 'car'
  }

  if (normalized.includes('研究生') || normalized.includes('graduate')) {
    return 'graduate'
  }

  return 'generic'
}

export function buildScenarioBundle(
  sessionId: string,
  problem: string,
  mode: AnalysisMode,
) {
  const scenario = detectScenario(problem)
  const questions = buildQuestions(sessionId, scenario)
  const evidence = buildEvidence(sessionId, scenario)
  const calculations = buildCalculations(sessionId, scenario)
  const conclusions = buildConclusions(sessionId, scenario)
  const searchTasks = buildSearchTasks(sessionId, scenario)
  const charts =
    scenario === 'exchange'
      ? buildExchangeCharts(sessionId)
      : scenario === 'car'
        ? buildCarCharts(sessionId)
        : scenario === 'graduate'
          ? buildGraduateCharts(sessionId)
          : buildGenericCharts(sessionId)

  const report: AnalysisReport = {
    id: `report-${sessionId}`,
    sessionId,
    mode,
    summaryTitle: problem,
    markdown: buildReportMarkdown(problem, scenario, mode),
    highlights: buildHighlights(scenario),
    calculations,
    charts,
    evidence,
    assumptions: [
      'Assumes user inputs are internally consistent.',
      'External sources are treated as evidence, not final truth.',
      'Ranges separate confirmed facts from inferred values where possible.',
    ],
    disclaimers: [
      'This product supports decisions and does not replace legal, medical, tax, or visa professionals.',
      'High-impact unknowns remain visible and should be resolved before irreversible action.',
    ],
  }

  return {
    scenario,
    questions,
    evidence,
    calculations,
    conclusions,
    searchTasks,
    charts,
    report,
  }
}

function buildSession(
  id: string,
  mode: AnalysisMode,
  problemStatement: string,
  status: AnalysisSession['status'],
  createdAt: string,
  updatedAt: string,
  lastInsight: string,
) {
  const bundle = buildScenarioBundle(id, problemStatement, mode)
  return {
    session: {
      id,
      mode,
      problemStatement,
      status,
      createdAt,
      updatedAt,
      lastInsight,
      questions: bundle.questions,
      answers: [],
      searchTasks: bundle.searchTasks,
      evidence: bundle.evidence,
      conclusions: bundle.conclusions,
      calculations: bundle.calculations,
    } satisfies AnalysisSession,
    report: bundle.report,
  }
}

const exchangeSeed = buildSession(
  'sess-exchange',
  'single-option',
  '我是否应该参加大三的海外交换？',
  'COMPLETED',
  iso('2026-03-28T10:00:00+08:00'),
  iso('2026-03-28T14:42:00+08:00'),
  '预算缓冲和签证时序是当前两大关键变量。',
)

const carSeed = buildSession(
  'sess-car',
  'single-option',
  '我是否应该买车而不是继续公共交通？',
  'COMPLETED',
  iso('2026-03-27T11:20:00+08:00'),
  iso('2026-03-27T16:35:00+08:00'),
  '若现金流优先，公共交通仍是更稳健的默认解。',
)

const gradSeed = buildSession(
  'sess-graduate',
  'multi-option',
  '我现在是否应该申请研究生，还是先工作 2 年？',
  'CLARIFYING',
  iso('2026-03-26T08:20:00+08:00'),
  iso('2026-03-26T09:10:00+08:00'),
  '资金可得性会显著改变建议方向。',
)

export interface MockDatabase {
  users: User[]
  roles: Role[]
  permissions: Permission[]
  notifications: NotificationItem[]
  logs: AuditLogEntry[]
  files: FileItem[]
  sessions: AnalysisSession[]
  reports: Record<string, AnalysisReport>
  settings: SettingsPayload
  progressCursor: Record<string, number>
}

export function createMockDatabase(): MockDatabase {
  return {
    users: structuredClone(users),
    roles: structuredClone(roles),
    permissions: structuredClone(permissions),
    notifications: structuredClone(notificationsSeed),
    logs: structuredClone(logsSeed),
    files: structuredClone(filesSeed),
    sessions: [exchangeSeed.session, carSeed.session, gradSeed.session].map((session) =>
      structuredClone(session),
    ),
    reports: {
      [exchangeSeed.session.id]: structuredClone(exchangeSeed.report),
      [carSeed.session.id]: structuredClone(carSeed.report),
      [gradSeed.session.id]: structuredClone(gradSeed.report),
    },
    settings: structuredClone(defaultSettings),
    progressCursor: {
      [exchangeSeed.session.id]: 4,
      [carSeed.session.id]: 4,
      [gradSeed.session.id]: 1,
    },
  }
}

export function buildDashboardOverview(db: MockDatabase): DashboardOverview {
  return {
    metrics: [
      {
        id: 'm-1',
        label: 'Active sessions',
        value: `${db.sessions.filter((session) => session.status !== 'COMPLETED').length}`,
        change: '+2 today',
        detail: 'Clarifying and analyzing sessions that still need attention.',
      },
      {
        id: 'm-2',
        label: 'Reports exported',
        value: `${db.sessions.filter((session) => session.status === 'COMPLETED').length}`,
        change: '+18%',
        detail: 'Completed reports with structured charts and evidence trails.',
      },
      {
        id: 'm-3',
        label: 'Unread alerts',
        value: `${db.notifications.filter((notification) => !notification.read).length}`,
        change: 'Real-time',
        detail: 'Notifications that should still surface in the operator workflow.',
      },
      {
        id: 'm-4',
        label: 'Confidence trend',
        value: '74 / 100',
        change: '+6 pts',
        detail: 'Composite quality signal across recent decision reports.',
      },
    ],
    recentSessions: db.sessions
      .slice()
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 4)
      .map(({ id, mode, problemStatement, status, createdAt, updatedAt, lastInsight }) => ({
        id,
        mode,
        problemStatement,
        status,
        createdAt,
        updatedAt,
        lastInsight,
      })),
    activity: [
      {
        id: 'a-1',
        title: 'Exchange report finalized',
        detail: 'Markdown, KPI blocks, and chart bundle synchronized.',
        createdAt: iso('2026-03-28T14:42:00+08:00'),
        tone: 'positive',
      },
      {
        id: 'a-2',
        title: 'New clarification round waiting',
        detail: 'Graduate school decision still needs funding certainty.',
        createdAt: iso('2026-03-28T13:10:00+08:00'),
        tone: 'warning',
      },
      {
        id: 'a-3',
        title: 'Cost sensitivity upload indexed',
        detail: 'Commute sensitivity CSV became available for visualization.',
        createdAt: iso('2026-03-28T11:20:00+08:00'),
        tone: 'neutral',
      },
    ],
    charts: [
      {
        id: 'dashboard-trend',
        sessionId: 'dashboard',
        kind: 'line',
        title: 'Recent report confidence trend',
        unit: 'score / 100',
        note: 'Weekly rolling confidence based on available evidence coverage.',
        lineSeries: [
          { label: 'Mar 03', value: 58, nature: 'actual' },
          { label: 'Mar 10', value: 63, nature: 'actual' },
          { label: 'Mar 17', value: 67, nature: 'estimated' },
          { label: 'Mar 24', value: 74, nature: 'actual' },
          { label: 'Mar 28', value: 78, nature: 'estimated' },
        ],
      },
      {
        id: 'dashboard-distribution',
        sessionId: 'dashboard',
        kind: 'bar',
        title: 'Report mix by workflow',
        unit: 'count',
        compareSeries: [
          { label: 'Single option', value: 12, group: 'Workflow', nature: 'actual' },
          { label: 'Multi-option', value: 7, group: 'Workflow', nature: 'actual' },
        ],
      },
    ],
  }
}

export function buildDataVizBundle(db: MockDatabase): DataVizBundle {
  return {
    charts: [
      ...buildDashboardOverview(db).charts,
      {
        id: 'viz-scatter',
        sessionId: 'dashboard',
        kind: 'scatter',
        title: 'Risk vs upside cluster',
        unit: 'score',
        note: 'Aura intensity encodes probability weight; darker points indicate inferred ranges.',
        scatterSeries: [
          { label: 'Exchange', value: 82, group: '61', intensity: 0.8, nature: 'estimated' },
          { label: 'Buy car', value: 59, group: '72', intensity: 0.9, nature: 'estimated' },
          { label: 'Work first', value: 67, group: '44', intensity: 0.7, nature: 'actual' },
          { label: 'Graduate school', value: 80, group: '63', intensity: 0.6, nature: 'estimated' },
        ],
      },
    ],
    notes: [
      'Charts intentionally stay within black, ivory, graphite, and gold to preserve a professional reading rhythm.',
      'Estimated and inferred values are visually separated from confirmed data.',
      'Exports should preserve titles, units, notes, and source references.',
    ],
  }
}
