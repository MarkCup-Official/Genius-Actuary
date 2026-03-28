import type { Role, User } from '@/types'

export function getUserPermissions(user: User | null, roles: Role[]) {
  if (!user) {
    return new Set<string>()
  }

  const permissionIds = roles
    .filter((role) => user.roles.includes(role.id))
    .flatMap((role) => role.permissions)

  return new Set(permissionIds)
}

export function hasPermission(
  user: User | null,
  roles: Role[],
  permissionId: string,
) {
  return getUserPermissions(user, roles).has(permissionId)
}

export function hasAnyPermission(
  user: User | null,
  roles: Role[],
  permissionIds: string[],
) {
  const permissions = getUserPermissions(user, roles)
  return permissionIds.some((permissionId) => permissions.has(permissionId))
}
