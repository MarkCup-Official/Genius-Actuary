import { mockApiAdapter } from '@/lib/api/adapters/mock-adapter'
import { restApiAdapter } from '@/lib/api/adapters/rest-adapter'
import type { ApiAdapter } from '@/lib/api/adapters/base'
import { resolveRuntimeApiMode } from '@/lib/api/runtime-mode'
import type { ApiMode } from '@/types'

const adapterMap: Record<ApiMode, ApiAdapter> = {
  mock: mockApiAdapter,
  rest: restApiAdapter,
}

export function getApiAdapter(mode: ApiMode) {
  return adapterMap[resolveRuntimeApiMode(mode)]
}
