import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellRing } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { formatDateTime } from '@/lib/utils/format'
import { useAppStore } from '@/lib/store/app-store'

export function NotificationsCenterPage() {
  const { t } = useTranslation()
  const adapter = useApiAdapter()
  const queryClient = useQueryClient()
  const locale = useAppStore((state) => state.locale)

  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: adapter.notifications.list,
  })

  const markReadMutation = useMutation({
    mutationFn: adapter.notifications.markRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const markAllMutation = useMutation({
    mutationFn: adapter.notifications.markAllRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Signals"
        title={t('notifications.title')}
        description={t('notifications.subtitle')}
        actions={
          <Button variant="secondary" onClick={() => void markAllMutation.mutateAsync()}>
            Mark all read
          </Button>
        }
      />

      <div className="space-y-4">
        {notificationsQuery.data?.map((notification) => (
          <Card key={notification.id} className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-full border border-border-subtle bg-app-bg-elevated p-3 text-gold-primary">
                  <BellRing className="size-4" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-text-primary">{notification.title}</h2>
                    <Badge tone={notification.read ? 'neutral' : 'gold'}>
                      {notification.read ? 'Read' : 'Unread'}
                    </Badge>
                    <Badge tone={notification.level === 'critical' ? 'danger' : notification.level === 'warning' ? 'warning' : notification.level === 'success' ? 'success' : 'neutral'}>
                      {notification.level}
                    </Badge>
                  </div>
                  <p className="text-sm text-text-secondary">{notification.message}</p>
                  <p className="text-xs text-text-muted">{formatDateTime(notification.createdAt, locale)}</p>
                </div>
              </div>
              {!notification.read ? (
                <Button variant="secondary" size="sm" onClick={() => void markReadMutation.mutateAsync(notification.id)}>
                  Mark read
                </Button>
              ) : null}
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
