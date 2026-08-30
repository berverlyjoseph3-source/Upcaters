// enterprise-ai-agent-platform/apps/frontend/src/pages/dashboard/InformationalDashboard.tsx
import React, { useMemo } from 'react';
import { useDashboardStore } from '../../store/dashboard.store';
import { ChartContainer } from '../../components/dashboard/common/ChartContainer';
import { LineChart, PieChart, GaugeChart } from '../../components/dashboard/charts';
import { Heart, BookOpen, Globe, Users, TrendingUp, Award } from 'lucide-react';

export const InformationalDashboard: React.FC = () => {
  const { informational, isLoading } = useDashboardStore();
  
  if (isLoading || !informational) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  const {
    globalWellbeingIndex,
    regionalHappiness,
    wellnessTrend,
    educationFund,
    globalEducationFund,
    digitalAccessInitiative,
    contributors,
    demographics,
    literacyRate,
    newJobsReached,
    peopleReached,
  } = informational;
  
  const wellbeingData = useMemo(() => {
    return wellnessTrend.map(w => ({ month: w.month, score: w.score }));
  }, [wellnessTrend]);
  
  const happinessData = useMemo(() => {
    return regionalHappiness.map(r => ({ name: r.region, value: r.score }));
  }, [regionalHappiness]);
  
  const contributorData = useMemo(() => {
    return Object.entries(contributors).map(([key, value]) => ({ name: key, value }));
  }, [contributors]);
  
  const demographicData = useMemo(() => {
    return [
      { name: '18-35', value: demographics.age18_35 },
      { name: '36-55', value: demographics.age36_55 },
      { name: '56+', value: demographics.age56plus },
    ];
  }, [demographics]);
  
  return (
    <div className="space-y-6">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Heart className="h-8 w-8" />
          <h1 className="text-2xl font-bold">Global Wellbeing Index</h1>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-bold">{globalWellbeingIndex}</span>
          <span className="text-indigo-200">/10</span>
          <span className="ml-4 text-sm bg-white/20 rounded-full px-3 py-1">Current Score</span>
        </div>
        <p className="text-indigo-100 mt-4 max-w-2xl">
          The Global Wellbeing Index measures quality of life across education, healthcare, environment, and economic opportunity.
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
          <BookOpen className="h-6 w-6 text-blue-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{literacyRate}%</p>
          <p className="text-sm text-secondary-500">Literacy Rate</p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
          <Users className="h-6 w-6 text-green-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{newJobsReached.toLocaleString()}+</p>
          <p className="text-sm text-secondary-500">New Jobs Created</p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
          <Globe className="h-6 w-6 text-purple-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">{peopleReached.toLocaleString()}</p>
          <p className="text-sm text-secondary-500">People Reached</p>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 text-center">
          <Award className="h-6 w-6 text-yellow-500 mx-auto mb-2" />
          <p className="text-2xl font-bold text-secondary-900 dark:text-white">#{globalWellbeingIndex * 10}</p>
          <p className="text-sm text-secondary-500">Global Rank</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartContainer title="Wellness Trend (Last 12 Months)" description="Monthly wellbeing index">
          <LineChart data={wellbeingData} xKey="month" yKey="score" color="#6366f1" />
        </ChartContainer>
        <ChartContainer title="Regional Happiness Levels" description="Score by region">
          <PieChart data={happinessData} />
        </ChartContainer>
      </div>

      {/* Contributors & Demographics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">Top Contributors</h3>
          <div className="space-y-3">
            {contributorData.map(c => (
              <div key={c.name}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize">{c.name}</span>
                  <span>{c.value}%</span>
                </div>
                <div className="h-2 bg-secondary-200 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full" style={{ width: `${c.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">Age Demographics</h3>
          <PieChart data={demographicData} />
        </div>
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-5">
          <h3 className="text-lg font-semibold text-secondary-900 dark:text-white mb-3">Global Initiatives</h3>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2"><div className="w-2 h-2 bg-green-500 rounded-full"></div> Education Fund: ${(educationFund / 1e6).toFixed(0)}M</li>
            <li className="flex items-center gap-2"><div className="w-2 h-2 bg-blue-500 rounded-full"></div> Global Education Fund: ${(globalEducationFund / 1e9).toFixed(1)}B</li>
            <li className="flex items-center gap-2"><div className="w-2 h-2 bg-purple-500 rounded-full"></div> {digitalAccessInitiative}</li>
          </ul>
          <div className="mt-4 pt-3 border-t border-secondary-200">
            <p className="text-xs text-secondary-500">*Data as of Q4 2024</p>
          </div>
        </div>
      </div>
    </div>
  );
};
export default InformationalDashboard;
