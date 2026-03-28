import { useAppStore } from '@/lib/store/app-store'
import { endpoints } from '@/lib/api/endpoints'
import type { AuthTokens } from '@/types'

const COOKIE_SESSION_PREFIX = 'backend-cookie-session'

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

export class ApiClient {
  private baseUrl: string
  private withCredentials: boolean
  private apiKey?: string
  private apiKeyHeader: string

  constructor(baseUrl = import.meta.env['VITE_API_BASE_URL'] ?? '') {
    this.baseUrl = baseUrl
    this.withCredentials = (import.meta.env['VITE_API_WITH_CREDENTIALS'] ?? 'true') !== 'false'
    this.apiKey = import.meta.env['VITE_API_KEY'] || undefined
    this.apiKeyHeader = import.meta.env['VITE_API_KEY_HEADER'] ?? 'X-API-Key'
  }

  private async refreshAccessToken(refreshToken: string) {
    const response = await fetch(`${this.baseUrl}${endpoints.auth.refresh}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken }),
    })

    if (!response.ok) {
      throw new ApiError('Failed to refresh token.', response.status)
    }

    const payload = (await response.json()) as AuthTokens
    useAppStore.getState().setAuthSession({
      accessToken: payload.accessToken,
      refreshToken: payload.refreshToken,
      currentUser: useAppStore.getState().currentUser!,
    })

    return payload.accessToken
  }

  async request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
    const { accessToken, refreshToken, clearSession } = useAppStore.getState()
    const headers = new Headers(init.headers)

    if (!headers.has('Content-Type') && !(init.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json')
    }

    if (this.apiKey && !headers.has(this.apiKeyHeader)) {
      headers.set(this.apiKeyHeader, this.apiKey)
    }

    if (accessToken && !accessToken.startsWith(COOKIE_SESSION_PREFIX)) {
      headers.set('Authorization', `Bearer ${accessToken}`)
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      credentials: init.credentials ?? (this.withCredentials ? 'include' : 'same-origin'),
    })

    if (
      response.status === 401 &&
      refreshToken &&
      retry &&
      !refreshToken.startsWith(COOKIE_SESSION_PREFIX)
    ) {
      try {
        const renewedToken = await this.refreshAccessToken(refreshToken)
        return this.request<T>(
          path,
          {
            ...init,
            headers: {
              ...Object.fromEntries(headers.entries()),
              Authorization: `Bearer ${renewedToken}`,
            },
          },
          false,
        )
      } catch {
        clearSession()
        throw new ApiError('Session expired.', 401)
      }
    }

    if (!response.ok) {
      let details: unknown

      try {
        details = await response.json()
      } catch {
        details = await response.text()
      }

      throw new ApiError(`Request failed for ${path}`, response.status, details)
    }

    if (response.status === 204) {
      return undefined as T
    }

    return (await response.json()) as T
  }
}

export const apiClient = new ApiClient()
