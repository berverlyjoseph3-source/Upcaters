// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/TaskAgent/TaskAgent.tsx
import React, { useState } from 'react';
import { CheckSquare, Plus, Settings, RefreshCw, ListTodo, Calendar, LayoutGrid } from 'lucide-react';
import { AgentHeader } from '../shared/AgentHeader';
import { TaskBoard } from './TaskBoard';
import { TaskForm } from './TaskForm';
import { ProjectList } from './ProjectList';

type TaskView = 'board' | 'list' | 'calendar';

export const TaskAgent: React.FC = () => {
  const [viewMode, setViewMode] = useState < TaskView > ('board');
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState < string | null > (null);
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <div className="h-full flex flex-col">
      <AgentHeader
        title="Task Agent"
        description="Manage tasks across Google Tasks, Asana, and Monday.com"
        icon={<CheckSquare className="h-6 w-6" />}
        gradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setIsTaskFormOpen(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Task
            </button>
            <button className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        }
      />

      {/* View selector */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('board')}
            className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1 ${
              viewMode === 'board' ? 'bg-white dark:bg-secondary-700 shadow-sm' : ''
            }`}
          >
            <LayoutGrid className="h-4 w-4" />
            Board
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1 ${
              viewMode === 'list' ? 'bg-white dark:bg-secondary-700 shadow-sm' : ''
            }`}
          >
            <ListTodo className="h-4 w-4" />
            List
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-1 ${
              viewMode === 'calendar' ? 'bg-white dark:bg-secondary-700 shadow-sm' : ''
            }`}
          >
            <Calendar className="h-4 w-4" />
            Calendar
          </button>
        </div>
        <button className="p-1.5 rounded-md text-secondary-500 hover:bg-secondary-100">
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Projects sidebar */}
        <div className="w-64 flex-shrink-0 overflow-y-auto">
          <ProjectList selectedProject={selectedProject} onSelectProject={setSelectedProject} />
        </div>

        {/* Task view */}
        <div className="flex-1 overflow-auto">
          <TaskBoard viewMode={viewMode} projectId={selectedProject} isLoading={isLoading} />
        </div>
      </div>

      {/* Task Form Modal */}
      {isTaskFormOpen && (
        <TaskForm
          onClose={() => setIsTaskFormOpen(false)}
          onSave={() => {
            setIsTaskFormOpen(false);
            // Refresh tasks
          }}
          projectId={selectedProject}
        />
      )}
    </div>
  );
};
export default TaskAgent;
