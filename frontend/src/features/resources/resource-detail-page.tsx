import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { getResourceDefinition } from '@/lib/registry/resource-registry'

export function ResourceDetailPage() {
  const navigate = useNavigate()
  const { resourceKey = '', recordId = '' } = useParams()
  const adapter = useApiAdapter()
  const definition = getResourceDefinition(resourceKey)

  const recordQuery = useQuery({
    queryKey: ['resources', resourceKey, recordId],
    queryFn: () => adapter.resources.getById(resourceKey, recordId),
    enabled: Boolean(definition && recordId),
  })

  if (!definition) {
    return (
      <EmptyState
        title="Unknown resource"
        description="This resource key is not registered yet."
      />
    )
  }

  const record = recordQuery.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Detail"
        title={record?.title ?? definition.title}
        description={record?.subtitle ?? definition.description}
        actions={
          <Button variant="secondary" onClick={() => void navigate(`/resources/${resourceKey}/${recordId}/edit`)}>
            Edit record
          </Button>
        }
      />

      {record ? (
        <Card className="grid gap-4 p-6 md:grid-cols-2">
          {Object.entries(record).map(([key, value]) => (
            <div key={key} className="rounded-[20px] border border-border-subtle bg-app-bg-elevated p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-text-muted">{key}</p>
              <p className="mt-2 text-sm text-text-primary">{String(value)}</p>
            </div>
          ))}
        </Card>
      ) : null}
    </div>
  )
}
