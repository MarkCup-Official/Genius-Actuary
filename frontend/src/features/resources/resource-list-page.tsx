import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { type ColumnDef } from '@tanstack/table-core'

import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { getResourceDefinition } from '@/lib/registry/resource-registry'
import { formatDateTime } from '@/lib/utils/format'
import { useAppStore } from '@/lib/store/app-store'
import type { ResourceRecord } from '@/types'

export function ResourceListPage() {
  const navigate = useNavigate()
  const { resourceKey = '' } = useParams()
  const locale = useAppStore((state) => state.locale)
  const adapter = useApiAdapter()
  const definition = getResourceDefinition(resourceKey)

  const recordsQuery = useQuery({
    queryKey: ['resources', resourceKey],
    queryFn: () => adapter.resources.list(resourceKey, { page: 1, pageSize: 20 }),
    enabled: Boolean(definition),
  })

  const columns = useMemo<ColumnDef<ResourceRecord>[]>(() => {
    if (!definition) {
      return []
    }

    return [
      ...definition.columns.map((column) => ({
        header: column.label,
        accessorKey: column.id,
        cell: ({ row }: { row: { original: ResourceRecord } }) =>
          column.id === 'updatedAt'
            ? formatDateTime(String(row.original.updatedAt), locale)
            : String(row.original[column.id] ?? ''),
      })),
      {
        header: 'Actions',
        id: 'actions',
        cell: ({ row }: { row: { original: ResourceRecord } }) => (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => void navigate(`/resources/${resourceKey}/${row.original.id}`)}>
              Open
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void navigate(`/resources/${resourceKey}/${row.original.id}/edit`)}
            >
              Edit
            </Button>
          </div>
        ),
      },
    ]
  }, [definition, locale, navigate, resourceKey])

  if (!definition) {
    return (
      <EmptyState
        title="Unknown resource"
        description="This resource key is not registered yet. Add it to the resource registry to enable generated CRUD surfaces."
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Registry"
        title={definition.title}
        description={definition.description}
        actions={
          <Button onClick={() => void navigate(`/resources/${resourceKey}/new`)}>
            Create record
          </Button>
        }
      />
      <DataTable data={recordsQuery.data?.items ?? []} columns={columns} />
    </div>
  )
}
