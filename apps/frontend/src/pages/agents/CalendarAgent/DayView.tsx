// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/CalendarAgent/DayView.tsx
import React from 'react';
import { format, isSameDay } from 'date-fns';

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color ? : string;
  location ? : string;
}

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export const DayView: React.FC < DayViewProps > = ({ currentDate, events, onEventClick }) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const dayEvents = events.filter(e => isSameDay(e.start, currentDate));
  
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
                    className={`${event.color || 'bg-secondary-500'} text-white text-sm rounded p-2 cursor-pointer hover:opacity-80 inline-block max-w-full`}
                  >
                    <div className="font-medium">{event.title}</div>
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
export default DayView;
