// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/tables/TaskTable.tsx
import React, { useState } from 'react';
import { CheckCircle, Clock, AlertCircle, ChevronUp, ChevronDown, Search } from 'lucide-react';

interface Task {
  task: string;
  priority: 'High' | 'Medium' | 'Low';
  dueDate: string;
  status ? : 'Pending' | 'In Progress' | 'Completed';
  assignee ? : string;
}

interface TaskTableProps {
  tasks: Task[];
  onTaskClick ? : (task: Task) => void;
  onStatusChange ? : (task: Task, newStatus: string) => void;
}

const priorityColors = {
  High: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  Medium: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  Low: 'text-green-600 bg-green-100 dark:bg-green-900/30',
};

const statusIcons = {
  Pending: <Clock className="h-3 w-3" />,
  'In Progress': <AlertCircle className="h-3 w-3" />,
  Completed: <CheckCircle className="h-3 w-3" />,
};

export const TaskTable: React.FC < TaskTableProps > = ({ tasks, onTaskClick, onStatusChange }) => {
  const [sortColumn, setSortColumn] = useState < keyof Task > ('dueDate');
  const [sortDirection, setSortDirection] = useState < 'asc' | 'desc' > ('asc');
  const [searchQuery, setSearchQuery] = useState('');
  
  const handleSort = (column: keyof Task) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  const filteredTasks = tasks.filter(task =>
    task.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (task.assignee && task.assignee.toLowerCase().includes(searchQuery.toLowerCase()))
  );
  
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    if (aVal === bVal) return 0;
    const comparison = aVal > bVal ? 1 : -1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
      <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 flex flex-wrap justify-between items-center gap-3">
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Task Management</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary-50 dark:bg-secondary-700/50">
            <tr>
              {['task', 'priority', 'dueDate', 'status', 'assignee'].map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col as keyof Task)}
                  className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase tracking-wider cursor-pointer hover:bg-secondary-100 dark:hover:bg-secondary-600"
                >
                  <div className="flex items-center gap-1">
                    {col.charAt(0).toUpperCase() + col.slice(1)}
                    {sortColumn === col && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
            {sortedTasks.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-secondary-500">
                  No tasks found
                </td>
              </tr>
            ) : (
              sortedTasks.map((task, idx) => (
                <tr
                  key={idx}
                  onClick={() => onTaskClick?.(task)}
                  className="cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-secondary-900 dark:text-white">{task.task}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-secondary-600 dark:text-secondary-400">{task.dueDate}</td>
                  <td className="px-4 py-3">
                    {task.status && (
                      <div className="flex items-center gap-1 text-secondary-600 dark:text-secondary-400">
                        {statusIcons[task.status]}
                        <span>{task.status}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-secondary-500">{task.assignee || '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default TaskTable;
