// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/widgets/ResourceUtilization.tsx
import React from 'react';
import { Users, Clock, BarChart3 } from 'lucide-react';

interface TeamData {
  available: number;
  allocated: number;
}

interface ResourceUtilizationProps {
  data: {
    teamA: TeamData;
    teamB: TeamData;
    teamC: TeamData;
    teamD: TeamData;
  };
}

const teamNames = {
  teamA: 'Team A',
  teamB: 'Team B',
  teamC: 'Team C',
  teamD: 'Team D',
};

export const ResourceUtilization: React.FC < ResourceUtilizationProps > = ({ data }) => {
  const teams = Object.entries(data).map(([key, value]) => ({
    name: teamNames[key as keyof typeof teamNames],
    available: value.available,
    allocated: value.allocated,
    utilization: Math.round((value.allocated / (value.available + value.allocated)) * 100),
  }));
  
  const totalAvailable = teams.reduce((sum, t) => sum + t.available, 0);
  const totalAllocated = teams.reduce((sum, t) => sum + t.allocated, 0);
  const overallUtilization = totalAvailable + totalAllocated > 0 ? Math.round((totalAllocated / (totalAvailable + totalAllocated)) * 100) : 0;
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-secondary-900 dark:text-white">Resource Utilization</h3>
        <BarChart3 className="h-5 w-5 text-secondary-400" />
      </div>

      {/* Overall summary */}
      <div className="grid grid-cols-2 gap-3 mb-4 pb-3 border-b border-secondary-200 dark:border-secondary-700">
        <div className="text-center">
          <p className="text-xs text-secondary-500">Total Capacity</p>
          <p className="text-lg font-bold text-secondary-900 dark:text-white">{totalAvailable + totalAllocated}</p>
          <p className="text-xs text-secondary-400">FTE</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-secondary-500">Utilization Rate</p>
          <p className="text-lg font-bold text-secondary-900 dark:text-white">{overallUtilization}%</p>
          <div className="h-1.5 w-full bg-secondary-200 rounded-full mt-1 overflow-hidden">
            <div className="h-full bg-primary-500 rounded-full" style={{ width: `${overallUtilization}%` }} />
          </div>
        </div>
      </div>

      {/* Team breakdown */}
      <div className="space-y-3">
        {teams.map((team) => (
          <div key={team.name} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="font-medium text-secondary-700 dark:text-secondary-300">{team.name}</span>
              <span className="text-secondary-500">{team.utilization}% utilized</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-secondary-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${team.utilization}%` }} />
              </div>
              <div className="flex items-center gap-1 text-xs text-secondary-500">
                <Users className="h-3 w-3" />
                <span>{team.allocated}/{team.available + team.allocated}</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-secondary-400">
              <span>Available: {team.available}</span>
              <span>Allocated: {team.allocated}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-secondary-200 dark:border-secondary-700">
        <p className="text-xs text-secondary-500 flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Last updated: Today at 09:00
        </p>
      </div>
    </div>
  );
};
export default ResourceUtilization;
