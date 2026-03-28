import { useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { getResourceDefinition } from '@/lib/registry/resource-registry'

export function ResourceDetailPage() {
  const { i18n } = useTranslation()
  const navigate = useNavigate()
  const { resourceKey = '', recordId = '' } = useParams()
  const adapter = useApiAdapter()
  const definition = getResourceDefinition(resourceKey)
  const isZh = i18n.language.startsWith('zh')

  const recordQuery = useQuery({
    queryKey: ['resources', resourceKey, recordId],
    queryFn: () => adapter.resources.getById(resourceKey, recordId),
    enabled: Boolean(definition && recordId),
  })

  const text = {
    unknownTitle: isZh ? '未知资源' : 'Unknown resource',
    unknownDescription: isZh ? '这个资源键还没有注册。' : 'This resource key is not registered yet.',
    eyebrow: isZh ? '详情' : 'Detail',
    editRecord: isZh ? '编辑记录' : 'Edit record',
  }

  if (!definition) {
    return <EmptyState title={text.unknownTitle} description={text.unknownDescription} />
  }

  const record = recordQuery.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={text.eyebrow}
        title={record?.title ?? definition.title}
        description={record?.subtitle ?? definition.description}
        actions={
          <Button variant="secondary" onClick={() => void navigate(`/resources/${resourceKey}/${recordId}/edit`)}>
            {text.editRecord}
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
