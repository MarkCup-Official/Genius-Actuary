import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import type { PropsWithChildren, ReactElement } from 'react'
import { I18nextProvider } from 'react-i18next'
import { MemoryRouter } from 'react-router-dom'

import { i18n } from '@/lib/i18n'
import { useAppStore } from '@/lib/store/app-store'
import { ThemeProvider } from '@/lib/theme/theme-provider'

function Providers({
  children,
  route = '/',
}: PropsWithChildren<{ route?: string }>) {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  return (
    <MemoryRouter initialEntries={[route]}>
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={client}>
          <ThemeProvider>{children}</ThemeProvider>
        </QueryClientProvider>
      </I18nextProvider>
    </MemoryRouter>
  )
}

export function renderWithProviders(ui: ReactElement, route?: string) {
  useAppStore.setState({
    themeMode: 'dark',
    resolvedTheme: 'dark',
    locale: 'zh',
    displayDensity: 'cozy',
    apiMode: 'mock',
    sidebarOpen: true,
    accessToken: null,
    refreshToken: null,
    currentUser: null,
  })
  void i18n.changeLanguage('zh')

  return render(ui, {
    wrapper: ({ children }) => <Providers route={route}>{children}</Providers>,
  })
}
