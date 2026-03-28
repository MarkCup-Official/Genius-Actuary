import type { RealtimeEvent } from '@/types'

export class SseRealtimeClient {
  private source: EventSource | null = null
  private url: string

  constructor(url: string) {
    this.url = url
  }

  connect(onMessage: (event: RealtimeEvent) => void) {
    this.source = new EventSource(this.url)
    this.source.onmessage = (message) => {
      const payload = JSON.parse(String(message.data)) as RealtimeEvent
      onMessage(payload)
    }

    return () => this.source?.close()
  }
}
