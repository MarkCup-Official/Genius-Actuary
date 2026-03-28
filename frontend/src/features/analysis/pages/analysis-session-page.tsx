import { useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'

function resolveSessionRoute(status: string, sessionId: string) {
  if (status === 'CLARIFYING') {
    return `/analysis/session/${sessionId}/clarify`
  }

  if (status === 'COMPLETED') {
    return `/analysis/session/${sessionId}/report`
  }

  return `/analysis/session/${sessionId}/progress`
}

export function AnalysisSessionPage() {
  const navigate = useNavigate()
  const { sessionId = '' } = useParams()
  const adapter = useApiAdapter()

  const sessionQuery = useQuery({
    queryKey: ['analysis', sessionId],
    queryFn: () => adapter.analysis.getById(sessionId),
  })

  useEffect(() => {
    if (!sessionQuery.data) {
      return
    }

    void navigate(resolveSessionRoute(sessionQuery.data.status, sessionId), { replace: true })
  }, [navigate, sessionId, sessionQuery.data])

  return (
    <Card className="p-6 text-sm text-text-secondary">
      Opening analysis session...
    </Card>
  )
}
