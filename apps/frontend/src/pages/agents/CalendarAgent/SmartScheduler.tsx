// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/CalendarAgent/SmartScheduler.tsx
import React, { useState } from 'react';
import { Zap, Users, Clock, Calendar as CalendarIcon, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Attendee {
  email: string;
  name?: string;
}

interface SuggestedSlot {
  start: Date;
  end: Date;
  confidence: number;
  reason: string;
}

export const SmartScheduler: React.FC = () => {
  const [title, setTitle] = useState('');
  const [duration, setDuration] = useState(60);
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [attendeeInput, setAttendeeInput] = useState('');
  const [preferredDays, setPreferredDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [workingHours, setWorkingHours] = useState({ start: 9, end: 17 });
  const [suggestions, setSuggestions] = useState<SuggestedSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SuggestedSlot | null>(null);

  const handleAddAttendee = () => {
    if (attendeeInput && !attendees.some(a => a.email === attendeeInput)) {
      setAttendees([...attendees, { email: attendeeInput }]);
      setAttendeeInput('');
    }
  };

  const handleRemoveAttendee = (email: string) => {
    setAttendees(attendees.filter(a => a.email !== email));
  };

  const handleFindSlots = async () => {
    if (!title.trim()) {
      setError('Please enter a meeting title');
      return;
    }
    if (attendees.length === 0) {
      setError('Please add at least one attendee');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call to find common free slots
      await new Promise(resolve => setTimeout(resolve, 1500));
      // Mock suggestions
      const now = new Date();
      const mockSuggestions: SuggestedSlot[] = [
        {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 10, 0),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 11, 0),
          confidence: 0.95,
          reason: 'All attendees available',
        },
        {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 14, 0),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 2, 15, 0),
          confidence: 0.82,
          reason: 'One attendee may need adjustment',
        },
        {
          start: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 9, 0),
          end: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 10, 0),
          confidence: 0.75,
          reason: 'Close to working hours',
        },
      ];
      setSuggestions(mockSuggestions);
    } catch (err) {
      setError('Failed to find available slots');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSchedule = async () => {
    if (!selectedSlot) return;
    setIsLoading(true);
    try {
      // Simulate creating calendar event
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert(`Meeting "${title}" scheduled for ${format(selectedSlot.start, 'PPP p')}`);
      // Reset form
      setTitle('');
      setAttendees([]);
      setSuggestions([]);
      setSelectedSlot(null);
    } catch (err) {
      setError('Failed to schedule meeting');
    } finally {
      setIsLoading(false);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600 bg-green-100';
    if (confidence >= 0.7) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-50 to-pink-50 dark:from-orange-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-orange-200 dark:border-orange-800">
        <div className="flex items-center gap-3">
          <Zap className="h-8 w-8 text-orange-600" />
          <div>
            <h3 className="text-sm font-semibold text-orange-800 dark:text-orange-300">Smart Scheduler</h3>
            <p className="text-xs text-orange-600 dark:text-orange-400">Find the best meeting time for all attendees</p>
          </div>
        </div>
      </div>

      {/* Meeting Details */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 space-y-4">
        <h3 className="text-sm font-medium text-secondary-900 dark:text-white">Meeting Details</h3>
        <div>
          <label className="block text-sm text-secondary-700 dark:text-secondary-300 mb-1">Meeting Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Project Kickoff"
            className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
          />
        </div>
        <div>
          <label className="block text-sm text-secondary-700 dark:text-secondary-300 mb-1">Duration (minutes)</label>
          <select
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
          >
            <option value={15}>15 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>1 hour</option>
            <option value={90}>1.5 hours</option>
            <option value={120}>2 hours</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-secondary-700 dark:text-secondary-300 mb-1">Attendees *</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={attendeeInput}
              onChange={(e) => setAttendeeInput(e.target.value)}
              placeholder="email@example.com"
              className="flex-1 px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
            />
            <button onClick={handleAddAttendee} className="px-3 py-2 bg-secondary-100 rounded-lg hover:bg-secondary-200">
              Add
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {attendees.map(attendee => (
              <span key={attendee.email} className="inline-flex items-center gap-1 px-2 py-1 bg-secondary-100 dark:bg-secondary-700 rounded-full text-xs">
                {attendee.email}
                <button onClick={() => handleRemoveAttendee(attendee.email)} className="hover:text-red-500">×</button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 space-y-4">
        <h3 className="text-sm font-medium text-secondary-900 dark:text-white">Scheduling Preferences</h3>
        <div>
          <label className="block text-sm text-secondary-700 dark:text-secondary-300 mb-2">Preferred Days</label>
          <div className="flex gap-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => (
              <button
                key={day}
                onClick={() => {
                  if (preferredDays.includes(idx + 1)) {
                    setPreferredDays(preferredDays.filter(d => d !== idx + 1));
                  } else {
                    setPreferredDays([...preferredDays, idx + 1]);
                  }
                }}
                className={`w-10 h-10 rounded-full text-sm font-medium transition-colors ${
                  preferredDays.includes(idx + 1)
                    ? 'bg-orange-600 text-white'
                    : 'bg-secondary-100 text-secondary-600 hover:bg-secondary-200'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm text-secondary-700 dark:text-secondary-300 mb-2">Working Hours</label>
          <div className="flex gap-3 items-center">
            <select
              value={workingHours.start}
              onChange={(e) => setWorkingHours({ ...workingHours, start: parseInt(e.target.value) })}
              className="px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600"
            >
              {Array.from({ length: 12 }, (_, i) => i + 8).map(h => (
                <option key={h} value={h}>{h}:00</option>
              ))}
            </select>
            <span>to</span>
            <select
              value={workingHours.end}
              onChange={(e) => setWorkingHours({ ...workingHours, end: parseInt(e.target.value) })}
              className="px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600"
            >
              {Array.from({ length: 12 }, (_, i) => i + 9).map(h => (
                <option key={h} value={h}>{h}:00</option>
              ))}
            </select>
          </div>
        </div>
        <button
          onClick={handleFindSlots}
          disabled={isLoading || !title || attendees.length === 0}
          className="w-full py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarIcon className="h-4 w-4" />}
          Find Available Slots
        </button>
      </div>

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="bg-white dark:bg-secondary-800 rounded-xl border border-secondary-200 dark:border-secondary-700 p-4 space-y-3">
          <h3 className="text-sm font-medium text-secondary-900 dark:text-white">Suggested Times</h3>
          {suggestions.map((slot, idx) => (
            <div
              key={idx}
              onClick={() => setSelectedSlot(slot)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedSlot === slot
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  : 'border-secondary-200 hover:border-orange-300'
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-secondary-500" />
                    <span className="font-medium">
                      {format(slot.start, 'EEE, MMM d')} • {format(slot.start, 'h:mm a')} - {format(slot.end, 'h:mm a')}
                    </span>
                  </div>
                  <p className="text-sm text-secondary-500 mt-1">{slot.reason}</p>
                </div>
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(slot.confidence)}`}>
                  {Math.round(slot.confidence * 100)}% confidence
                </div>
              </div>
            </div>
          ))}
          {selectedSlot && (
            <button
              onClick={handleSchedule}
              disabled={isLoading}
              className="w-full mt-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg flex items-center justify-center gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              Schedule Meeting
            </button>
          )}
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-3 text-red-700 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
};
export default SmartScheduler;
