// enterprise-ai-agent-platform/apps/frontend/src/components/analytics/DateRangeFilter.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format, subDays, subWeeks, subMonths, subYears, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

interface DateRangeFilterProps {
  startDate: Date;
  endDate: Date;
  onChange: (start: Date, end: Date, label: string) => void;
  onPreset: (range: 'day' | 'week' | 'month' | 'quarter' | 'year') => void;
}

const presets = [
  { label: 'Today', getValue: () => ({ start: new Date(), end: new Date() }), rangeKey: 'day' },
  { label: 'Yesterday', getValue: () => ({ start: subDays(new Date(), 1), end: subDays(new Date(), 1) }), rangeKey: 'day' },
  { label: 'Last 7 days', getValue: () => ({ start: subDays(new Date(), 7), end: new Date() }), rangeKey: 'week' },
  { label: 'Last 30 days', getValue: () => ({ start: subDays(new Date(), 30), end: new Date() }), rangeKey: 'month' },
  { label: 'This month', getValue: () => ({ start: startOfMonth(new Date()), end: endOfMonth(new Date()) }), rangeKey: 'month' },
  { label: 'Last month', getValue: () => {
    const lastMonth = subMonths(new Date(), 1);
    return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
  }, rangeKey: 'month' },
  { label: 'This year', getValue: () => ({ start: startOfYear(new Date()), end: endOfYear(new Date()) }), rangeKey: 'year' },
  { label: 'Last year', getValue: () => {
    const lastYear = subYears(new Date(), 1);
    return { start: startOfYear(lastYear), end: endOfYear(lastYear) };
  }, rangeKey: 'year' },
];

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ startDate, endDate, onChange, onPreset }) => {
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

  const formatDate = (date: Date) => format(date, 'MMM d, yyyy');

  const handlePreset = (preset: typeof presets[0]) => {
    const { start, end } = preset.getValue();
    onChange(start, end, preset.label);
    onPreset(preset.rangeKey as any);
    setIsOpen(false);
  };

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onChange(tempStart, tempEnd, 'Custom range');
      setTempStart(null);
      setTempEnd(null);
      setIsOpen(false);
    }
  };

  const handleCancel = () => {
    setTempStart(null);
    setTempEnd(null);
    setIsOpen(false);
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
      }
    }
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full px-3 py-2 text-sm bg-white dark:bg-secondary-800 border border-secondary-300 dark:border-secondary-600 rounded-lg hover:bg-secondary-50 dark:hover:bg-secondary-700"
      >
        <Calendar className="h-4 w-4 text-secondary-500" />
        <span className="flex-1 text-left">
          {formatDate(startDate)} - {formatDate(endDate)}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-secondary-800 rounded-xl shadow-lg border border-secondary-200 dark:border-secondary-700 z-50">
          <div className="flex border-b border-secondary-200 dark:border-secondary-700">
            <div className="flex-1 p-3 space-y-1">
              {presets.map(preset => (
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
          <div className="p-2 border-t border-secondary-200 dark:border-secondary-700 flex justify-end gap-2">
            <button onClick={handleCancel} className="px-3 py-1 text-sm text-secondary-600 hover:bg-secondary-100 rounded">
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={!tempStart || !tempEnd}
              className="px-3 py-1 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded disabled:opacity-50"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
export default DataRangeFilter;
