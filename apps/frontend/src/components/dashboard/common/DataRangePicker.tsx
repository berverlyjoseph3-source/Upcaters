// enterprise-ai-agent-platform/apps/frontend/src/components/dashboard/common/DateRangePicker.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface DateRangePickerProps {
  startDate: Date;
  endDate: Date;
  onChange: (start: Date, end: Date, label: string) => void;
}

const presetRanges = [
  { label: 'Today', getValue: () => ({ start: new Date(), end: new Date() }) },
  { label: 'Yesterday', getValue: () => ({ start: new Date(Date.now() - 86400000), end: new Date(Date.now() - 86400000) }) },
  { label: 'Last 7 days', getValue: () => ({ start: new Date(Date.now() - 7 * 86400000), end: new Date() }) },
  { label: 'Last 30 days', getValue: () => ({ start: new Date(Date.now() - 30 * 86400000), end: new Date() }) },
  { label: 'This month', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: now };
  }},
  { label: 'Last month', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { start, end };
  }},
  { label: 'This year', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    return { start, end: now };
  }},
];

export const DateRangePicker: React.FC<DateRangePickerProps> = ({ startDate, endDate, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tempStart, setTempStart] = useState<Date | null>(null);
  const [tempEnd, setTempEnd] = useState<Date | null>(null);
  const [viewMonth, setViewMonth] = useState(startDate);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const handlePreset = (preset: typeof presetRanges[0]) => {
    const { start, end } = preset.getValue();
    onChange(start, end, preset.label);
    setIsOpen(false);
  };

  const handleDayClick = (day: Date) => {
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(day);
      setTempEnd(null);
    } else if (tempStart && !tempEnd) {
      if (day < tempStart) {
        setTempStart(day);
        setTempEnd(null);
      } else {
        setTempEnd(day);
        onChange(tempStart, day, 'Custom range');
        setIsOpen(false);
        setTempStart(null);
        setTempEnd(null);
      }
    }
  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    const isInRange = (date: Date) => {
      if (!tempStart) return false;
      if (tempEnd) return date >= tempStart && date <= tempEnd;
      return date.getTime() === tempStart.getTime();
    };

    const isSelected = (date: Date) => {
      return (startDate && date.toDateString() === startDate.toDateString()) ||
             (endDate && date.toDateString() === endDate.toDateString());
    };

    return (
      <div className="p-3">
        <div className="flex justify-between items-center mb-3">
          <button onClick={() => setViewMonth(new Date(year, month - 1, 1))} className="p-1 hover:bg-secondary-100 rounded">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium">{viewMonth.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => setViewMonth(new Date(year, month + 1, 1))} className="p-1 hover:bg-secondary-100 rounded">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs text-secondary-500 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => (
            <button
              key={idx}
              onClick={() => day && handleDayClick(day)}
              disabled={!day}
              className={`
                w-8 h-8 text-sm rounded-full transition-colors
                ${!day ? 'invisible' : ''}
                ${day && isInRange(day) ? 'bg-primary-100 text-primary-700' : ''}
                ${day && isSelected(day) ? 'bg-primary-600 text-white' : 'hover:bg-secondary-100'}
              `}
            >
              {day?.getDate()}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700"
      >
        <Calendar className="h-4 w-4" />
        <span>{formatDate(startDate)} - {formatDate(endDate)}</span>
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 z-50">
          <div className="flex border-b border-secondary-200 dark:border-secondary-700">
            <div className="flex-1 p-3 space-y-1">
              {presetRanges.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => handlePreset(preset)}
                  className="w-full text-left px-3 py-1.5 text-sm rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-700"
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="border-l border-secondary-200 dark:border-secondary-700">
              {renderCalendar()}
            </div>
          </div>
          <div className="p-2 border-t border-secondary-200 dark:border-secondary-700 flex justify-end">
            <button onClick={() => setIsOpen(false)} className="px-3 py-1 text-sm text-secondary-600 hover:bg-secondary-100 rounded">
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default DataRangePicker;
