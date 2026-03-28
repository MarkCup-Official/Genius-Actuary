import { useMemo } from 'react'

import { getApiAdapter } from '@/lib/api/adapters'
import { useAppStore } from '@/lib/store/app-store'

export function useApiAdapter() {
  const apiMode = useAppStore((state) => state.apiMode)
  return useMemo(() => getApiAdapter(apiMode), [apiMode])
}
