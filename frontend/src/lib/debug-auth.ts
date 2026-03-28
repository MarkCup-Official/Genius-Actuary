const DEBUG_AUTH_STORAGE_KEY = 'genius-actuary-debug-basic-auth'

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getDebugAuthHeader() {
  if (!isBrowser()) {
    return null
  }

  return window.localStorage.getItem(DEBUG_AUTH_STORAGE_KEY)
}

export function setDebugAuthHeader(value: string) {
  if (!isBrowser()) {
    return
  }

  window.localStorage.setItem(DEBUG_AUTH_STORAGE_KEY, value)
}

export function clearDebugAuthHeader() {
  if (!isBrowser()) {
    return
  }

  window.localStorage.removeItem(DEBUG_AUTH_STORAGE_KEY)
}

export function buildBasicAuthHeader(username: string, password: string) {
  const encoded = window.btoa(`${username}:${password}`)
  return `Basic ${encoded}`
}
