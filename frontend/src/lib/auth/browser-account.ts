import { i18n } from '@/lib/i18n'
import type { User } from '@/types'

const ACCOUNT_COOKIE_NAME = 'genius_actuary_browser_account'
const COOKIE_MAX_AGE_DAYS = 730

interface BrowserAccountCookie {
  id: string
  createdAt: string
}

function readCookie(name: string) {
  if (typeof document === 'undefined') {
    return null
  }

  const segments = document.cookie ? document.cookie.split('; ') : []
  const target = segments.find((segment) => segment.startsWith(`${name}=`))
  return target ? decodeURIComponent(target.slice(name.length + 1)) : null
}

function writeCookie(name: string, value: string) {
  if (typeof document === 'undefined') {
    return
  }

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + COOKIE_MAX_AGE_DAYS)
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expiresAt.toUTCString()}; path=/; SameSite=Lax`
}

export function clearBrowserAccount() {
  if (typeof document === 'undefined') {
    return
  }

  document.cookie = `${ACCOUNT_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`
}

function createBrowserAccountId() {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `browser-${crypto.randomUUID()}`
  }

  return `browser-${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`
}

export function ensureBrowserAccount() {
  const existingCookie = readCookie(ACCOUNT_COOKIE_NAME)

  if (existingCookie) {
    try {
      const parsed = JSON.parse(existingCookie) as BrowserAccountCookie
      if (parsed.id && parsed.createdAt) {
        return parsed
      }
    } catch {
      // Ignore malformed cookies and replace them with a fresh account.
    }
  }

  const nextAccount: BrowserAccountCookie = {
    id: createBrowserAccountId(),
    createdAt: new Date().toISOString(),
  }

  writeCookie(ACCOUNT_COOKIE_NAME, JSON.stringify(nextAccount))
  return nextAccount
}

function accountCode(accountId: string) {
  return (
    accountId
      .replace(/^browser-/, '')
      .slice(0, 6)
      .toUpperCase() || 'LOCAL'
  )
}

export function createBrowserBoundUser(): User {
  const account = ensureBrowserAccount()
  const isZh = i18n.language.startsWith('zh')
  const code = accountCode(account.id)

  return {
    id: account.id,
    name: isZh ? `用户 ${code}` : `User ${code}`,
    email: `${code.toLowerCase()}@browser.local`,
    title: isZh ? '浏览器自动创建账号' : 'Browser-linked account',
    locale: isZh ? 'zh' : 'en',
    roles: ['analyst'],
    lastActiveAt: new Date().toISOString(),
  }
}
