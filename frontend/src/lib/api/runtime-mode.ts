import type { ApiMode } from '@/types'

const testDefaultApiMode =
  (import.meta.env['VITE_API_MODE'] as ApiMode | undefined) ?? 'mock'

export function resolveRuntimeApiMode(mode?: ApiMode): ApiMode {
  if (import.meta.env.MODE === 'test') {
    return mode ?? testDefaultApiMode
  }

  return 'rest'
}

export function isMockRuntime(mode?: ApiMode) {
  return resolveRuntimeApiMode(mode) === 'mock'
}
