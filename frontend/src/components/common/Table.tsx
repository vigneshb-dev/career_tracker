import React from 'react';
import { EmptyState } from './EmptyState';
import { LoadingState } from './LoadingState';

export interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRowClick?: (row: T) => void;
  keyExtractor: (row: T) => string;
}

export function Table<T>({
  columns,
  data,
  isLoading = false,
  emptyTitle = 'No data available',
  emptyDescription = 'There are currently no items to display.',
  onRowClick,
  keyExtractor,
}: TableProps<T>) {
  if (isLoading) {
    return <LoadingState message="Loading table records..." />;
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="w-full overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-100">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-5 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wider ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((row, idx) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors ${
                  onRowClick ? 'cursor-pointer hover:bg-brand-50/40' : 'hover:bg-slate-50/60'
                }`}
              >
                {columns.map((col) => (
                  <td key={col.key} className={`px-5 py-4 text-slate-700 align-middle ${col.className || ''}`}>
                    {col.render ? col.render(row, idx) : (row as Record<string, any>)[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
