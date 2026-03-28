import type { RealtimeEvent } from '@/types'

export class WebSocketRealtimeClient {
  private socket: WebSocket | null = null
  private url: string

  constructor(url: string) {
    this.url = url
  }

  connect(onMessage: (event: RealtimeEvent) => void) {
    this.socket = new WebSocket(this.url)
    this.socket.onmessage = (message) => {
      const payload = JSON.parse(String(message.data)) as RealtimeEvent
      onMessage(payload)
    }

    return () => this.socket?.close()
  }
}
