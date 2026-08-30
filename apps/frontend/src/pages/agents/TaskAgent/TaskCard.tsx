// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/TaskAgent/TaskCard.tsx
import React from 'react';
import { Calendar, Flag, Users, Tag, GripVertical } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface Task {
  id: string;
  title: string;
  description ? : string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate ? : Date;
  assignee ? : { name: string;email: string;avatar ? : string };
  labels: string[];
  projectId ? : string;
  createdAt: Date;
  updatedAt: Date;
}

interface TaskCardProps {
  task: Task;
  onDragStart: (task: Task) => void;
  onDragEnd: () => void;
  onClick ? : (task: Task) => void;
  isDragging ? : boolean;
}

const priorityColors = {
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  urgent: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const priorityIcons = {
  low: <Flag className="h-3 w-3" />,
  medium: <Flag className="h-3 w-3" />,
  high: <Flag className="h-3 w-3" />,
  urgent: <Flag className="h-3 w-3" />,
};

export const TaskCard: React.FC < TaskCardProps > = ({
  task,
  onDragStart,
  onDragEnd,
  onClick,
  isDragging = false,
}) => {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', task.id);
    onDragStart(task);
  };
  
  const isOverdue = task.dueDate && task.dueDate < new Date() && task.status !== 'done';
  
  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      onClick={() => onClick?.(task)}
      className={`
        bg-white dark:bg-secondary-800 rounded-lg border border-secondary-200 dark:border-secondary-700 p-3 mb-2
        cursor-pointer hover:shadow-md transition-all
        ${isDragging ? 'opacity-50' : 'opacity-100'}
        ${isOverdue ? 'border-red-300 dark:border-red-700' : ''}
      `}
    >
      <div className="flex items-start gap-2">
        <div className="flex-shrink-0 mt-0.5">
          <GripVertical className="h-4 w-4 text-secondary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className="text-sm font-medium text-secondary-900 dark:text-white line-clamp-2">
              {task.title}
            </h4>
            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority]}`}>
              {priorityIcons[task.priority]}
              <span className="capitalize">{task.priority}</span>
            </span>
          </div>

          {task.description && (
            <p className="text-xs text-secondary-500 dark:text-secondary-400 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-secondary-400">
            {task.dueDate && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : ''}`}>
                <Calendar className="h-3 w-3" />
                {formatDistanceToNow(task.dueDate, { addSuffix: true })}
              </span>
            )}
            {task.assignee && (
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {task.assignee.name}
              </span>
            )}
            {task.labels.length > 0 && (
              <span className="flex items-center gap-1">
                <Tag className="h-3 w-3" />
                {task.labels[0]}{task.labels.length > 1 ? ` +${task.labels.length - 1}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default TaskCard;
