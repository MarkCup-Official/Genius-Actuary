import type { ExportPayload } from '@/types'

export async function exportToPdf({ title, headers, rows }: ExportPayload) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])

  const document = new jsPDF({
    unit: 'pt',
    format: 'a4',
  })

  document.setFont('helvetica', 'bold')
  document.setFontSize(18)
  document.text(title, 40, 44)

  autoTable(document, {
    startY: 64,
    head: [headers],
    body: rows,
    styles: {
      fontSize: 9,
      cellPadding: 8,
    },
    headStyles: {
      fillColor: [18, 18, 21],
      textColor: [249, 228, 159],
    },
  })

  document.save(`${title}.pdf`)
}
