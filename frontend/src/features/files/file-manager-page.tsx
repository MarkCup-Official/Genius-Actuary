import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileUp, Paperclip } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { formatBytes, formatDateTime } from '@/lib/utils/format'
import { useAppStore } from '@/lib/store/app-store'

export function FileManagerPage() {
  const { i18n, t } = useTranslation()
  const adapter = useApiAdapter()
  const queryClient = useQueryClient()
  const locale = useAppStore((state) => state.locale)
  const isZh = i18n.language.startsWith('zh')

  const filesQuery = useQuery({
    queryKey: ['files'],
    queryFn: adapter.files.list,
  })

  const uploadMutation = useMutation({
    mutationFn: adapter.files.upload,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['files'] })
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const text = {
    eyebrow: isZh ? '文件' : 'Files',
    uploadTitle: isZh ? '上传证据或报告附件' : 'Upload evidence or report attachments',
    uploadDescription:
      isZh ? '文件上传走的是和真实后端一致的适配层合同。' : 'File upload is routed through the same adapter contract as the real backend.',
    size: isZh ? '大小' : 'Size',
    created: isZh ? '创建时间' : 'Created',
    intent: isZh ? '用途' : 'Intent',
    available: isZh ? '可用' : 'available',
    processing: isZh ? '处理中' : 'processing',
    failed: isZh ? '失败' : 'failed',
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={text.eyebrow} title={t('files.title')} description={t('files.subtitle')} />

      <Card className="p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">{text.uploadTitle}</h2>
            <p className="mt-1 text-sm text-text-secondary">{text.uploadDescription}</p>
          </div>
          <label className="interactive-lift inline-flex cursor-pointer items-center gap-3 rounded-full border border-border-subtle bg-app-bg-elevated px-5 py-3 text-sm text-text-primary transition hover:border-border-strong">
            <FileUp className="size-4" />
            {t('common.upload')}
            <input
              type="file"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (!file) return
                void uploadMutation.mutateAsync({
                  fileName: file.name,
                  size: file.size,
                  mime: file.type,
                  intent: 'attachment',
                })
                event.target.value = ''
              }}
            />
          </label>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filesQuery.data?.map((file) => (
          <Card key={file.id} className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="rounded-full border border-border-subtle bg-app-bg-elevated p-3 text-gold-primary">
                <Paperclip className="size-4" />
              </div>
              <Badge tone={file.status === 'available' ? 'success' : file.status === 'processing' ? 'warning' : 'danger'}>
                {file.status === 'available' ? text.available : file.status === 'processing' ? text.processing : text.failed}
              </Badge>
            </div>
            <div>
              <h2 className="font-semibold text-text-primary">{file.name}</h2>
              <p className="text-sm text-text-secondary">{file.mime}</p>
            </div>
            <div className="grid gap-2 text-sm text-text-secondary">
              <p>{text.size}: {formatBytes(file.size)}</p>
              <p>{text.created}: {formatDateTime(file.createdAt, locale)}</p>
              <p>{text.intent}: {file.intent}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
