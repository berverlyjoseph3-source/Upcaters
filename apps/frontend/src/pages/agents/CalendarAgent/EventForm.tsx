// enterprise-ai-agent-platform/apps/frontend/src/pages/agents/CalendarAgent/EventForm.tsx
import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, MapPin, Users, Bell, Save, Trash2 } from 'lucide-react';

interface Event {
  id ? : string;
  title: string;
  description ? : string;
  start: Date;
  end: Date;
  location ? : string;
  attendees ? : string[];
  reminders ? : number[];
  color ? : string;
}

interface EventFormProps {
  event ? : Event | null;
  onClose: () => void;
  onSave: (event: Event) => void;
  onDelete ? : (id: string) => void;
}

const colorOptions = [
  { value: 'bg-blue-500', label: 'Blue' },
  { value: 'bg-green-500', label: 'Green' },
  { value: 'bg-purple-500', label: 'Purple' },
  { value: 'bg-pink-500', label: 'Pink' },
  { value: 'bg-orange-500', label: 'Orange' },
  { value: 'bg-red-500', label: 'Red' },
];

export const EventForm: React.FC < EventFormProps > = ({ event, onClose, onSave, onDelete }) => {
  const [formData, setFormData] = useState < Event > ({
    title: '',
    description: '',
    start: new Date(),
    end: new Date(new Date().setHours(new Date().getHours() + 1)),
    location: '',
    attendees: [],
    reminders: [15],
    color: 'bg-blue-500',
  });
  const [attendeeInput, setAttendeeInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState < string | null > (null);
  
  useEffect(() => {
    if (event) {
      setFormData({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      });
    }
  }, [event]);
  
  const handleChange = (field: keyof Event, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleAddAttendee = () => {
    if (attendeeInput && !formData.attendees?.includes(attendeeInput)) {
      setFormData(prev => ({
        ...prev,
        attendees: [...(prev.attendees || []), attendeeInput],
      }));
      setAttendeeInput('');
    }
  };
  
  const handleRemoveAttendee = (email: string) => {
    setFormData(prev => ({
      ...prev,
      attendees: prev.attendees?.filter(a => a !== email) || [],
    }));
  };
  
  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }
    if (formData.start >= formData.end) {
      setError('End time must be after start time');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      onSave(formData);
      onClose();
    } catch (err) {
      setError('Failed to save event');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = () => {
    if (event?.id && onDelete) {
      onDelete(event.id);
      onClose();
    }
  };
  
  const formatDateTimeLocal = (date: Date) => {
    return date.toISOString().slice(0, 16);
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-secondary-200 dark:border-secondary-700">
          <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">
            {event ? 'Edit Event' : 'New Event'}
          </h2>
          <button onClick={onClose} className="p-1 rounded-md hover:bg-secondary-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg p-2 text-red-700 text-sm">{error}</div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
              placeholder="Meeting title"
            />
          </div>

          {/* Start & End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Start</label>
              <input
                type="datetime-local"
                value={formatDateTimeLocal(formData.start)}
                onChange={(e) => handleChange('start', new Date(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End</label>
              <input
                type="datetime-local"
                value={formatDateTimeLocal(formData.end)}
                onChange={(e) => handleChange('end', new Date(e.target.value))}
                className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
              placeholder="Event description"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-400" />
              <input
                type="text"
                value={formData.location || ''}
                onChange={(e) => handleChange('location', e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-900"
                placeholder="Conference room, video link, etc."
              />
            </div>
          </div>

          {/* Attendees */}
          <div>
            <label className="block text-sm font-medium mb-1">Attendees</label>
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
              {formData.attendees?.map(email => (
                <span key={email} className="inline-flex items-center gap-1 px-2 py-1 bg-secondary-100 dark:bg-secondary-700 rounded-full text-xs">
                  {email}
                  <button onClick={() => handleRemoveAttendee(email)} className="hover:text-red-500">×</button>
                </span>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="block text-sm font-medium mb-1">Color</label>
            <div className="flex gap-2">
              {colorOptions.map(color => (
                <button
                  key={color.value}
                  onClick={() => handleChange('color', color.value)}
                  className={`w-8 h-8 rounded-full ${color.value} ${formData.color === color.value ? 'ring-2 ring-offset-2 ring-primary-500' : ''}`}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-between p-4 border-t border-secondary-200 dark:border-secondary-700">
          <div>
            {event?.id && onDelete && (
              <button
                onClick={handleDelete}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-secondary-300 hover:bg-secondary-50">
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isLoading}
              className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" /> : <Save className="h-4 w-4" />}
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
export default EventForm;
