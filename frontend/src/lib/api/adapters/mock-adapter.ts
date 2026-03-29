import { mockRealtimeBus } from '@/lib/mock/realtime-bus'
import {
  clearBrowserAccount,
  createBrowserBoundUser,
} from '@/lib/auth/browser-account'
import {
  analysisModes,
  buildDashboardOverview,
  buildDataVizBundle,
  buildScenarioBundle,
  createMockDatabase,
} from '@/lib/mock/data'
import type { ApiAdapter } from '@/lib/api/adapters/base'
import type { BackendSession } from '@/lib/api/adapters/genius-backend'
import { useAppStore } from '@/lib/store/app-store'
import type {
  AnalysisProgress,
  AnalysisSession,
  AuditLogEntry,
  FileItem,
  NotificationItem,
  PaginatedResponse,
  RequestMeta,
  ResourceRecord,
} from '@/types'

const db = createMockDatabase()
const customResources: Record<string, ResourceRecord[]> = {}

const wait = async (duration = 220) =>
  new Promise((resolve) => window.setTimeout(resolve, duration))

const nowIso = () => new Date().toISOString()

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`
}

function paginate<T>(items: T[], meta?: RequestMeta): PaginatedResponse<T> {
  const page = meta?.page ?? 1
  const pageSize = meta?.pageSize ?? 10
  const start = (page - 1) * pageSize
  const pagedItems = items.slice(start, start + pageSize)

  return {
    items: pagedItems,
    page,
    pageSize,
    total: items.length,
    nextPage: start + pageSize < items.length ? page + 1 : undefined,
  }
}

function matchQuery(text: string, q?: string) {
  if (!q) {
    return true
  }

  return text.toLowerCase().includes(q.toLowerCase())
}

function pushNotification(notification: NotificationItem) {
  db.notifications.unshift(notification)
  mockRealtimeBus.emit({
    type: 'NOTIFICATION_CREATED',
    payload: {
      id: notification.id,
      title: notification.title,
      read: notification.read,
    },
  })
}

function pushLog(entry: AuditLogEntry) {
  db.logs.unshift(entry)
  mockRealtimeBus.emit({
    type: 'AUDIT_LOG_ADDED',
    payload: {
      id: entry.id,
      action: entry.action,
      status: entry.status,
    },
  })
}

function sessionSummary(session: AnalysisSession) {
  const {
    id,
    mode,
    problemStatement,
    status,
    createdAt,
    updatedAt,
    lastInsight,
  } = session
  return {
    id,
    mode,
    problemStatement,
    status,
    createdAt,
    updatedAt,
    lastInsight,
  }
}

function ensureMockBrowserUser() {
  const browserUser = createBrowserBoundUser()
  const existingUser = db.users.find(
    (candidate) => candidate.id === browserUser.id,
  )

  if (existingUser) {
    existingUser.name = browserUser.name
    existingUser.email = browserUser.email
    existingUser.title = browserUser.title
    existingUser.locale = browserUser.locale
    existingUser.roles = browserUser.roles
    existingUser.lastActiveAt = browserUser.lastActiveAt
    return existingUser
  }

  db.users.unshift(browserUser)
  return browserUser
}

function resolveCurrentUser() {
  return useAppStore.getState().currentUser ?? ensureMockBrowserUser()
}

function resourceRecords(resourceKey: string): ResourceRecord[] {
  const baseRecords = (() => {
    switch (resourceKey) {
      case 'analyses':
        return db.sessions.map((session) => ({
          id: session.id,
          title: session.problemStatement,
          subtitle: session.mode,
          status: session.status,
          updatedAt: session.updatedAt,
          createdAt: session.createdAt,
        }))
      case 'users':
        return db.users.map((user) => ({
          id: user.id,
          title: user.name,
          subtitle: user.email,
          status: user.roles.join(', '),
          updatedAt: user.lastActiveAt,
          titleValue: user.title,
        }))
      case 'roles':
        return db.roles.map((role) => ({
          id: role.id,
          title: role.name,
          subtitle: role.description,
          status: `${role.memberCount} members`,
          updatedAt: nowIso(),
        }))
      case 'notifications':
        return db.notifications.map((notification) => ({
          id: notification.id,
          title: notification.title,
          subtitle: notification.message,
          status: notification.read ? 'read' : 'unread',
          updatedAt: notification.createdAt,
        }))
      case 'logs':
        return db.logs.map((log) => ({
          id: log.id,
          title: log.action,
          subtitle: log.summary,
          status: log.status,
          updatedAt: log.createdAt,
        }))
      case 'files':
        return db.files.map((file) => ({
          id: file.id,
          title: file.name,
          subtitle: file.mime,
          status: file.status,
          updatedAt: file.createdAt,
        }))
      default:
        return []
    }
  })()

  const customRecords = customResources[resourceKey] ?? []
  const merged = new Map<string, ResourceRecord>()

  baseRecords.forEach((record) => merged.set(record.id, record))
  customRecords.forEach((record) => merged.set(record.id, record))

  return Array.from(merged.values())
}

function findUser(userId: string) {
  const user = db.users.find((candidate) => candidate.id === userId)
  if (!user) {
    throw new Error(`Unknown user: ${userId}`)
  }

  return user
}

function findRole(roleId: string) {
  const role = db.roles.find((candidate) => candidate.id === roleId)
  if (!role) {
    throw new Error(`Unknown role: ${roleId}`)
  }

  return role
}

function findSession(sessionId: string) {
  const session = db.sessions.find((candidate) => candidate.id === sessionId)
  if (!session) {
    throw new Error(`Unknown session: ${sessionId}`)
  }

  return session
}

function phaseStatus(
  cursor: number,
  index: number,
): AnalysisProgress['stages'][number]['status'] {
  if (index < cursor) {
    return 'completed'
  }

  if (index === cursor) {
    return 'active'
  }

  return 'pending'
}

function toDebugMode(mode: AnalysisSession['mode']): BackendSession['mode'] {
  return mode === 'multi-option' ? 'multi_option' : 'single_decision'
}

export const mockApiAdapter: ApiAdapter = {
  auth: {
    async login() {
      await wait()

      return {
        accessToken: 'mock_cookie_session',
        refreshToken: 'mock_cookie_session',
        user: ensureMockBrowserUser(),
      }
    },
    async logout() {
      await wait(100)
      clearBrowserAccount()
    },
    async me() {
      await wait(120)
      return resolveCurrentUser()
    },
    async deletePersonalData() {
      await wait(120)
      clearBrowserAccount()
      const deletedSessionCount = db.sessions.length
      db.sessions = []
      db.logs = []
      db.notifications = []
      db.files = []
      Object.keys(db.reports).forEach((key) => delete db.reports[key])
      Object.keys(db.progressCursor).forEach(
        (key) => delete db.progressCursor[key],
      )
      return { deletedSessionCount }
    },
  },
  modes: {
    async list() {
      await wait(120)
      return analysisModes
    },
  },
  dashboard: {
    async getOverview() {
      await wait()
      return buildDashboardOverview(db)
    },
  },
  analysis: {
    async list(meta) {
      await wait()
      const filtered = db.sessions.filter((session) =>
        matchQuery(
          `${session.problemStatement} ${session.lastInsight}`,
          meta?.q,
        ),
      )
      return paginate(
        filtered.map((session) => ({ ...session })),
        meta,
      )
    },
    async create(payload) {
      await wait()

      const sessionId = createId('sess')
      const bundle = buildScenarioBundle(
        sessionId,
        payload.problemStatement,
        payload.mode,
      )
      const session: AnalysisSession = {
        id: sessionId,
        mode: payload.mode,
        problemStatement: payload.problemStatement,
        status: 'CLARIFYING',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        followUpRoundLimit: 10,
        followUpRoundsUsed: 0,
        followUpExtensionsUsed: 0,
        followUpBudgetExhausted: false,
        deferredFollowUpQuestionCount: 0,
        lastInsight:
          'The first clarification round focuses on constraints and success criteria.',
        questions: bundle.questions,
        answers: [],
        searchTasks: bundle.searchTasks,
        evidence: bundle.evidence,
        conclusions: bundle.conclusions,
        calculations: bundle.calculations,
      }

      db.sessions.unshift(session)
      db.reports[session.id] = bundle.report
      db.progressCursor[session.id] = 0

      pushLog({
        id: createId('log'),
        action: 'SESSION_CREATED',
        actor: resolveCurrentUser().name,
        target: session.id,
        ipAddress: 'mock',
        createdAt: nowIso(),
        status: 'success',
        summary: `Created ${payload.mode} analysis for ${payload.problemStatement}`,
        metadata: {
          mode: payload.mode,
        },
      })

      return { ...session }
    },
    async getById(sessionId) {
      await wait(120)
      return { ...findSession(sessionId) }
    },
    async submitAnswers(sessionId, payload) {
      await wait()
      const session = findSession(sessionId)
      session.answers = payload.answers
      session.status = 'ANALYZING'
      session.updatedAt = nowIso()
      session.lastInsight =
        'Inputs accepted. Evidence stitching and calculation stages are underway.'
      db.progressCursor[session.id] = 0

      pushNotification({
        id: createId('n'),
        title: 'Analysis started',
        message: `Session ${session.id} has started structured evidence synthesis.`,
        level: 'info',
        channel: 'in-app',
        read: false,
        createdAt: nowIso(),
      })

      mockRealtimeBus.emit({
        type: 'SESSION_UPDATED',
        payload: sessionSummary(session),
      })

      return { ...session }
    },
    async requestMoreFollowUp(sessionId) {
      await wait(160)
      const session = findSession(sessionId)
      session.followUpRoundsUsed = 0
      session.followUpExtensionsUsed = (session.followUpExtensionsUsed ?? 0) + 1
      session.followUpBudgetExhausted = false
      session.deferredFollowUpQuestionCount = 0
      session.status = 'CLARIFYING'
      session.updatedAt = nowIso()
      return { ...session }
    },
    async getProgress(sessionId) {
      await wait(180)
      const session = findSession(sessionId)
      const stages = [
        {
          id: 'understand',
          title: 'Normalize context',
          description:
            'Consolidating user facts, constraints, and prior answers.',
        },
        {
          id: 'search',
          title: 'Gather evidence',
          description: 'Reconciling search tasks and source confidence.',
        },
        {
          id: 'calculate',
          title: 'Resolve calculations',
          description: 'Running break-even, sensitivity, and threshold checks.',
        },
        {
          id: 'compose',
          title: 'Compose report',
          description:
            'Rendering markdown, KPI blocks, charts, and disclaimer sections.',
        },
      ]

      if (session.status === 'ANALYZING') {
        db.progressCursor[session.id] = Math.min(
          (db.progressCursor[session.id] ?? 0) + 1,
          stages.length,
        )
        const cursor = db.progressCursor[session.id]

        if (cursor >= stages.length) {
          session.status = 'COMPLETED'
          session.updatedAt = nowIso()
          session.lastInsight =
            'Final report and chart artifacts are ready for review.'

          pushNotification({
            id: createId('n'),
            title: 'Report ready',
            message: `${session.problemStatement} has completed successfully.`,
            level: 'success',
            channel: 'in-app',
            read: false,
            createdAt: nowIso(),
          })

          pushLog({
            id: createId('log'),
            action: 'REPORT_READY',
            actor: 'System',
            target: session.id,
            ipAddress: 'mock',
            createdAt: nowIso(),
            status: 'success',
            summary:
              'Completed staged analysis and assembled final report bundle.',
            metadata: {
              session: session.id,
            },
          })

          mockRealtimeBus.emit({
            type: 'REPORT_READY',
            payload: { sessionId: session.id },
          })
        }
      }

      const cursor = Math.min(db.progressCursor[session.id] ?? 0, stages.length)

      return {
        sessionId: session.id,
        status: session.status,
        overallProgress: Math.round((cursor / stages.length) * 100),
        currentStepLabel:
          session.status === 'COMPLETED'
            ? 'Report ready'
            : (stages[Math.min(cursor, stages.length - 1)]?.title ??
              'Preparing'),
        stages: stages.map((stage, index) => ({
          ...stage,
          status: phaseStatus(cursor, index),
        })),
      }
    },
    async getReport(sessionId) {
      await wait(150)
      return structuredClone(db.reports[sessionId])
    },
  },
  settings: {
    async get() {
      await wait(120)
      return structuredClone(db.settings)
    },
    async update(payload) {
      await wait(140)
      db.settings = structuredClone(payload)
      return structuredClone(db.settings)
    },
  },
  profile: {
    async get() {
      await wait(120)
      const user = resolveCurrentUser()
      return {
        ...user,
        bio: 'This browser keeps your analysis history and preferences together in one workspace.',
        timezone: 'Asia/Shanghai',
        preferences: db.settings,
        history: db.sessions.map(sessionSummary).slice(0, 6),
      }
    },
  },
  admin: {
    async listRoles() {
      await wait(120)
      return structuredClone(db.roles)
    },
    async listUsers() {
      await wait(120)
      return structuredClone(db.users)
    },
    async updateUserRole(userId, roleIds) {
      await wait(180)
      roleIds.forEach(findRole)
      const user = findUser(userId)
      user.roles = roleIds
      user.lastActiveAt = nowIso()
      return structuredClone(user)
    },
  },
  notifications: {
    async list() {
      await wait(120)
      return structuredClone(db.notifications)
    },
    async markRead(notificationId) {
      await wait(80)
      const notification = db.notifications.find(
        (candidate) => candidate.id === notificationId,
      )
      if (notification) {
        notification.read = true
      }
    },
    async markAllRead() {
      await wait(80)
      db.notifications = db.notifications.map((notification) => ({
        ...notification,
        read: true,
      }))
    },
  },
  logs: {
    async list(meta) {
      await wait(120)
      const filtered = db.logs.filter((log) =>
        matchQuery(`${log.action} ${log.summary} ${log.target}`, meta?.q),
      )
      return paginate(filtered, meta)
    },
    async getById(logId) {
      await wait(80)
      const log = db.logs.find((candidate) => candidate.id === logId)
      if (!log) {
        throw new Error(`Unknown log: ${logId}`)
      }

      return structuredClone(log)
    },
  },
  debug: {
    async listSessions() {
      await wait(120)
      return db.sessions
        .map((session) => ({
          id: session.id,
          ownerClientId: 'mock-debug-owner',
          mode: toDebugMode(session.mode),
          problemStatement: session.problemStatement,
          status: session.status,
          eventCount:
            session.answers.length +
            session.searchTasks.length +
            session.evidence.length +
            1,
          answerCount: session.answers.length,
          evidenceCount: session.evidence.length,
          searchTaskCount: session.searchTasks.length,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        }))
        .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    },
    async getSession(sessionId) {
      await wait(120)
      const session = findSession(sessionId)
      return {
        summary: {
          id: session.id,
          ownerClientId: 'mock-debug-owner',
          mode: toDebugMode(session.mode),
          problemStatement: session.problemStatement,
          status: session.status,
          eventCount:
            session.answers.length +
            session.searchTasks.length +
            session.evidence.length +
            1,
          answerCount: session.answers.length,
          evidenceCount: session.evidence.length,
          searchTaskCount: session.searchTasks.length,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt,
        },
        session: {
          session_id: session.id,
          owner_client_id: 'mock-debug-owner',
          mode: toDebugMode(session.mode),
          problem_statement: session.problemStatement,
          status: session.status,
          analysis_rounds_completed: session.status === 'COMPLETED' ? 1 : 0,
          follow_up_round_limit: session.followUpRoundLimit ?? 10,
          follow_up_rounds_used: session.followUpRoundsUsed ?? 0,
          follow_up_extensions_used: session.followUpExtensionsUsed ?? 0,
          follow_up_budget_exhausted: session.followUpBudgetExhausted ?? false,
          deferred_follow_up_question_count:
            session.deferredFollowUpQuestionCount ?? 0,
          activity_status:
            session.status === 'COMPLETED'
              ? 'completed'
              : session.status === 'ANALYZING'
                ? 'running_mock_analysis_pipeline'
                : 'waiting_for_user_clarification_answers',
          current_focus:
            session.status === 'COMPLETED'
              ? 'Mock report is ready for review.'
              : session.status === 'ANALYZING'
                ? 'Mock evidence gathering and calculations are in progress.'
                : 'Mock session is waiting for user clarification answers.',
          last_stop_reason:
            session.status === 'COMPLETED'
              ? 'The mock analysis completed successfully.'
              : session.status === 'ANALYZING'
                ? 'The mock pipeline is still processing staged analysis work.'
                : 'The mock session has unanswered clarification questions.',
          clarification_questions: session.questions.map((question) => ({
            question_id: question.id,
            question_text: question.question,
            purpose: question.purpose,
            options: question.options?.map((option) => option.label) ?? [],
            allow_custom_input: question.allowCustomInput,
            allow_skip: question.allowSkip,
            priority: question.priority,
            answered: session.answers.some(
              (answer) => answer.questionId === question.id,
            ),
          })),
          answers: session.answers.map((answer) => ({
            question_id: answer.questionId,
            value:
              answer.customInput ??
              answer.selectedOptions?.join(', ') ??
              String(answer.numericValue ?? answer.answerStatus),
            source: 'mock-frontend',
            answered_at: session.updatedAt,
          })),
          search_tasks: session.searchTasks.map((task) => ({
            task_id: task.id,
            search_topic: task.topic,
            search_goal: task.goal,
            search_scope: task.scope,
            suggested_queries: task.suggestedQueries,
            required_fields: task.requiredFields,
            freshness_requirement: task.freshnessRequirement,
            status: task.status,
          })),
          calculation_tasks: session.calculations.map((task) => ({
            task_id: task.id,
            objective: task.taskType,
            formula_hint: task.formulaExpression,
            input_params: task.inputParams,
            status: task.result,
          })),
          evidence_items: session.evidence.map((item) => ({
            evidence_id: item.id,
            title: item.title,
            source_url: item.sourceUrl,
            source_name: item.sourceName,
            fetched_at: item.fetchedAt,
            summary: item.summary,
            extracted_facts: item.extractedFacts,
            confidence: item.confidence,
          })),
          chart_artifacts: [],
          major_conclusions: session.conclusions.map((item) => ({
            conclusion_id: item.id,
            content: item.conclusion,
            conclusion_type: item.conclusionType,
            basis_refs: item.basisRefs,
            confidence: item.confidence,
          })),
          report: null,
          events: [
            {
              timestamp: session.createdAt,
              kind: 'session_created',
              payload: {
                mode: session.mode,
              },
            },
            ...session.answers.map((answer, index) => ({
              timestamp: session.updatedAt,
              kind: 'answer_recorded',
              payload: {
                order: index + 1,
                question_id: answer.questionId,
              },
            })),
          ],
          created_at: session.createdAt,
          updated_at: session.updatedAt,
        },
      }
    },
  },
  files: {
    async list() {
      await wait(120)
      return structuredClone(db.files)
    },
    async upload(payload) {
      await wait(260)
      const file = {
        id: createId('f'),
        name: payload.fileName,
        size: payload.size,
        mime: payload.mime,
        intent: payload.intent,
        status: 'available',
        tags: ['uploaded'],
        createdAt: nowIso(),
      } satisfies FileItem

      db.files.unshift(file)

      mockRealtimeBus.emit({
        type: 'FILE_UPLOADED',
        payload: file,
      })

      return structuredClone(file)
    },
  },
  dataviz: {
    async getBundle() {
      await wait()
      return buildDataVizBundle(db)
    },
  },
  resources: {
    async list(resourceKey, meta) {
      await wait(160)
      const filtered = resourceRecords(resourceKey).filter((record) =>
        matchQuery(`${record.title} ${record.subtitle ?? ''}`, meta?.q),
      )
      return paginate(filtered, meta)
    },
    async getById(resourceKey, recordId) {
      await wait(100)
      const record = resourceRecords(resourceKey).find(
        (item) => item.id === recordId,
      )
      if (!record) {
        throw new Error(`Unknown record ${resourceKey}/${recordId}`)
      }

      return structuredClone(record)
    },
    async save(resourceKey, record) {
      await wait(180)
      const currentRecords = resourceRecords(resourceKey)
      const existing = currentRecords.find((item) => item.id === record.id)
      const savedRecord: ResourceRecord = {
        id: record.id ?? createId(resourceKey),
        title: String(record.title ?? existing?.title ?? 'Untitled resource'),
        subtitle: String(record.subtitle ?? existing?.subtitle ?? ''),
        status: String(record.status ?? existing?.status ?? 'draft'),
        updatedAt: nowIso(),
      }

      if (resourceKey === 'roles') {
        const target = existing ? findRole(existing.id) : null
        if (target) {
          target.description = savedRecord.subtitle ?? ''
        } else {
          db.roles.push({
            id: savedRecord.id,
            name: savedRecord.title,
            description: savedRecord.subtitle ?? '',
            permissions: ['analysis.run'],
            memberCount: 0,
          })
        }
      } else {
        const existingCustomRecords = customResources[resourceKey] ?? []
        const nextRecords = existingCustomRecords.filter(
          (item) => item.id !== savedRecord.id,
        )
        nextRecords.unshift(savedRecord)
        customResources[resourceKey] = nextRecords
      }

      return savedRecord
    },
  },
}
