import { type PropsWithChildren, useEffect } from 'react'

import { useAppStore } from '@/lib/store/app-store'
import type { ResolvedTheme } from '@/types'

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') {
    return 'dark'
  }

  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

export function ThemeProvider({ children }: PropsWithChildren) {
  const themeMode = useAppStore((state) => state.themeMode)
  const setResolvedTheme = useAppStore((state) => state.setResolvedTheme)

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)')

    const applyTheme = () => {
      const resolvedTheme = themeMode === 'system' ? getSystemTheme() : themeMode
      setResolvedTheme(resolvedTheme)
      document.documentElement.dataset['theme'] = resolvedTheme
      document.documentElement.dataset['themePreference'] = themeMode
      document.documentElement.style.colorScheme = resolvedTheme
    }

    applyTheme()
    media.addEventListener('change', applyTheme)
    return () => media.removeEventListener('change', applyTheme)
  }, [setResolvedTheme, themeMode])

  return children
}
