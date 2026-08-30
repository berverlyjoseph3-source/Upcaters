// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/TaskAgent/TaskForm.tsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, Flag, Users, Tag, Save, Trash2, AlertCircle } from 'lucide-react';

interface TaskFormProps {
  task ? : any;
  onClose: () => void;
  onSave: (task: any) => void;
  onDelete ? : (id: string) => void;
  projectId ? : string | null;
}

export const TaskForm: React.FC < TaskFormProps > = ({ task, onClose, onSave, onDelete, projectId }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
    assigneeEmail: '',
    labels: [] as string[],
    projectId: projectId || '',
  });
  const [labelInput, setLabelInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        priority: task.priority || 'medium',
        dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 16) : '',
        assigneeEmail: task.assignee?.email || '',
        labels: task.labels || [],
        projectId: task.projectId || projectId || '',
      });
    }
  }, [task, projectId]);
  
  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleAddLabel = () => {
    if (labelInput && !formData.labels.includes(labelInput)) {
      setFormData(prev => ({ ...prev, labels: [...prev.labels, labelInput] }));
      setLabelInput('');
    }
  };
  
  const handleRemoveLabel = (label: string) => {
    setFormData(prev => ({ ...prev, labels: prev.labels.filter(l => l !== label) }));
  };
  
  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await new Promise(resolve => setTimeout(resolve, 500));
      onSave(formData);
      onClose();
    } catch (err) {
      setError('Failed to save task');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = () => {
    if (task?.id && onDelete) {
      onDelete(task.id);
      onClose();
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-secondary-200 dark:border-secondary-700">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
            {task ? 'Edit Task' : 'New Task'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-2 text-red-700 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
              placeholder="Task title"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
              placeholder="Task description"
            />
          </div>

          {/* Priority & Due Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
              />
            </div>
          </div>

          {/* Assignee */}
          <div>
            <label className="block text-sm font-medium mb-1">Assignee (email)</label>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <input
                type="email"
                value={formData.assigneeEmail}
                onChange={(e) => handleChange('assigneeEmail', e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
                placeholder="assignee@example.com"
              />
            </div>
          </div>

          {/* Labels */}
          <div>
            <label className="block text-sm font-medium mb-1">Labels</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={labelInput}
                onChange={(e) => setLabelInput(e.target.value)}
                placeholder="Add label"
                className="flex-1 px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
              />
              <button onClick={handleAddLabel} className="px-3 py-2 bg-secondary-100 rounded-lg hover:bg-secondary-200">
                Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {formData.labels.map(label => (
                <span key={label} className="inline-flex items-center gap-1 px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs">
                  {label}
                  <button onClick={() => handleRemoveLabel(label)} className="hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between p-4 border-t border-secondary-200 dark:border-secondary-700">
          {task?.id && onDelete && (
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          )}
          <div className="flex gap-3 ml-auto">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-secondary-300 hover:bg-secondary-50">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default TaskForm;
