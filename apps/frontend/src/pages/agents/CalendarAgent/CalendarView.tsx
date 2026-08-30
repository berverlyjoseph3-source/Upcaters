// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/CalendarAgent/CalendarView.tsx
import React, { useState, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addDays } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color ? : string;
  location ? : string;
}

interface CalendarViewProps {
  viewMode: 'month' | 'week' | 'day';
  currentDate: Date;
  onEventClick: (event: CalendarEvent) => void;
  isLoading: boolean;
}

// Mock events – in production would come from API
const mockEvents: CalendarEvent[] = [
  { id: '1', title: 'Team Meeting', start: new Date(), end: new Date(new Date().setHours(10, 0)), color: 'bg-blue-500', location: 'Conference Room' },
  { id: '2', title: 'Client Call', start: new Date(new Date().setDate(new Date().getDate() + 2)), end: new Date(new Date().setDate(new Date().getDate() + 2)), color: 'bg-green-500' },
  { id: '3', title: 'Project Review', start: new Date(new Date().setDate(new Date().getDate() - 1)), end: new Date(new Date().setDate(new Date().getDate() - 1)), color: 'bg-purple-500' },
];

export const CalendarView: React.FC < CalendarViewProps > = ({ viewMode, currentDate, onEventClick, isLoading }) => {
  const [events, setEvents] = useState < CalendarEvent[] > (mockEvents);
  const [selectedDate, setSelectedDate] = useState < Date | null > (null);
  
  useEffect(() => {
    // Fetch events from API
    // In production, call API with date range
  }, [currentDate]);
  
  const getEventsForDate = (date: Date) => {
    return events.filter(e => isSameDay(e.start, date));
  };
  
  // Month view
  if (viewMode === 'month') {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return (
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-secondary-200 dark:border-secondary-700">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-secondary-500">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr">
          {days.map((day, idx) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentDate);
            return (
              <div
                key={idx}
                className={`min-h-[100px] p-1 border-b border-r border-secondary-200 dark:border-secondary-700 ${
                  !isCurrentMonth ? 'bg-secondary-50 dark:bg-secondary-800/50' : ''
                } ${isSameDay(day, new Date()) ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}
                onClick={() => setSelectedDate(day)}
              >
                <div className="text-right text-sm p-1">{format(day, 'd')}</div>
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                      className={`${event.color || 'bg-secondary-500'} text-white text-xs rounded px-1 py-0.5 truncate cursor-pointer hover:opacity-80`}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-secondary-500 cursor-pointer">+{dayEvents.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  
  // Week view (simplified)
  if (viewMode === 'week') {
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const hours = Array.from({ length: 24 }, (_, i) => i);
    
    return (
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-x-auto">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-8 border-b border-secondary-200 dark:border-secondary-700">
            <div className="p-2 text-center text-sm font-medium text-secondary-500 w-20">Time</div>
            {days.map(day => (
              <div key={day.toString()} className="p-2 text-center text-sm font-medium">
                <div>{format(day, 'EEE')}</div>
                <div className="text-xs text-secondary-500">{format(day, 'd')}</div>
              </div>
            ))}
          </div>
          {hours.map(hour => (
            <div key={hour} className="grid grid-cols-8 border-b border-secondary-200 dark:border-secondary-700">
              <div className="p-2 text-xs text-secondary-500 text-right pr-2">{`${hour}:00`}</div>
              {days.map(day => {
                const event = events.find(e => isSameDay(e.start, day) && e.start.getHours() === hour);
                return (
                  <div key={day.toString()} className="min-h-[60px] p-1 border-l border-secondary-200 dark:border-secondary-700">
                    {event && (
                      <div
                        onClick={() => onEventClick(event)}
                        className={`${event.color || 'bg-secondary-500'} text-white text-xs rounded p-1 cursor-pointer hover:opacity-80`}
                      >
                        {event.title}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Day view (simplified)
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayEvents = getEventsForDate(currentDate);
  
  return (
    <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 overflow-y-auto h-full">
      <div className="sticky top-0 bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700 p-3">
        <h3 className="text-lg font-semibold">{format(currentDate, 'EEEE, MMMM d, yyyy')}</h3>
      </div>
      <div className="divide-y divide-secondary-200 dark:divide-secondary-700">
        {hours.map(hour => {
          const event = dayEvents.find(e => e.start.getHours() === hour);
          return (
            <div key={hour} className="flex min-h-[60px]">
              <div className="w-20 p-2 text-xs text-secondary-500 text-right pr-2">{`${hour}:00`}</div>
              <div className="flex-1 p-1 border-l border-secondary-200 dark:border-secondary-700">
                {event && (
                  <div
                    onClick={() => onEventClick(event)}
                    className={`${event.color || 'bg-secondary-500'} text-white text-sm rounded p-2 cursor-pointer hover:opacity-80 inline-block`}
                  >
                    {event.title}
                    {event.location && <div className="text-xs opacity-75">{event.location}</div>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default CalendarView;
