import type { RealtimeEvent } from '@/types'

type EventHandler = (event: RealtimeEvent) => void

class MockRealtimeBus {
  private handlers = new Set<EventHandler>()

  subscribe(handler: EventHandler) {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  emit(event: RealtimeEvent) {
    this.handlers.forEach((handler) => handler(event))
  }
}

export const mockRealtimeBus = new MockRealtimeBus()
