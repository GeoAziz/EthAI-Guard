'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Grid3x3, List } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnDef {
  key: string;
  label: string;
  sortable?: boolean;
  format?: (value: any) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

interface ResponsiveDataTableProps {
  columns: ColumnDef[];
  data: Record<string, any>[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: Record<string, any>) => void;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: string) => void;
  rowClassName?: (row: Record<string, any>) => string;
}

export function ResponsiveDataTable({
  columns,
  data,
  loading = false,
  emptyMessage = 'No data available',
  onRowClick,
  sortBy,
  sortOrder = 'asc',
  onSort,
  rowClassName,
}: ResponsiveDataTableProps) {
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-sm text-muted-foreground">{emptyMessage}</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle - Mobile Only */}
      <div className="md:hidden flex gap-2 justify-end">
        <Button
          variant={viewMode === 'table' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('table')}
          aria-label="Table view"
        >
          <List className="w-4 h-4" />
        </Button>
        <Button
          variant={viewMode === 'card' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('card')}
          aria-label="Card view"
        >
          <Grid3x3 className="w-4 h-4" />
        </Button>
      </div>

      {/* Table View - Desktop & Mobile */}
      <div className={viewMode === 'card' ? 'hidden md:block' : ''}>
        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                {columns.map((col) => (
                  <TableHead
                    key={col.key}
                    className={cn(
                      'font-semibold',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right',
                      col.sortable && 'cursor-pointer hover:bg-muted',
                    )}
                    onClick={() => col.sortable && onSort?.(col.key)}
                    style={{ width: col.width }}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && sortBy === col.key && (
                        <span className="text-xs">
                          {sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, idx) => (
                <TableRow
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    onRowClick && 'cursor-pointer hover:bg-muted/50',
                    rowClassName?.(row),
                  )}
                >
                  {columns.map((col) => (
                    <TableCell
                      key={`${idx}-${col.key}`}
                      className={cn(
                        col.align === 'center' && 'text-center',
                        col.align === 'right' && 'text-right',
                      )}
                    >
                      {col.format ? col.format(row[col.key]) : row[col.key]}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Card View - Mobile Only */}
      <div className={viewMode === 'table' ? 'hidden md:hidden' : 'md:hidden'}>
        <div className="space-y-3">
          {data.map((row, idx) => (
            <div
              key={idx}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'p-4 border rounded-lg bg-white',
                onRowClick && 'cursor-pointer hover:shadow-md active:bg-muted/50',
                rowClassName?.(row),
              )}
            >
              {columns.map((col) => (
                <div key={col.key} className="mb-2 last:mb-0">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {col.label}
                  </div>
                  <div className="text-sm text-foreground mt-1">
                    {col.format ? col.format(row[col.key]) : row[col.key]}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
