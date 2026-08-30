// enterprise-ai-agent-platform/apps/frontend/src/components/analytics/AgentFilter.tsx
import React, { useState } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';

interface AgentFilterProps {
  selected: string[];
  onChange: (selected: string[]) => void;
  className ? : string;
}

const availableAgents = [
  { id: 'email', label: 'Email Agent', color: 'bg-blue-500' },
  { id: 'drive', label: 'Drive Agent', color: 'bg-green-500' },
  { id: 'content', label: 'Content Agent', color: 'bg-purple-500' },
  { id: 'social', label: 'Social Agent', color: 'bg-pink-500' },
  { id: 'calendar', label: 'Calendar Agent', color: 'bg-orange-500' },
  { id: 'web', label: 'Web Agent', color: 'bg-teal-500' },
  { id: 'task', label: 'Task Agent', color: 'bg-indigo-500' },
  { id: 'orchestrator', label: 'Orchestrator', color: 'bg-secondary-500' },
];

export const AgentFilter: React.FC < AgentFilterProps > = ({ selected, onChange, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredAgents = availableAgents.filter(agent =>
    agent.label.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const toggleAgent = (agentId: string) => {
    if (selected.includes(agentId)) {
      onChange(selected.filter(id => id !== agentId));
    } else {
      onChange([...selected, agentId]);
    }
  };
  
  const selectAll = () => {
    onChange(availableAgents.map(a => a.id));
  };
  
  const clearAll = () => {
    onChange([]);
  };
  
  const getSelectedLabels = () => {
    if (selected.length === 0) return 'All agents';
    if (selected.length === 1) return availableAgents.find(a => a.id === selected[0])?.label || '1 agent';
    return `${selected.length} agents selected`;
  };
  
  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-3 py-2 text-sm bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700"
      >
        <span className="truncate">{getSelectedLabels()}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 z-50">
          {/* Header */}
          <div className="p-2 border-b border-secondary-200 dark:border-secondary-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <input
                type="text"
                placeholder="Search agents..."
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
          </div>

          {/* Agent List */}
          <div className="max-h-64 overflow-y-auto p-1">
            {filteredAgents.map(agent => (
              <button
                key={agent.id}
                onClick={() => toggleAgent(agent.id)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700"
              >
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${agent.color}`} />
                  <span>{agent.label}</span>
                </div>
                {selected.includes(agent.id) && <Check className="h-4 w-4 text-primary-600" />}
              </button>
            ))}
            {filteredAgents.length === 0 && (
              <div className="px-3 py-2 text-sm text-secondary-500 text-center">No agents found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
export default AgentFilter;
