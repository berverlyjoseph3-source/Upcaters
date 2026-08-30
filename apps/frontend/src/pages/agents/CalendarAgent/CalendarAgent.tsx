// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/CalendarAgent/CalendarAgent.tsx
import React, { useState } from 'react';
import { Calendar, Plus, Settings, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { AgentHeader } from '../shared/AgentHeader';
import { CalendarView } from './CalendarView';
import { EventForm } from './EventForm';
import { SmartScheduler } from './SmartScheduler';

type CalendarTab = 'calendar' | 'schedule';

export const CalendarAgent: React.FC = () => {
  const [activeTab, setActiveTab] = useState < CalendarTab > ('calendar');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState < 'month' | 'week' | 'day' > ('month');
  const [isEventFormOpen, setIsEventFormOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState < any > (null);
  const [isLoading, setIsLoading] = useState(false);
  
  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') newDate.setMonth(currentDate.getMonth() - 1);
    else if (viewMode === 'week') newDate.setDate(currentDate.getDate() - 7);
    else newDate.setDate(currentDate.getDate() - 1);
    setCurrentDate(newDate);
  };
  
  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'month') newDate.setMonth(currentDate.getMonth() + 1);
    else if (viewMode === 'week') newDate.setDate(currentDate.getDate() + 7);
    else newDate.setDate(currentDate.getDate() + 1);
    setCurrentDate(newDate);
  };
  
  const handleToday = () => setCurrentDate(new Date());
  
  const formatHeader = () => {
    if (viewMode === 'month') return currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    if (viewMode === 'week') {
      const start = new Date(currentDate);
      const end = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      end.setDate(start.getDate() + 6);
      return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`;
    }
    return currentDate.toLocaleDateString();
  };
  
  return (
    <div className="h-full flex flex-col">
      <AgentHeader
        title="Calendar Agent"
        description="Smart scheduling, meeting management, and availability coordination"
        icon={<Calendar className="h-6 w-6" />}
        gradient="bg-gradient-to-br from-orange-500 to-orange-600"
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setIsEventFormOpen(true)}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Event
            </button>
            <button className="p-2 rounded-lg text-secondary-500 hover:bg-secondary-100 dark:hover:bg-secondary-700">
              <Settings className="h-5 w-5" />
            </button>
          </div>
        }
      />

      {/* Tab navigation */}
      <div className="border-b border-secondary-200 dark:border-secondary-700 mb-4">
        <nav className="flex gap-1">
          <button
            onClick={() => setActiveTab('calendar')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'calendar'
                ? 'bg-white dark:bg-secondary-800 text-orange-600 border-b-2 border-orange-600'
                : 'text-secondary-500 hover:text-secondary-700'
            }`}
          >
            Calendar View
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              activeTab === 'schedule'
                ? 'bg-white dark:bg-secondary-800 text-orange-600 border-b-2 border-orange-600'
                : 'text-secondary-500 hover:text-secondary-700'
            }`}
          >
            Smart Scheduler
          </button>
        </nav>
      </div>

      {/* Calendar view header */}
      {activeTab === 'calendar' && (
        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-1 bg-secondary-100 dark:bg-secondary-800 rounded-lg p-1">
            {(['month', 'week', 'day'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  viewMode === mode ? 'bg-white dark:bg-secondary-700 shadow-sm' : ''
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrevious} className="p-1.5 rounded-md hover:bg-secondary-100">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="text-sm font-medium">{formatHeader()}</span>
            <button onClick={handleNext} className="p-1.5 rounded-md hover:bg-secondary-100">
              <ChevronRight className="h-5 w-5" />
            </button>
            <button onClick={handleToday} className="px-3 py-1 text-sm rounded-md border border-secondary-300 hover:bg-secondary-50">
              Today
            </button>
            <button className="p-1.5 rounded-md hover:bg-secondary-100">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'calendar' && (
          <CalendarView
            viewMode={viewMode}
            currentDate={currentDate}
            onEventClick={(event) => {
              setSelectedEvent(event);
              setIsEventFormOpen(true);
            }}
            isLoading={isLoading}
          />
        )}
        {activeTab === 'schedule' && <SmartScheduler />}
      </div>

      {/* Event Form Modal */}
      {isEventFormOpen && (
        <EventForm
          event={selectedEvent}
          onClose={() => {
            setIsEventFormOpen(false);
            setSelectedEvent(null);
          }}
          onSave={() => {
            setIsEventFormOpen(false);
            setSelectedEvent(null);
            // Refresh calendar
          }}
        />
      )}
    </div>
  );
};
export default CalendarAgent;
