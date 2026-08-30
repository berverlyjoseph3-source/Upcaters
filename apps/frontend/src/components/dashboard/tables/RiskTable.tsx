// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/tables/RiskTable.tsx
import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, ChevronUp, ChevronDown, Search } from 'lucide-react';

interface Risk {
  id: string;
  name: string;
  category: string;
  level: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
  owner: string;
  dueDate: string;
  mitigation ? : string;
}

interface RiskTableProps {
  risks: Risk[];
  onRiskClick ? : (risk: Risk) => void;
  onStatusChange ? : (riskId: string, newStatus: string) => void;
}

const levelColors = {
  Critical: 'text-red-600 bg-red-100 dark:bg-red-900/30',
  High: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30',
  Medium: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30',
  Low: 'text-green-600 bg-green-100 dark:bg-green-900/30',
};

const statusIcons = {
  Open: <AlertTriangle className="h-3 w-3" />,
  'In Progress': <Clock className="h-3 w-3" />,
  Resolved: <CheckCircle className="h-3 w-3" />,
  Closed: <CheckCircle className="h-3 w-3" />,
};

export const RiskTable: React.FC < RiskTableProps > = ({ risks, onRiskClick, onStatusChange }) => {
  const [sortColumn, setSortColumn] = useState < keyof Risk > ('level');
  const [sortDirection, setSortDirection] = useState < 'asc' | 'desc' > ('desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState < string > ('all');
  const [statusFilter, setStatusFilter] = useState < string > ('all');
  
  const handleSort = (column: keyof Risk) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };
  
  const filteredRisks = risks.filter(risk => {
    const matchesSearch = risk.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      risk.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      risk.owner.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = levelFilter === 'all' || risk.level === levelFilter;
    const matchesStatus = statusFilter === 'all' || risk.status === statusFilter;
    return matchesSearch && matchesLevel && matchesStatus;
  });
  
  const sortedRisks = [...filteredRisks].sort((a, b) => {
    const aVal = a[sortColumn];
    const bVal = b[sortColumn];
    if (aVal === bVal) return 0;
    const comparison = aVal > bVal ? 1 : -1;
    return sortDirection === 'asc' ? comparison : -comparison;
  });
  
  const levelOptions = ['all', 'Critical', 'High', 'Medium', 'Low'];
  const statusOptions = ['all', 'Open', 'In Progress', 'Resolved', 'Closed'];
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
      <div className="p-4 border-b border-secondary-200 dark:border-secondary-700 flex flex-wrap justify-between items-center gap-3">
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Risk Register</h3>
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
            <input
              type="text"
              placeholder="Search risks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900 focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
          >
            {levelOptions.map(opt => <option key={opt} value={opt}>{opt === 'all' ? 'All Levels' : opt}</option>)}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
          >
            {statusOptions.map(opt => <option key={opt} value={opt}>{opt === 'all' ? 'All Status' : opt}</option>)}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary-50 dark:bg-secondary-700/50">
            <tr>
              {['name', 'category', 'level', 'status', 'owner', 'dueDate'].map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col as keyof Risk)}
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
            {sortedRisks.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-secondary-500">
                  No risks found
                </td>
              </tr>
            ) : (
              sortedRisks.map(risk => (
                <tr
                  key={risk.id}
                  onClick={() => onRiskClick?.(risk)}
                  className="cursor-pointer hover:bg-secondary-50 dark:hover:bg-secondary-700/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-secondary-900 dark:text-white">{risk.name}</td>
                  <td className="px-4 py-3 text-secondary-600 dark:text-secondary-400">{risk.category}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${levelColors[risk.level]}`}>
                      {risk.level}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {statusIcons[risk.status]}
                      <span className="text-secondary-600 dark:text-secondary-400">{risk.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-secondary-500">{risk.owner}</td>
                  <td className="px-4 py-3 text-secondary-500">{risk.dueDate}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
export default RiskTable;
