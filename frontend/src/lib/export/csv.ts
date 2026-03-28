import type { ExportPayload } from '@/types'

export async function exportToCsv({ title, headers, rows }: ExportPayload) {
  const { default: Papa } = await import('papaparse')
  const csv = Papa.unparse([headers, ...rows])
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${title}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
