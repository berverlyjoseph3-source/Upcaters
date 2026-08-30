// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/tables/DataTable.tsx
import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Search } from 'lucide-react';

export interface Column < T = any > {
  key: keyof T | string;
  label: string;
  sortable ? : boolean;
  render ? : (value: any, row: T) => React.ReactNode;
}

interface DataTableProps < T = any > {
  title ? : string;
  columns: Column < T > [];
  data: T[];
  initialSortColumn ? : string;
  initialSortDirection ? : 'asc' | 'desc';
  pageSize ? : number;
  searchable ? : boolean;
  searchPlaceholder ? : string;
  onRowClick ? : (row: T) => void;
}

export function DataTable < T extends Record < string, any >> ({
  title,
  columns,
  data,
  initialSortColumn,
  initialSortDirection = 'asc',
  pageSize = 10,
  searchable = true,
  searchPlaceholder = 'Search...',
  onRowClick,
}: DataTableProps < T > ) {
  const [sortColumn, setSortColumn] = useState < string | null > (initialSortColumn || null);
  const [sortDirection, setSortDirection] = useState < 'asc' | 'desc' > (initialSortDirection);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };
  
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;
    const query = searchQuery.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const value = row[col.key as keyof T];
        return value && String(value).toLowerCase().includes(query);
      })
    );
  }, [data, searchQuery, columns]);
  
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;
    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn as keyof T];
      const bVal = b[sortColumn as keyof T];
      if (aVal === bVal) return 0;
      const comparison = aVal > bVal ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);
  
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
      <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 flex flex-wrap justify-between items-center gap-3">
        {title && <h3 className="text-base font-semibold text-secondary-900 dark:text-white">{title}</h3>}
        {searchable && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="pl-9 pr-4 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary-50 dark:bg-secondary-700/50">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  onClick={() => col.sortable !== false && handleSort(String(col.key))}
                  className={`px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider ${col.sortable !== false ? 'cursor-pointer hover:bg-secondary-100 dark:hover:bg-secondary-600' : ''}`}
                >
                  <div className="flex items-center gap-1">
                    {col.label}
                    {col.sortable !== false && sortColumn === col.key && (
                      sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-secondary-500">
                  No data available
                </td>
              </tr>
            ) : (
              paginatedData.map((row, idx) => (
                <tr
                  key={idx}
                  onClick={() => onRowClick?.(row)}
                  className={`${onRowClick ? 'cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-700/50' : ''} transition-colors`}
                >
                  {columns.map((col) => (
                    <td key={String(col.key)} className="px-4 py-3 text-secondary-700 dark:text-secondary-300">
                      {col.render ? col.render(row[col.key as keyof T], row) : (row[col.key as keyof T] ?? '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-secondary-200 dark:border-secondary-700 flex justify-between items-center">
          <div className="text-xs text-secondary-500">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, sortedData.length)} of {sortedData.length}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-1 rounded disabled:opacity-50"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 py-1 text-xs">{currentPage} / {totalPages}</span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-1 rounded disabled:opacity-50"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// TaskTable specific component using DataTable
interface Task {
  task: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
}

interface TaskTableProps {
  tasks: Task[];
}

export const TaskTable: React.FC < TaskTableProps > = ({ tasks }) => {
  const columns: Column < Task > [] = [
    { key: 'task', label: 'Task', sortable: true },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (value: string) => {
        const color = value === 'High' ? 'text-red-600 bg-red-100' : value === 'Medium' ? 'text-yellow-600 bg-yellow-100' : 'text-green-600 bg-green-100';
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{value}</span>;
      },
    },
    { key: 'dueDate', label: 'Due Date', sortable: true },
  ];
  
  return <DataTable title="Task Management" columns={columns} data={tasks} pageSize={5} />;
};
export default DataTable;
