import { describe, expect, it } from 'vitest'

import { roles, users } from '@/lib/mock/data'
import { getUserPermissions, hasAnyPermission, hasPermission } from '@/lib/utils/permissions'

describe('permissions helpers', () => {
  it('collects permissions from assigned roles', () => {
    const permissionSet = getUserPermissions(users[0], roles)
    expect(permissionSet.has('analysis.run')).toBe(true)
    expect(permissionSet.has('roles.manage')).toBe(true)
  })

  it('checks single permission correctly', () => {
    expect(hasPermission(users[1], roles, 'logs.read')).toBe(true)
    expect(hasPermission(users[1], roles, 'analysis.run')).toBe(false)
  })

  it('checks any permission correctly', () => {
    expect(hasAnyPermission(users[1], roles, ['roles.manage', 'logs.read'])).toBe(true)
  })
})
