export const endpoints = {
  backend: {
    health: '/health',
    bootstrap: '/api/frontend/bootstrap',
    sessions: '/api/sessions',
    sessionDetail: (sessionId: string) => `/api/sessions/${sessionId}`,
    sessionStep: (sessionId: string) => `/api/sessions/${sessionId}/step`,
  },
  auth: {
    login: '/api/auth/login',
    refresh: '/api/auth/refresh',
    me: '/api/auth/me',
    logout: '/api/auth/logout',
  },
  dashboard: '/api/dashboard',
  analysis: {
    list: '/api/analysis/sessions',
    create: '/api/analysis/sessions',
    detail: (sessionId: string) => `/api/analysis/sessions/${sessionId}`,
    questions: (sessionId: string) => `/api/analysis/sessions/${sessionId}/questions`,
    answers: (sessionId: string) => `/api/analysis/sessions/${sessionId}/answers`,
    progress: (sessionId: string) => `/api/analysis/sessions/${sessionId}/progress`,
    report: (sessionId: string) => `/api/analysis/sessions/${sessionId}/report`,
  },
  settings: '/api/settings',
  profile: '/api/profile',
  admin: {
    roles: '/api/roles',
    users: '/api/users',
    userRoles: (userId: string) => `/api/users/${userId}/roles`,
  },
  notifications: {
    list: '/api/notifications',
    detail: (notificationId: string) => `/api/notifications/${notificationId}`,
    readAll: '/api/notifications/read-all',
  },
  logs: {
    list: '/api/audit/logs',
    detail: (logId: string) => `/api/audit/logs/${logId}`,
  },
  files: {
    list: '/api/files',
    detail: (fileId: string) => `/api/files/${fileId}`,
  },
  dataviz: '/api/dataviz',
  resources: {
    collection: (resourceKey: string) => `/api/resources/${resourceKey}`,
    detail: (resourceKey: string, recordId: string) => `/api/resources/${resourceKey}/${recordId}`,
  },
} as const
