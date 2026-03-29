import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { type ColumnDef } from '@tanstack/table-core'

import { DataTable } from '@/components/ui/data-table'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import {
  getAnalysisSessionPath,
  isResultSessionStatus,
} from '@/lib/analysis/session-path'
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
  const isHistoryPage = resourceKey === 'analyses'

  const recordsQuery = useQuery({
    queryKey: ['resources', resourceKey],
    queryFn: () =>
      adapter.resources.list(resourceKey, { page: 1, pageSize: 20 }),
    enabled: Boolean(definition),
  })

  const text = {
    actions: isZh ? '操作' : 'Actions',
    open: isZh ? '查看' : 'View',
    edit: isZh ? '编辑' : 'Edit',
    unknownTitle: isZh ? '未知资源' : 'Unknown resource',
    unknownDescription: isZh
      ? '这个页面暂时不可用。'
      : 'This page is not available right now.',
    eyebrow: isHistoryPage
      ? isZh
        ? '历史记录'
        : 'History'
      : isZh
        ? '记录列表'
        : 'Records',
    createRecord: isZh ? '新建记录' : 'Create record',
    viewResult: isZh ? '查看结果' : 'View result',
    continueAnalysis: isZh ? '继续分析' : 'Continue',
  }

  const getOpenPath = (record: ResourceRecord) =>
    resourceKey === 'analyses'
      ? getAnalysisSessionPath(record.id, String(record.status ?? ''))
      : `/resources/${resourceKey}/${record.id}`

  const columns: ColumnDef<ResourceRecord>[] = definition
    ? [
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void navigate(getOpenPath(row.original))}
              >
                {isHistoryPage &&
                isResultSessionStatus(String(row.original.status ?? ''))
                  ? text.viewResult
                  : isHistoryPage
                    ? text.continueAnalysis
                    : text.open}
              </Button>
              {!isHistoryPage ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    void navigate(
                      `/resources/${resourceKey}/${row.original.id}/edit`,
                    )
                  }
                >
                  {text.edit}
                </Button>
              ) : null}
            </div>
          ),
        },
      ]
    : []

  if (!definition) {
    return (
      <EmptyState
        title={text.unknownTitle}
        description={text.unknownDescription}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={text.eyebrow}
        title={definition.title}
        description={definition.description}
        actions={
          !isHistoryPage ? (
            <Button
              onClick={() => void navigate(`/resources/${resourceKey}/new`)}
            >
              {text.createRecord}
            </Button>
          ) : undefined
        }
      />
      <DataTable data={recordsQuery.data?.items ?? []} columns={columns} />
    </div>
  )
}
