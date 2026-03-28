import {
  flexRender,
  useReactTable,
} from '@tanstack/react-table'
import { getCoreRowModel, type ColumnDef } from '@tanstack/table-core'
import { Search } from 'lucide-react'
import { useDeferredValue, useMemo, useState } from 'react'

import { Input } from '@/components/ui/field'
import { EmptyState } from '@/components/ui/empty-state'
import { Card } from '@/components/ui/card'

interface DataTableProps<TData extends { id: string }> {
  data: TData[]
  columns: ColumnDef<TData>[]
  searchable?: boolean
}

export function DataTable<TData extends { id: string }>({
  data,
  columns,
  searchable = true,
}: DataTableProps<TData>) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  const filteredData = useMemo(() => {
    if (!deferredQuery) {
      return data
    }

    return data.filter((row) => JSON.stringify(row).toLowerCase().includes(deferredQuery.toLowerCase()))
  }, [data, deferredQuery])

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  if (!data.length) {
    return (
      <EmptyState
        title="No rows available"
        description="Once this module receives backend data, rows will appear here automatically."
      />
    )
  }

  return (
    <Card className="overflow-hidden p-4">
      {searchable ? (
        <div className="mb-4 flex items-center gap-3">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search rows"
              className="pl-10"
            />
          </div>
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-2">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-2 text-left text-xs font-medium uppercase tracking-[0.18em] text-text-muted">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="rounded-2xl bg-app-bg-elevated">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm text-text-secondary first:rounded-l-2xl last:rounded-r-2xl">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
