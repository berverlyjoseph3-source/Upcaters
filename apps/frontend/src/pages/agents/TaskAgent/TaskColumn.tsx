// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/TaskAgent/TaskColumn.tsx
import React from 'react';
import { Task, TaskCard } from './TaskCard';

interface TaskColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  color ? : string;
  headerColor ? : string;
  onTaskDragStart: (task: Task) => void;
  onTaskDragEnd: () => void;
  onDrop: (status: string) => void;
  onDragOver: (e: React.DragEvent) => void;
  onTaskClick ? : (task: Task) => void;
  isDraggingOver ? : boolean;
}

export const TaskColumn: React.FC < TaskColumnProps > = ({
  id,
  title,
  tasks,
  color = 'bg-secondary-100',
  headerColor = 'text-secondary-700',
  onTaskDragStart,
  onTaskDragEnd,
  onDrop,
  onDragOver,
  onTaskClick,
  isDraggingOver = false,
}) => {
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onDrop(id);
  };
  
  return (
    <div
      className={`flex-shrink-0 w-80 rounded-xl ${color} ${isDraggingOver ? 'ring-2 ring-indigo-500' : ''}`}
      onDrop={handleDrop}
      onDragOver={onDragOver}
    >
      <div className={`p-3 font-semibold ${headerColor} border-b border-secondary-200 dark:border-secondary-700`}>
        <div className="flex justify-between items-center">
          <span>{title}</span>
          <span className="text-xs bg-white/50 dark:bg-secondary-800/50 px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
      </div>
      <div className="p-2 min-h-[300px] transition-all">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            onDragStart={onTaskDragStart}
            onDragEnd={onTaskDragEnd}
            onClick={onTaskClick}
          />
        ))}
        {tasks.length === 0 && (
          <div className="text-center py-8 text-secondary-400 text-sm">
            No tasks
          </div>
        )}
      </div>
    </div>
  );
};
export default TaskColumn;
