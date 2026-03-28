import { mockRealtimeBus } from '@/lib/mock/realtime-bus'
import {
  analysisModes,
  buildDashboardOverview,
  buildDataVizBundle,
  buildScenarioBundle,
  createMockDatabase,
  users,
} from '@/lib/mock/data'
import type { ApiAdapter } from '@/lib/api/adapters/base'
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
  const { id, mode, problemStatement, status, createdAt, updatedAt, lastInsight } = session
  return { id, mode, problemStatement, status, createdAt, updatedAt, lastInsight }
}

function resolveCurrentUser() {
  return useAppStore.getState().currentUser ?? users[0]
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

function phaseStatus(cursor: number, index: number): AnalysisProgress['stages'][number]['status'] {
  if (index < cursor) {
    return 'completed'
  }

  if (index === cursor) {
    return 'active'
  }

  return 'pending'
}

export const mockApiAdapter: ApiAdapter = {
  auth: {
    async login(payload) {
      await wait()

      if (
        payload.email !== 'analyst@geniusactuary.ai' ||
        payload.password !== 'password123' ||
        payload.mfaCode !== '123456'
      ) {
        throw new Error('Invalid demo credentials.')
      }

      return {
        accessToken: 'mock_access_token',
        refreshToken: 'mock_refresh_token',
        user: db.users[0],
      }
    },
    async logout() {
      await wait(100)
    },
    async me() {
      await wait(120)
      return resolveCurrentUser()
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
        matchQuery(`${session.problemStatement} ${session.lastInsight}`, meta?.q),
      )
      return paginate(filtered.map((session) => ({ ...session })), meta)
    },
    async create(payload) {
      await wait()

      const sessionId = createId('sess')
      const bundle = buildScenarioBundle(sessionId, payload.problemStatement, payload.mode)
      const session: AnalysisSession = {
        id: sessionId,
        mode: payload.mode,
        problemStatement: payload.problemStatement,
        status: 'CLARIFYING',
        createdAt: nowIso(),
        updatedAt: nowIso(),
        lastInsight: 'The first clarification round focuses on constraints and success criteria.',
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
      session.lastInsight = 'Inputs accepted. Evidence stitching and calculation stages are underway.'
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
    async getProgress(sessionId) {
      await wait(180)
      const session = findSession(sessionId)
      const stages = [
        {
          id: 'understand',
          title: 'Normalize context',
          description: 'Consolidating user facts, constraints, and prior answers.',
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
          description: 'Rendering markdown, KPI blocks, charts, and disclaimer sections.',
        },
      ]

      if (session.status === 'ANALYZING') {
        db.progressCursor[session.id] = Math.min((db.progressCursor[session.id] ?? 0) + 1, stages.length)
        const cursor = db.progressCursor[session.id]

        if (cursor >= stages.length) {
          session.status = 'COMPLETED'
          session.updatedAt = nowIso()
          session.lastInsight = 'Final report and chart artifacts are ready for review.'

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
            summary: 'Completed staged analysis and assembled final report bundle.',
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
            : stages[Math.min(cursor, stages.length - 1)]?.title ?? 'Preparing',
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
        bio: 'Owns the decision analysis workflow, scenario framing, and report quality gate.',
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
      const notification = db.notifications.find((candidate) => candidate.id === notificationId)
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
      const record = resourceRecords(resourceKey).find((item) => item.id === recordId)
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
        const nextRecords = existingCustomRecords.filter((item) => item.id !== savedRecord.id)
        nextRecords.unshift(savedRecord)
        customResources[resourceKey] = nextRecords
      }

      return savedRecord
    },
  },
}
