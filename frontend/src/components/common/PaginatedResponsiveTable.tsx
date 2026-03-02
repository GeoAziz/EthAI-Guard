'use client';
import React from 'react';
import { TableSkeleton } from '@/components/ui/loading-skeleton';

interface Column {
  key: string;
  label: string;
  hidden?: 'mobile' | 'tablet' | 'desktop'; // hidden breakpoints
  render?: (value: any, row: any) => React.ReactNode;
}

interface PaginatedResponsiveTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  page: number;
  limit: number;
  total: number | null;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  emptyMessage?: string;
  headerBackground?: string;
}

export default function PaginatedResponsiveTable({
  columns,
  data,
  loading = false,
  page,
  limit,
  total,
  onPageChange,
  onLimitChange,
  emptyMessage = 'No data found',
  headerBackground = 'bg-white',
}: PaginatedResponsiveTableProps) {
  // Calculate total pages
  const totalPages = total !== null ? Math.ceil(total / limit) : page;

  // Get hidden className based on breakpoint
  const getHiddenClass = (hidden?: string) => {
    switch (hidden) {
      case 'mobile':
        return 'hidden sm:table-cell';
      case 'tablet':
        return 'hidden md:table-cell';
      case 'desktop':
        return 'hidden lg:table-cell';
      default:
        return '';
    }
  };

  return (
    <div className="w-full">
      <div className={`rounded-lg border ${headerBackground} p-4 sm:p-6`}>
        {loading ? (
          <TableSkeleton rows={5} />
        ) : data.length === 0 ? (
          <div className="text-xs sm:text-sm text-muted-foreground py-4">
            {emptyMessage}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm table-auto">
              <thead className="text-xs text-muted-foreground border-b">
                <tr>
                  {columns.map((col) => (
                    <th
                      key={col.key}
                      className={`py-3 px-3 font-medium ${getHiddenClass(col.hidden)}`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, idx) => (
                  <tr key={row.id || idx} className="border-b hover:bg-muted/50">
                    {columns.map((col) => (
                      <td
                        key={`${row.id || idx}-${col.key}`}
                        className={`py-3 px-3 ${getHiddenClass(col.hidden)}`}
                      >
                        {col.render
                          ? col.render(row[col.key], row)
                          : row[col.key] || '—'}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination controls */}
      <div className="mt-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-xs sm:text-sm text-muted-foreground">
          {total !== null
            ? `Showing page ${page} — ${data.length} of ${total}`
            : `Showing page ${page} — ${data.length}`}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 items-start sm:items-center w-full sm:w-auto">
          {/* Page size selector */}
          <div className="flex gap-2 items-center">
            <label htmlFor="page-size-select" className="text-xs sm:text-sm whitespace-nowrap">
              Page size:
            </label>
            <select
              id="page-size-select"
              value={String(limit)}
              onChange={(e) => {
                onLimitChange(Number(e.target.value));
                onPageChange(1); // reset to page 1
              }}
              className="border p-1 rounded text-xs sm:text-sm"
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>

          {/* Pagination buttons */}
          <div className="flex gap-2 items-center">
            <button
              className="btn text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            >
              Previous
            </button>

            <button
              className="btn text-xs sm:text-sm px-2 sm:px-4 py-1 sm:py-2"
              disabled={total !== null && page * limit >= (total || 0)}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </button>

            {/* Page number buttons (hidden on very small screens) */}
            {total !== null && totalPages <= 5 && (
              <div className="hidden sm:flex gap-1 items-center ml-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    className={`btn text-xs px-2 py-1 ${
                      n === page ? 'btn-active' : ''
                    }`}
                    onClick={() => onPageChange(n)}
                    disabled={n === page}
                  >
                    {String(n)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
