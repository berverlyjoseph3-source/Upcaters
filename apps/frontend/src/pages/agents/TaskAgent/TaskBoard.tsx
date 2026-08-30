// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/TaskAgent/TaskBoard.tsx
import React, { useState, useEffect } from 'react';
import { TaskColumn } from './TaskColumn';
import { TaskCard } from './TaskCard';
import { Calendar } from 'lucide-react';
import { Plus } from 'lucide-react';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: Date;
  assignee?: { name: string; email: string; avatar?: string };
  labels: string[];
  projectId?: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskBoardProps {
  viewMode: 'board' | 'list' | 'calendar';
  projectId?: string | null;
  isLoading: boolean;
}

const columns = [
  { id: 'todo', title: 'To Do', color: 'bg-secondary-100', headerColor: 'text-secondary-700' },
  { id: 'in_progress', title: 'In Progress', color: 'bg-blue-50', headerColor: 'text-blue-700' },
  { id: 'done', title: 'Done', color: 'bg-green-50', headerColor: 'text-green-700' },
];

// Mock tasks – replace with API call
const mockTasks: Task[] = [
  {
    id: '1',
    title: 'Review project proposal',
    description: 'Need to review the Q3 proposal before submission',
    status: 'todo',
    priority: 'high',
    dueDate: new Date(Date.now() + 86400000),
    assignee: { name: 'John Doe', email: 'john@example.com' },
    labels: ['review', 'important'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    title: 'Update documentation',
    status: 'in_progress',
    priority: 'medium',
    dueDate: new Date(Date.now() + 172800000),
    assignee: { name: 'Jane Smith', email: 'jane@example.com' },
    labels: ['docs'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    title: 'Deploy to production',
    status: 'done',
    priority: 'urgent',
    dueDate: new Date(Date.now() - 86400000),
    assignee: { name: 'Alex Lee', email: 'alex@example.com' },
    labels: ['devops', 'release'],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const TaskBoard: React.FC<TaskBoardProps> = ({ viewMode, projectId, isLoading }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);

  useEffect(() => {
    // Fetch tasks from API – using mock for now
    const filtered = projectId ? mockTasks.filter(t => t.projectId === projectId) : mockTasks;
    setTasks(filtered);
  }, [projectId]);

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setIsDragging(false);
  };

  const handleDrop = (status: Task['status']) => {
    if (draggedTask && draggedTask.status !== status) {
      // Update task status – API call would go here
      setTasks(prev =>
        prev.map(t =>
          t.id === draggedTask.id ? { ...t, status, updatedAt: new Date() } : t
        )
      );
    }
    handleDragEnd();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  // List view
  if (viewMode === 'list') {
    return (
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 dark:bg-secondary-700/50">
              <tr>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Priority</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Due Date</th>
                <th className="px-4 py-3 text-left">Assignee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
              {tasks.map(task => (
                <tr key={task.id} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                  <td className="px-4 py-3 font-medium">{task.title}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      task.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                      task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                      task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {task.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 capitalize">{task.status.replace('_', ' ')}</td>
                  <td className="px-4 py-3">{task.dueDate?.toLocaleDateString() || '—'}</td>
                  <td className="px-4 py-3">{task.assignee?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Calendar view (simplified – would use full calendar in production)
  if (viewMode === 'calendar') {
    return (
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-6 text-center text-secondary-400">
        <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>Calendar view coming soon</p>
        <p className="text-sm">Use board or list view for task management</p>
      </div>
    );
  }

  // Board view (Kanban)
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full">
      {columns.map(column => (
        <TaskColumn
          key={column.id}
          id={column.id}
          title={column.title}
          tasks={tasks.filter(t => t.status === column.id)}
          color={column.color}
          headerColor={column.headerColor}
          onTaskDragStart={handleDragStart}
          onTaskDragEnd={handleDragEnd}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          isDraggingOver={isDragging && draggedTask?.status !== column.id}
        />
      ))}
    </div>
  );
};
export default TaskBoard;
