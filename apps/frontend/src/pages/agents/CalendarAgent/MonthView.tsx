// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/CalendarAgent/MonthView.tsx
import React from 'react';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, format } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color ? : string;
}

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onDateClick ? : (date: Date) => void;
}

export const MonthView: React.FC < MonthViewProps > = ({ currentDate, events, onEventClick, onDateClick }) => {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  const getEventsForDate = (date: Date) => {
    return events.filter(e => isSameDay(e.start, date));
  };
  
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
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={idx}
              className={`min-h-[100px] p-1 border-b border-r border-secondary-200 dark:border-secondary-700 ${
                !isCurrentMonth ? 'bg-secondary-50 dark:bg-secondary-800/50' : ''
              } ${isToday ? 'bg-orange-50 dark:bg-orange-900/10' : ''}`}
              onClick={() => onDateClick?.(day)}
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
};
export default MonthView;
