import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { type PropsWithChildren, useEffect, useState } from 'react'
import { I18nextProvider } from 'react-i18next'
import { Toaster } from 'sonner'

import { RealtimeBridge } from '@/app/providers/realtime-bridge'
import { i18n } from '@/lib/i18n'
import { useAppStore } from '@/lib/store/app-store'
import { ThemeProvider } from '@/lib/theme/theme-provider'

export function AppProviders({ children }: PropsWithChildren) {
  const locale = useAppStore((state) => state.locale)
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  useEffect(() => {
    void i18n.changeLanguage(locale)
  }, [locale])

  return (
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <RealtimeBridge>
            {children}
            <Toaster richColors position="top-right" />
          </RealtimeBridge>
          <ReactQueryDevtools initialIsOpen={false} />
        </ThemeProvider>
      </QueryClientProvider>
    </I18nextProvider>
  )
}
