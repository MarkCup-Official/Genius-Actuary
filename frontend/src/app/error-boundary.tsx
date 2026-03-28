import { Component, type ErrorInfo, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = {
    hasError: false,
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error boundary captured', error, errorInfo)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-app-bg p-8">
          <Card className="max-w-xl space-y-4 p-8 text-center">
            <h1 className="text-2xl font-semibold text-text-primary">Something broke at the shell boundary.</h1>
            <p className="text-sm text-text-secondary">
              The error boundary caught a rendering failure before it could corrupt the rest of the workspace.
            </p>
            <div className="flex justify-center">
              <Button onClick={() => window.location.reload()}>Reload workspace</Button>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
