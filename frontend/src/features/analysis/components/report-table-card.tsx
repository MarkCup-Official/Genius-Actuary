import { Card } from '@/components/ui/card'
import type { ReportTable } from '@/types'

interface ReportTableCardProps {
  table: ReportTable
}

export function ReportTableCard({ table }: ReportTableCardProps) {
  return (
    <Card className="overflow-hidden p-5">
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-text-primary">{table.title}</h3>
        {table.notes ? (
          <p className="text-sm leading-7 text-text-secondary">{table.notes}</p>
        ) : null}
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            <tr>
              {table.columns.map((column) => (
                <th
                  key={column}
                  className="px-4 py-2 text-left text-xs uppercase tracking-[0.16em] text-text-muted"
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, index) => (
              <tr key={`${table.id}-${index}`} className="bg-app-bg-elevated">
                {table.columns.map((column) => (
                  <td
                    key={`${table.id}-${index}-${column}`}
                    className="px-4 py-3 text-sm text-text-secondary first:rounded-l-2xl last:rounded-r-2xl"
                  >
                    {row[column] == null || row[column] === '' ? '—' : String(row[column])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
