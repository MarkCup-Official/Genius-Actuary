import { mockRealtimeBus } from '@/lib/mock/realtime-bus'
import { SseRealtimeClient } from '@/lib/realtime/sse'
import { WebSocketRealtimeClient } from '@/lib/realtime/ws'
import type { RealtimeEvent } from '@/types'

type Unsubscribe = () => void

export function subscribeToRealtime(
  apiMode: 'mock' | 'rest',
  onMessage: (event: RealtimeEvent) => void,
): Unsubscribe {
  if (apiMode === 'mock') {
    return mockRealtimeBus.subscribe(onMessage)
  }

  const wsUrl = import.meta.env['VITE_WS_URL'] ?? 'ws://localhost:8000/ws'
  const sseUrl = import.meta.env['VITE_SSE_URL'] ?? '/api/stream/notifications'
  const wsClient = new WebSocketRealtimeClient(wsUrl)

  try {
    return wsClient.connect(onMessage)
  } catch {
    const sseClient = new SseRealtimeClient(sseUrl)
    return sseClient.connect(onMessage)
  }
}
