import type { LanguageCode } from '@/types'

const localeMap: Record<LanguageCode, string> = {
  en: 'en-US',
  zh: 'zh-CN',
}

export function formatDateTime(value: string, language: LanguageCode = 'zh') {
  return new Intl.DateTimeFormat(localeMap[language], {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function formatDate(value: string, language: LanguageCode = 'zh') {
  return new Intl.DateTimeFormat(localeMap[language], {
    dateStyle: 'medium',
  }).format(new Date(value))
}

export function formatNumber(value: number, language: LanguageCode = 'zh') {
  return new Intl.NumberFormat(localeMap[language], {
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPercent(value: number, language: LanguageCode = 'zh') {
  return new Intl.NumberFormat(localeMap[language], {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatCurrency(
  value: number,
  currency = 'USD',
  language: LanguageCode = 'zh',
) {
  return new Intl.NumberFormat(localeMap[language], {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`
  }

  if (bytes < 1024 ** 2) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  if (bytes < 1024 ** 3) {
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`
  }

  return `${(bytes / 1024 ** 3).toFixed(1)} GB`
}
