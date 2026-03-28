/* eslint-disable react-refresh/only-export-components */
import { Suspense, lazy, type ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'

import { Skeleton } from '@/components/feedback/skeleton'
import { AppShell } from '@/components/layout/app-shell'
import { DebugShell } from '@/components/layout/debug-shell'
import { RequireAuth } from '@/features/auth/require-auth'
import { RequireDebugAuth } from '@/features/logs/require-debug-auth'

const LoginPage = lazy(() => import('@/features/auth/login-page').then((module) => ({ default: module.LoginPage })))
const DashboardPage = lazy(() =>
  import('@/features/dashboard/dashboard-page').then((module) => ({ default: module.DashboardPage })),
)
const ModeSelectionPage = lazy(() =>
  import('@/features/analysis/pages/mode-selection-page').then((module) => ({ default: module.ModeSelectionPage })),
)
const ProblemInputPage = lazy(() =>
  import('@/features/analysis/pages/problem-input-page').then((module) => ({ default: module.ProblemInputPage })),
)
const ClarificationPage = lazy(() =>
  import('@/features/analysis/pages/clarification-page').then((module) => ({ default: module.ClarificationPage })),
)
const ProgressPage = lazy(() =>
  import('@/features/analysis/pages/progress-page').then((module) => ({ default: module.ProgressPage })),
)
const ReportPage = lazy(() =>
  import('@/features/analysis/pages/report-page').then((module) => ({ default: module.ReportPage })),
)
const SettingsPage = lazy(() =>
  import('@/features/settings/settings-page').then((module) => ({ default: module.SettingsPage })),
)
const ProfilePage = lazy(() =>
  import('@/features/user-profile/profile-page').then((module) => ({ default: module.ProfilePage })),
)
const RolesPage = lazy(() => import('@/features/admin/roles-page').then((module) => ({ default: module.RolesPage })))
const NotificationsCenterPage = lazy(() =>
  import('@/features/notifications/notifications-center-page').then((module) => ({
    default: module.NotificationsCenterPage,
  })),
)
const AuditLogPage = lazy(() =>
  import('@/features/logs/audit-log-page').then((module) => ({ default: module.AuditLogPage })),
)
const DebugLoginPage = lazy(() =>
  import('@/features/logs/debug-login-page').then((module) => ({ default: module.DebugLoginPage })),
)
const SessionDebugPage = lazy(() =>
  import('@/features/logs/session-debug-page').then((module) => ({ default: module.SessionDebugPage })),
)
const FileManagerPage = lazy(() =>
  import('@/features/files/file-manager-page').then((module) => ({ default: module.FileManagerPage })),
)
const DataVizPage = lazy(() =>
  import('@/features/dataviz/data-viz-page').then((module) => ({ default: module.DataVizPage })),
)
const ResourceListPage = lazy(() =>
  import('@/features/resources/resource-list-page').then((module) => ({ default: module.ResourceListPage })),
)
const ResourceFormPage = lazy(() =>
  import('@/features/resources/resource-form-page').then((module) => ({ default: module.ResourceFormPage })),
)
const ResourceDetailPage = lazy(() =>
  import('@/features/resources/resource-detail-page').then((module) => ({ default: module.ResourceDetailPage })),
)

function RouteFallback() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-20 w-full" />
      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
        <Skeleton className="h-52 w-full" />
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  )
}

function withRouteSuspense(element: ReactNode) {
  return <Suspense fallback={<RouteFallback />}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: withRouteSuspense(<LoginPage />),
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: '/dashboard', element: withRouteSuspense(<DashboardPage />) },
          { path: '/analysis/modes', element: withRouteSuspense(<ModeSelectionPage />) },
          { path: '/analysis/intake', element: withRouteSuspense(<ProblemInputPage />) },
          {
            path: '/analysis/session/:sessionId/clarify',
            element: withRouteSuspense(<ClarificationPage />),
          },
          {
            path: '/analysis/session/:sessionId/progress',
            element: withRouteSuspense(<ProgressPage />),
          },
          { path: '/analysis/session/:sessionId/report', element: withRouteSuspense(<ReportPage />) },
          { path: '/settings', element: withRouteSuspense(<SettingsPage />) },
          { path: '/profile', element: withRouteSuspense(<ProfilePage />) },
          { path: '/notifications', element: withRouteSuspense(<NotificationsCenterPage />) },
          { path: '/files', element: withRouteSuspense(<FileManagerPage />) },
          { path: '/dataviz', element: withRouteSuspense(<DataVizPage />) },
          { path: '/resources/:resourceKey', element: withRouteSuspense(<ResourceListPage />) },
          { path: '/resources/:resourceKey/new', element: withRouteSuspense(<ResourceFormPage />) },
          {
            path: '/resources/:resourceKey/:recordId',
            element: withRouteSuspense(<ResourceDetailPage />),
          },
          {
            path: '/resources/:resourceKey/:recordId/edit',
            element: withRouteSuspense(<ResourceFormPage />),
          },
        ],
      },
    ],
  },
  {
    path: '/debug/login',
    element: withRouteSuspense(<DebugLoginPage />),
  },
  {
    element: <RequireDebugAuth />,
    children: [
      {
        element: <DebugShell />,
        children: [
          { path: '/debug', element: <Navigate to="/debug/logs" replace /> },
          { path: '/debug/logs', element: withRouteSuspense(<AuditLogPage />) },
          { path: '/debug/sessions', element: withRouteSuspense(<SessionDebugPage />) },
          { path: '/debug/admin/roles', element: withRouteSuspense(<RolesPage />) },
        ],
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
])
