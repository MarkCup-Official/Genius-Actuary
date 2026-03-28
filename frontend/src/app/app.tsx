import { RouterProvider } from 'react-router-dom'

import { ErrorBoundary } from '@/app/error-boundary'
import { router } from '@/app/router'

export function App() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  )
}
