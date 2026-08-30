// enterprise-ai-agent-platform/apps/frontend/src/components/analytics/ActionTypeFilter.tsx
import React, { useState } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

interface ActionTypeFilterProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  className ? : string;
}

const availableActions = [
  { id: 'email_send', label: 'Email Send', category: 'Email' },
  { id: 'email_read', label: 'Email Read', category: 'Email' },
  { id: 'email_reply', label: 'Email Reply', category: 'Email' },
  { id: 'drive_upload', label: 'Drive Upload', category: 'Drive' },
  { id: 'drive_download', label: 'Drive Download', category: 'Drive' },
  { id: 'content_text', label: 'Text Generation', category: 'Content' },
  { id: 'content_image', label: 'Image Generation', category: 'Content' },
  { id: 'content_video', label: 'Video Generation', category: 'Content' },
  { id: 'social_post', label: 'Social Post', category: 'Social' },
  { id: 'calendar_create', label: 'Calendar Create', category: 'Calendar' },
  { id: 'web_search', label: 'Web Search', category: 'Web' },
  { id: 'task_create', label: 'Task Create', category: 'Task' },
];

const categories = [...new Set(availableActions.map(a => a.category))];

export const ActionTypeFilter: React.FC < ActionTypeFilterProps > = ({ selected, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedCategories, setExpandedCategories] = useState < Set < string >> (new Set(categories));
  
  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };
  
  const toggleAction = (actionId: string) => {
    if (selected.includes(actionId)) {
      onChange(selected.filter(id => id !== actionId));
    } else {
      onChange([...selected, actionId]);
    }
  };
  
  const selectAllInCategory = (category: string) => {
    const actionsInCategory = availableActions.filter(a => a.category === category).map(a => a.id);
    const newSelected = [...selected];
    actionsInCategory.forEach(actionId => {
      if (!newSelected.includes(actionId)) newSelected.push(actionId);
    });
    onChange(newSelected);
  };
  
  const clearCategory = (category: string) => {
    const actionsInCategory = availableActions.filter(a => a.category === category).map(a => a.id);
    onChange(selected.filter(id => !actionsInCategory.includes(id)));
  };
  
  const selectAll = () => {
    onChange(availableActions.map(a => a.id));
  };
  
  const clearAll = () => {
    onChange([]);
  };
  
  const filteredActions = availableActions.filter(action =>
    action.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const getSelectedCount = () => selected.length;
  const getSelectedLabel = () => {
    if (selected.length === 0) return 'All actions';
    if (selected.length === 1) return availableActions.find(a => a.id === selected[0])?.label || '1 action';
    return `${selected.length} actions selected`;
  };
  
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700"
      >
        <span className="truncate">{getSelectedLabel()}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 z-50">
          {/* Header */}
          <div className="p-2 border-b border-secondary-200 dark:border-secondary-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <input
                type="text"
                placeholder="Search actions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
              />
            </div>
          </div>

          {/* Select All / Clear All */}
          <div className="flex justify-between px-3 py-2 border-b border-secondary-200 dark:border-secondary-700 text-xs">
            <button onClick={selectAll} className="text-primary-600 hover:text-primary-700">Select All</button>
            <button onClick={clearAll} className="text-secondary-500 hover:text-secondary-700">Clear All</button>
            <span className="text-secondary-400">{getSelectedCount()} selected</span>
          </div>

          {/* Actions List by Category */}
          <div className="max-h-80 overflow-y-auto p-1">
            {searchQuery ? (
              filteredActions.map(action => (
                <button
                  key={action.id}
                  onClick={() => toggleAction(action.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700"
                >
                  <span>{action.label}</span>
                  {selected.includes(action.id) && <Check className="h-4 w-4 text-primary-600" />}
                </button>
              ))
            ) : (
              categories.map(category => {
                const actionsInCategory = availableActions.filter(a => a.category === category);
                const allSelected = actionsInCategory.every(a => selected.includes(a.id));
                const someSelected = actionsInCategory.some(a => selected.includes(a.id));
                const isExpanded = expandedCategories.has(category);
                return (
                  <div key={category} className="mb-1">
                    <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="flex items-center gap-1 text-sm font-medium"
                      >
                        <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                        {category}
                      </button>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); selectAllInCategory(category); }}
                          className="text-xs text-primary-600 hover:text-primary-700 px-1"
                        >
                          Select all
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); clearCategory(category); }}
                          className="text-xs text-secondary-500 hover:text-secondary-700 px-1"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="ml-4 space-y-0.5">
                        {actionsInCategory.map(action => (
                          <button
                            key={action.id}
                            onClick={() => toggleAction(action.id)}
                            className="w-full flex items-center justify-between px-3 py-1.5 text-sm rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700"
                          >
                            <span className="text-secondary-600">{action.label}</span>
                            {selected.includes(action.id) && <Check className="h-3 w-3 text-primary-600" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
            {filteredActions.length === 0 && (
              <div className="px-3 py-2 text-sm text-secondary-500 text-center">No actions found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default ActionTypeFilter;
