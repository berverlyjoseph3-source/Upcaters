// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/CalendarAgent/WeekView.tsx
import React from 'react';
import { startOfWeek, addDays, format, isSameDay } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color ? : string;
  location ? : string;
}

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export const WeekView: React.FC < WeekViewProps > = ({ currentDate, events, onEventClick }) => {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const getEventsForDateTime = (date: Date, hour: number) => {
    return events.filter(e =>
      isSameDay(e.start, date) && e.start.getHours() === hour
    );
  };
  
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
              const eventsAtHour = getEventsForDateTime(day, hour);
              return (
                <div key={day.toString()} className="min-h-[60px] p-1 border-l border-secondary-200 dark:border-secondary-700">
                  {eventsAtHour.map(event => (
                    <div
                      key={event.id}
                      onClick={() => onEventClick(event)}
                      className={`${event.color || 'bg-secondary-500'} text-white text-xs rounded p-1 cursor-pointer hover:opacity-80 mb-1 truncate`}
                      title={event.title}
                    >
                      {event.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
export default WeekView;
