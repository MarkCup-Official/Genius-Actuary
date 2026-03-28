import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { type ColumnDef } from '@tanstack/table-core'

import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { getResourceDefinition } from '@/lib/registry/resource-registry'
import { formatDateTime } from '@/lib/utils/format'
import { useAppStore } from '@/lib/store/app-store'
import type { ResourceRecord } from '@/types'

export function ResourceListPage() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const { resourceKey = '' } = useParams()
  const locale = useAppStore((state) => state.locale)
  const adapter = useApiAdapter()
  const definition = getResourceDefinition(resourceKey)
  const isZh = i18n.language.startsWith('zh')

  const recordsQuery = useQuery({
    queryKey: ['resources', resourceKey],
    queryFn: () => adapter.resources.list(resourceKey, { page: 1, pageSize: 20 }),
    enabled: Boolean(definition),
  })

  const text = {
    actions: isZh ? '操作' : 'Actions',
    open: isZh ? '打开' : 'Open',
    edit: isZh ? '编辑' : 'Edit',
    unknownTitle: isZh ? '未知资源' : 'Unknown resource',
    unknownDescription:
      isZh ? '这个资源键还没有注册，请先加入资源注册表后再启用通用 CRUD 页面。' : 'This resource key is not registered yet. Add it to the resource registry to enable generated CRUD surfaces.',
    eyebrow: isZh ? '注册表' : 'Registry',
    createRecord: isZh ? '新建记录' : 'Create record',
  }

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
        header: text.actions,
        id: 'actions',
        cell: ({ row }: { row: { original: ResourceRecord } }) => (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => void navigate(`/resources/${resourceKey}/${row.original.id}`)}>
              {text.open}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => void navigate(`/resources/${resourceKey}/${row.original.id}/edit`)}>
              {text.edit}
            </Button>
          </div>
        ),
      },
    ]
  }, [definition, locale, navigate, resourceKey, text.actions, text.edit, text.open])

  if (!definition) {
    return <EmptyState title={text.unknownTitle} description={text.unknownDescription} />
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={text.eyebrow}
        title={definition.title}
        description={definition.description}
        actions={
          <Button onClick={() => void navigate(`/resources/${resourceKey}/new`)}>
            {text.createRecord}
          </Button>
        }
      />
      <DataTable data={recordsQuery.data?.items ?? []} columns={columns} />
    </div>
  )
}
