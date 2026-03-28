import { useQuery } from '@tanstack/react-query'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { Outlet, useLocation } from 'react-router-dom'

import { Sidebar } from '@/components/layout/sidebar'
import { Topbar } from '@/components/layout/topbar'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { useAppStore } from '@/lib/store/app-store'

export function AppShell() {
  const location = useLocation()
  const reducedMotion = useReducedMotion()
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const adapter = useApiAdapter()

  const notificationsQuery = useQuery({
    queryKey: ['notifications', 'summary'],
    queryFn: adapter.notifications.list,
  })

  const unreadCount = notificationsQuery.data?.filter((notification) => !notification.read).length ?? 0

  return (
    <div className="min-h-screen bg-app-bg p-4 text-text-primary">
      <div className="mx-auto flex max-w-[1600px] gap-4">
        <Sidebar collapsed={!sidebarOpen} unreadCount={unreadCount} />
        <div className="flex min-h-[calc(100vh-2rem)] min-w-0 flex-1 flex-col">
          <Topbar />
          <AnimatePresence mode="wait">
            <motion.main
              key={location.pathname}
              initial={reducedMotion ? undefined : { opacity: 0, y: 12 }}
              animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
              className="min-w-0 flex-1"
            >
              <Outlet />
            </motion.main>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
