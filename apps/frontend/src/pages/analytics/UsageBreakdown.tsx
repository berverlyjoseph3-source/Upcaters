// enterprise-ai-agent-platform/apps/frontend/src/pages/analytics/UsageBreakdown.tsx
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Search, Download } from 'lucide-react';
import { UsageByAgent, UsageByAction } from '../../types/analytics.types';

interface UsageBreakdownProps {
  byAgent: UsageByAgent[];
  byAction: UsageByAction[];
  topActions: UsageByAction[];
}

type ViewType = 'agent' | 'action';

export const UsageBreakdown: React.FC < UsageBreakdownProps > = ({ byAgent, byAction, topActions }) => {
  const [view, setView] = useState < ViewType > ('agent');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState < 'count' | 'cost' | 'name' > ('count');
  const [sortDirection, setSortDirection] = useState < 'asc' | 'desc' > ('desc');
  
  const totalCount = byAgent.reduce((sum, a) => sum + a.count, 0);
  const totalCost = byAgent.reduce((sum, a) => sum + a.cost, 0);
  
  const formatNumber = (num: number): string => {
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
    return num.toString();
  };
  
  const formatCurrency = (num: number): string => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(num);
  };
  
  const handleSort = (column: 'count' | 'cost' | 'name') => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };
  
  const filteredAgents = byAgent.filter(agent =>
    agent.agentType.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const filteredActions = byAction.filter(action =>
    action.actionType.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const sortedAgents = [...filteredAgents].sort((a, b) => {
    if (sortColumn === 'name') {
      return sortDirection === 'asc' ?
        a.agentType.localeCompare(b.agentType) :
        b.agentType.localeCompare(a.agentType);
    }
    const aVal = sortColumn === 'count' ? a.count : a.cost;
    const bVal = sortColumn === 'count' ? b.count : b.cost;
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });
  
  const sortedActions = [...filteredActions].sort((a, b) => {
    if (sortColumn === 'name') {
      return sortDirection === 'asc' ?
        a.actionType.localeCompare(b.actionType) :
        b.actionType.localeCompare(a.actionType);
    }
    const aVal = sortColumn === 'count' ? a.count : a.cost;
    const bVal = sortColumn === 'count' ? b.count : b.cost;
    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
  });
  
  const currentData = view === 'agent' ? sortedAgents : sortedActions;
  const currentTotal = view === 'agent' ? totalCount : byAction.reduce((sum, a) => sum + a.count, 0);
  const currentTotalCost = view === 'agent' ? totalCost : byAction.reduce((sum, a) => sum + a.cost, 0);
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <p className="text-sm text-secondary-500">Total {view === 'agent' ? 'Agents' : 'Actions'}</p>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{currentTotal.toLocaleString()}</p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <p className="text-sm text-secondary-500">Total Cost</p>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{formatCurrency(currentTotalCost)}</p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <p className="text-sm text-secondary-500">Average per {view === 'agent' ? 'Agent' : 'Action'}</p>
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">
            {formatNumber(currentTotal / (currentData.length || 1))}
          </p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <p className="text-sm text-secondary-500">Top {view === 'agent' ? 'Agent' : 'Action'}</p>
          <p className="text-lg font-semibold text-secondary-900 dark:text-white truncate">
            {currentData[0]?.[view === 'agent' ? 'agentType' : 'actionType'] || '—'}
          </p>
          <p className="text-xs text-secondary-500">{formatNumber(currentData[0]?.count || 0)} executions</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
          <button
            onClick={() => setView('agent')}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              view === 'agent'
                ? 'bg-white dark:bg-secondary-700 shadow-sm text-primary-600'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            By Agent
          </button>
          <button
            onClick={() => setView('action')}
            className={`px-4 py-1.5 text-sm rounded-md transition-colors ${
              view === 'action'
                ? 'bg-white dark:bg-secondary-700 shadow-sm text-primary-600'
                : 'text-secondary-600 hover:text-secondary-900'
            }`}
          >
            By Action
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
          <input
            type="text"
            placeholder={`Search ${view === 'agent' ? 'agents' : 'actions'}...`}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-4 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 w-64"
          />
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary-50 dark:bg-secondary-700/50">
              <tr>
                <th
                  onClick={() => handleSort('name')}
                  className="px-4 py-3 text-left text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                >
                  <div className="flex items-center gap-1">
                    {view === 'agent' ? 'Agent' : 'Action'}
                    {sortColumn === 'name' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('count')}
                  className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                >
                  <div className="flex items-center justify-end gap-1">
                    Executions
                    {sortColumn === 'count' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('cost')}
                  className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase cursor-pointer hover:bg-secondary-100"
                >
                  <div className="flex items-center justify-end gap-1">
                    Cost
                    {sortColumn === 'cost' && (sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-secondary-500 uppercase">Share
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-secondary-200 dark:divide-secondary-700">
              {currentData.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-secondary-500">
                    No data found
                  </td>
                </tr>
              ) : (
                currentData.map(item => {
                  const name = view === 'agent' ? (item as UsageByAgent).agentType : (item as UsageByAction).actionType;
                  const count = item.count;
                  const cost = item.cost;
                  const percentage = (count / currentTotal) * 100;
                  return (
                    <tr key={name} className="hover:bg-secondary-50 dark:hover:bg-secondary-700/50">
                      <td className="px-4 py-3 font-medium capitalize">{name.replace(/_/g, ' ')}</td>
                      <td className="px-4 py-3 text-right">{formatNumber(count)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(cost)}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-secondary-500">{percentage.toFixed(1)}%</span>
                          <div className="w-16 h-1.5 bg-secondary-200 rounded-full overflow-hidden">
                            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${percentage}%` }} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Actions Summary */}
      {view === 'action' && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4">
          <h3 className="text-sm font-semibold text-secondary-900 dark:text-white mb-3">Top 5 Most Expensive Actions</h3>
          <div className="space-y-2">
            {topActions.slice(0, 5).map((action, idx) => (
              <div key={action.actionType} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-secondary-400 w-6">{idx + 1}</span>
                  <span className="text-sm capitalize">{action.actionType.replace(/_/g, ' ')}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-secondary-600">{formatNumber(action.count)} executions</span>
                  <span className="text-sm font-medium text-secondary-900 dark:text-white">{formatCurrency(action.cost)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
export default UsageBreakdown;
