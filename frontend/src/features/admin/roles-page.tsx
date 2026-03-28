import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { useApiAdapter } from '@/lib/api/use-api-adapter'
import { permissions } from '@/lib/mock/data'

export function RolesPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const adapter = useApiAdapter()

  const rolesQuery = useQuery({
    queryKey: ['admin', 'roles'],
    queryFn: adapter.admin.listRoles,
  })
  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: adapter.admin.listUsers,
  })

  const updateRoleMutation = useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      adapter.admin.updateUserRole(userId, roleIds),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })

  const roles = rolesQuery.data ?? []
  const users = usersQuery.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Admin" title={t('admin.title')} description={t('admin.subtitle')} />

      <div className="grid gap-4 xl:grid-cols-3">
        {roles.map((role) => (
          <Card key={role.id} className="space-y-4 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full border border-border-subtle bg-app-bg-elevated p-3 text-gold-primary">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <h2 className="font-semibold text-text-primary">{role.name}</h2>
                  <p className="text-sm text-text-secondary">{role.description}</p>
                </div>
              </div>
              <Badge tone="gold">{role.memberCount} members</Badge>
            </div>
            <div className="flex flex-wrap gap-2">
              {role.permissions.map((permissionId) => (
                <Badge key={permissionId} tone="neutral">
                  {permissionId}
                </Badge>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-6">
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Permission matrix</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr>
                <th className="px-4 py-2 text-left text-xs uppercase tracking-[0.18em] text-text-muted">Permission</th>
                {roles.map((role) => (
                  <th key={role.id} className="px-4 py-2 text-left text-xs uppercase tracking-[0.18em] text-text-muted">
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((permission) => (
                <tr key={permission.id}>
                  <td className="rounded-l-2xl bg-app-bg-elevated px-4 py-3">
                    <p className="font-medium text-text-primary">{permission.label}</p>
                    <p className="text-xs text-text-muted">{permission.description}</p>
                  </td>
                  {roles.map((role, index) => (
                    <td
                      key={role.id}
                      className={index === roles.length - 1 ? 'rounded-r-2xl bg-app-bg-elevated px-4 py-3' : 'bg-app-bg-elevated px-4 py-3'}
                    >
                      {role.permissions.includes(permission.id) ? (
                        <Badge tone="success">Allowed</Badge>
                      ) : (
                        <Badge tone="neutral">Blocked</Badge>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="space-y-4 p-6">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">User role assignment</h2>
          <p className="mt-1 text-sm text-text-secondary">
            Toggle roles directly from the admin surface without switching to a separate template.
          </p>
        </div>
        <div className="space-y-4">
          {users.map((user) => (
            <div key={user.id} className="rounded-[22px] border border-border-subtle bg-app-bg-elevated p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="font-medium text-text-primary">{user.name}</p>
                  <p className="text-sm text-text-secondary">{user.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => {
                    const active = user.roles.includes(role.id)
                    return (
                      <Button
                        key={role.id}
                        variant={active ? 'primary' : 'secondary'}
                        size="sm"
                        onClick={() => {
                          const nextRoles = active
                            ? user.roles.filter((item) => item !== role.id)
                            : [...user.roles, role.id]
                          void updateRoleMutation.mutateAsync({ userId: user.id, roleIds: nextRoles })
                        }}
                      >
                        {role.name}
                      </Button>
                    )
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
