// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/TaskAgent/ProjectList.tsx
import React, { useState, useEffect } from 'react';
import { Folder, Plus, ChevronRight, Settings } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  taskCount: number;
  color ? : string;
}

interface ProjectListProps {
  selectedProject: string | null;
  onSelectProject: (projectId: string | null) => void;
}

// Mock projects – replace with API call
const mockProjects: Project[] = [
  { id: '1', name: 'All Tasks', taskCount: 12, color: 'bg-secondary-500' },
  { id: '2', name: 'Work', taskCount: 8, color: 'bg-blue-500' },
  { id: '3', name: 'Personal', taskCount: 4, color: 'bg-green-500' },
  { id: '4', name: 'Shopping', taskCount: 2, color: 'bg-purple-500' },
];

export const ProjectList: React.FC < ProjectListProps > = ({ selectedProject, onSelectProject }) => {
  const [projects, setProjects] = useState < Project[] > ([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    // Fetch projects from API
    const fetchProjects = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setProjects(mockProjects);
      setIsLoading(false);
    };
    fetchProjects();
  }, []);
  
  const handleAddProject = async () => {
    if (!newProjectName.trim()) return;
    const newProject: Project = {
      id: Date.now().toString(),
      name: newProjectName,
      taskCount: 0,
      color: 'bg-secondary-500',
    };
    setProjects([...projects, newProject]);
    setNewProjectName('');
    setIsAdding(false);
    // API call would go here
  };
  
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-10 bg-secondary-200 animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }
  
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center px-2 mb-2">
        <span className="text-xs font-medium text-secondary-500 uppercase tracking-wider">Projects</span>
        <button
          onClick={() => setIsAdding(true)}
          className="p-1 rounded-md hover:bg-secondary-100"
          title="Add project"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {projects.map(project => (
        <button
          key={project.id}
          onClick={() => onSelectProject(project.id === '1' ? null : project.id)}
          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
            (selectedProject === project.id || (project.id === '1' && !selectedProject))
              ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
              : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-100 dark:hover:bg-secondary-700'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2 h-2 rounded-full ${project.color || 'bg-secondary-400'}`} />
            <span className="truncate">{project.name}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-secondary-400">{project.taskCount}</span>
            <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
          </div>
        </button>
      ))}

      {isAdding && (
        <div className="mt-2 p-2 bg-secondary-50 dark:bg-secondary-700 rounded-lg">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="Project name"
            className="w-full px-2 py-1 text-sm rounded border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 mb-2"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleAddProject()}
          />
          <div className="flex gap-2">
            <button onClick={handleAddProject} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded">Add</button>
            <button onClick={() => setIsAdding(false)} className="px-2 py-1 text-xs border rounded">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};
export default ProjectList;
