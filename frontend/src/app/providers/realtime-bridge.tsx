import { useQueryClient } from '@tanstack/react-query'
import { type PropsWithChildren, useEffect } from 'react'

import { resolveRuntimeApiMode } from '@/lib/api/runtime-mode'
import { subscribeToRealtime } from '@/lib/realtime/realtime-client'
import { useAppStore } from '@/lib/store/app-store'
import type { RealtimeEvent } from '@/types'

function handleRealtimeEvent(queryClient: ReturnType<typeof useQueryClient>, event: RealtimeEvent) {
  switch (event.type) {
    case 'NOTIFICATION_CREATED':
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      break
    case 'SESSION_UPDATED':
      void queryClient.invalidateQueries({ queryKey: ['analysis'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      break
    case 'REPORT_READY':
      void queryClient.invalidateQueries({ queryKey: ['analysis'] })
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      break
    case 'AUDIT_LOG_ADDED':
      void queryClient.invalidateQueries({ queryKey: ['logs'] })
      break
    case 'FILE_UPLOADED':
      void queryClient.invalidateQueries({ queryKey: ['files'] })
      break
  }
}

export function RealtimeBridge({ children }: PropsWithChildren) {
  const queryClient = useQueryClient()
  const apiMode = useAppStore((state) => state.apiMode)
  const runtimeApiMode = resolveRuntimeApiMode(apiMode)

  useEffect(
    () =>
      subscribeToRealtime(runtimeApiMode, (event) =>
        handleRealtimeEvent(queryClient, event),
      ),
    [queryClient, runtimeApiMode],
  )

  return children
}
