// apps/frontend/src/hooks/useCalendar.ts
import { useState, useCallback, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useAuthStore } from '../store/auth.store';
import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';

// ============================================
// Types
// ============================================

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: Date;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: Date;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
    optional?: boolean;
  }>;
  organizer?: {
    email: string;
    displayName?: string;
  };
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  recurrence?: string[];
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
  conferenceData?: {
    entryPoints?: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
    conferenceSolution?: {
      name: string;
      iconUri: string;
    };
  };
  color?: string;
  created: Date;
  updated: Date;
  htmlLink?: string;
  iCalUID?: string;
  sequence?: number;
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  timeZone?: string;
  summaryOverride?: string;
  colorId?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  hidden?: boolean;
  selected?: boolean;
  accessRole?: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  primary?: boolean;
  deleted?: boolean;
}

export interface CreateEventOptions {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  timeZone?: string;
  attendees?: string[];
  isAllDay?: boolean;
  recurrence?: string[];
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
  conferenceData?: boolean;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
  calendarId?: string;
  color?: string;
}

export interface UpdateEventOptions {
  eventId: string;
  calendarId?: string;
  title?: string;
  description?: string;
  location?: string;
  start?: Date;
  end?: Date;
  timeZone?: string;
  attendees?: string[];
  addAttendees?: string[];
  removeAttendees?: string[];
  status?: 'confirmed' | 'tentative' | 'cancelled';
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}

export interface FreeBusyRequest {
  timeMin: Date;
  timeMax: Date;
  calendars?: string[];
  timeZone?: string;
}

export interface FreeBusySlot {
  start: Date;
  end: Date;
}

export interface FreeBusyResponse {
  calendars: Record<string, { busy: FreeBusySlot[] }>;
  timeMin: Date;
  timeMax: Date;
}

export interface SmartScheduleOptions {
  title: string;
  attendees: string[];
  durationMinutes: number;
  timeMin?: Date;
  timeMax?: Date;
  timeZone?: string;
  bufferMinutes?: number;
  workingHours?: {
    daysOfWeek: number[];
    startHour: number;
    endHour: number;
  };
  description?: string;
  location?: string;
  conferenceData?: boolean;
}

export interface SuggestedMeetingTime {
  start: Date;
  end: Date;
  attendees: string[];
  confidence: number;
  conflicts?: string[];
}

export interface CalendarSettings {
  timeZone: string;
  workingHours: {
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
    timeZone: string;
  };
  defaultCalendarId: string;
  defaultReminders: Array<{ method: 'email' | 'popup'; minutes: number }>;
}

export type CalendarViewMode = 'month' | 'week' | 'day' | 'agenda';

// ============================================
// Hook
// ============================================

export function useCalendar() {
  const { user, isAuthenticated } = useAuthStore();

  // State
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<CalendarListEntry[]>([]);
  const [selectedCalendars, setSelectedCalendars] = useState<Set<string>>(new Set(['primary']));
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [settings, setSettings] = useState<CalendarSettings | null>(null);

  // ============================================
  // Fetch Events
  // ============================================

  const getDateRange = useCallback(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    switch (viewMode) {
      case 'month': {
        start.setDate(1);
        start.setMonth(start.getMonth() - 1);
        start.setHours(0, 0, 0, 0);

        end.setMonth(end.getMonth() + 2);
        end.setDate(0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'week': {
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);

        end.setDate(end.getDate() + (6 - dayOfWeek) + 1);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'day': {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      }
      case 'agenda': {
        start.setDate(start.getDate() - 1);
        start.setHours(0, 0, 0, 0);
        end.setDate(end.getDate() + 30);
        end.setHours(23, 59, 59, 999);
        break;
      }
    }

    return { timeMin: start, timeMax: end };
  }, [currentDate, viewMode]);

  const fetchEvents = useCallback(async (force: boolean = false) => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const { timeMin, timeMax } = getDateRange();

      const response = await apiClient.get<{
        events: CalendarEvent[];
        nextPageToken?: string;
        timeZone?: string;
      }>('/api/agent/calendar/events', {
        params: {
          timeMin: timeMin.toISOString(),
          timeMax: timeMax.toISOString(),
          calendarIds: Array.from(selectedCalendars).join(','),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 250,
        },
      });

      if (response.success && response.data) {
        const parsedEvents = response.data.events.map(transformEvent);
        setEvents(parsedEvents);
      }

      setLastSync(new Date());
    } catch (err) {
      console.error('Failed to fetch calendar events:', err);
      setError('Failed to load calendar events');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, getDateRange, selectedCalendars]);

  // ============================================
  // Fetch Calendars
  // ============================================

  const fetchCalendars = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await apiClient.get<CalendarListEntry[]>(
        '/api/agent/calendar/calendars'
      );

      if (response.success && response.data) {
        setCalendars(response.data);
        setIsConnected(true);

        // Set primary calendar as selected
        const primary = response.data.find(c => c.primary);
        if (primary) {
          setSelectedCalendars(new Set([primary.id]));
        }
      }
    } catch (err) {
      console.error('Failed to fetch calendars:', err);
      setIsConnected(false);
    }
  }, [isAuthenticated]);

  // ============================================
  // Fetch Settings
  // ============================================

  const fetchSettings = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      const response = await apiClient.get<CalendarSettings>(
        '/api/agent/calendar/settings'
      );

      if (response.success && response.data) {
        setSettings(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch calendar settings:', err);
    }
  }, [isAuthenticated]);

  // ============================================
  // Create Event
  // ============================================

  const createEvent = useCallback(async (options: CreateEventOptions): Promise<{
    success: boolean;
    event?: CalendarEvent;
    error?: string;
  }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await apiClient.post<CalendarEvent>(
        '/api/agent/calendar/events',
        {
          ...options,
          start: options.start.toISOString(),
          end: options.end.toISOString(),
          timeZone: options.timeZone || settings?.timeZone || 'UTC',
          calendarId: options.calendarId || Array.from(selectedCalendars)[0] || 'primary',
        }
      );

      if (response.success && response.data) {
        const newEvent = transformEvent(response.data);
        setEvents(prev => [...prev, newEvent].sort(sortEvents));
        return { success: true, event: newEvent };
      }

      return { success: false, error: response.error || 'Failed to create event' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create event';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsCreating(false);
    }
  }, [isAuthenticated, selectedCalendars, settings]);

  // ============================================
  // Update Event
  // ============================================

  const updateEvent = useCallback(async (options: UpdateEventOptions): Promise<{
    success: boolean;
    event?: CalendarEvent;
    error?: string;
  }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    setIsUpdating(true);
    setError(null);

    try {
      const payload: Record<string, any> = { ...options };

      if (options.start) payload.start = options.start.toISOString();
      if (options.end) payload.end = options.end.toISOString();

      const response = await apiClient.put<CalendarEvent>(
        `/api/agent/calendar/events/${options.eventId}`,
        payload
      );

      if (response.success && response.data) {
        const updatedEvent = transformEvent(response.data);
        setEvents(prev =>
          prev.map(e => e.id === updatedEvent.id ? updatedEvent : e)
        );
        return { success: true, event: updatedEvent };
      }

      return { success: false, error: response.error || 'Failed to update event' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update event';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsUpdating(false);
    }
  }, [isAuthenticated]);

  // ============================================
  // Delete Event
  // ============================================

  const deleteEvent = useCallback(async (
    eventId: string,
    sendUpdates: 'all' | 'externalOnly' | 'none' = 'all'
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    setIsUpdating(true);
    setError(null);

    try {
      const response = await apiClient.delete(
        `/api/agent/calendar/events/${eventId}`
      );

      if (response.success) {
        setEvents(prev => prev.filter(e => e.id !== eventId));
        return { success: true };
      }

      return { success: false, error: response.error || 'Failed to delete event' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete event';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsUpdating(false);
    }
  }, [isAuthenticated]);

  // ============================================
  // Quick Add Event (natural language)
  // ============================================

  const quickAddEvent = useCallback(async (
    text: string,
    calendarId?: string
  ): Promise<{ success: boolean; event?: CalendarEvent; error?: string }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await apiClient.post<CalendarEvent>(
        '/api/agent/calendar/events/quick-add',
        {
          text,
          calendarId: calendarId || Array.from(selectedCalendars)[0] || 'primary',
        }
      );

      if (response.success && response.data) {
        const newEvent = transformEvent(response.data);
        setEvents(prev => [...prev, newEvent].sort(sortEvents));
        return { success: true, event: newEvent };
      }

      return { success: false, error: response.error || 'Failed to add event' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add event';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsCreating(false);
    }
  }, [isAuthenticated, selectedCalendars]);

  // ============================================
  // Free/Busy
  // ============================================

  const getFreeBusy = useCallback(async (request: FreeBusyRequest): Promise<{
    success: boolean;
    data?: FreeBusyResponse;
    error?: string;
  }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await apiClient.post<FreeBusyResponse>(
        '/api/agent/calendar/freebusy',
        {
          timeMin: request.timeMin.toISOString(),
          timeMax: request.timeMax.toISOString(),
          calendars: request.calendars || Array.from(selectedCalendars),
          timeZone: request.timeZone,
        }
      );

      if (response.success && response.data) {
        return {
          success: true,
          data: {
            ...response.data,
            timeMin: new Date(response.data.timeMin),
            timeMax: new Date(response.data.timeMax),
          },
        };
      }

      return { success: false, error: response.error || 'Failed to check availability' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to check availability';
      return { success: false, error: message };
    }
  }, [isAuthenticated, selectedCalendars]);

  // ============================================
  // Smart Schedule
  // ============================================

  const smartSchedule = useCallback(async (options: SmartScheduleOptions): Promise<{
    success: boolean;
    suggestions?: SuggestedMeetingTime[];
    createdEvent?: CalendarEvent;
    error?: string;
  }> => {
    if (!isAuthenticated) {
      return { success: false, error: 'Not authenticated' };
    }

    setIsCreating(true);
    setError(null);

    try {
      const response = await apiClient.post<{
        suggestions: SuggestedMeetingTime[];
        createdEvent?: CalendarEvent;
      }>('/api/agent/calendar/smart-schedule', {
        ...options,
        timeMin: options.timeMin?.toISOString(),
        timeMax: options.timeMax?.toISOString(),
      });

      if (response.success && response.data) {
        if (response.data.createdEvent) {
          const newEvent = transformEvent(response.data.createdEvent);
          setEvents(prev => [...prev, newEvent].sort(sortEvents));
        }

        return {
          success: true,
          suggestions: response.data.suggestions?.map(s => ({
            ...s,
            start: new Date(s.start),
            end: new Date(s.end),
          })),
          createdEvent: response.data.createdEvent
            ? transformEvent(response.data.createdEvent)
            : undefined,
        };
      }

      return { success: false, error: response.error || 'Smart scheduling failed' };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Smart scheduling failed';
      setError(message);
      return { success: false, error: message };
    } finally {
      setIsCreating(false);
    }
  }, [isAuthenticated]);

  // ============================================
  // Navigation
  // ============================================

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const goToNext = useCallback(() => {
    setCurrentDate(prev => {
      const next = new Date(prev);
      switch (viewMode) {
        case 'month':
          next.setMonth(prev.getMonth() + 1);
          break;
        case 'week':
          next.setDate(prev.getDate() + 7);
          break;
        case 'day':
          next.setDate(prev.getDate() + 1);
          break;
        case 'agenda':
          next.setMonth(prev.getMonth() + 1);
          break;
      }
      return next;
    });
  }, [viewMode]);

  const goToPrevious = useCallback(() => {
    setCurrentDate(prev => {
      const prevDate = new Date(prev);
      switch (viewMode) {
        case 'month':
          prevDate.setMonth(prev.getMonth() - 1);
          break;
        case 'week':
          prevDate.setDate(prev.getDate() - 7);
          break;
        case 'day':
          prevDate.setDate(prev.getDate() - 1);
          break;
        case 'agenda':
          prevDate.setMonth(prev.getMonth() - 1);
          break;
      }
      return prevDate;
    });
  }, [viewMode]);

  const goToDate = useCallback((date: Date) => {
    setCurrentDate(date);
  }, []);

  // ============================================
  // Calendar Selection
  // ============================================

  const toggleCalendarSelection = useCallback((calendarId: string) => {
    setSelectedCalendars(prev => {
      const newSet = new Set(prev);
      if (newSet.has(calendarId)) {
        if (newSet.size > 1) {
          newSet.delete(calendarId);
        }
      } else {
        newSet.add(calendarId);
      }
      return newSet;
    });
  }, []);

  const selectAllCalendars = useCallback(() => {
    setSelectedCalendars(new Set(calendars.map(c => c.id)));
  }, [calendars]);

  const deselectAllCalendars = useCallback(() => {
    const primary = calendars.find(c => c.primary);
    if (primary) {
      setSelectedCalendars(new Set([primary.id]));
    }
  }, [calendars]);

  // ============================================
  // Helpers
  // ============================================

  const transformEvent = (event: any): CalendarEvent => ({
    id: event.id,
    calendarId: event.calendarId || 'primary',
    title: event.title || event.summary || 'Untitled Event',
    description: event.description,
    location: event.location,
    start: {
      dateTime: event.start?.dateTime ? new Date(event.start.dateTime) : undefined,
      date: event.start?.date,
      timeZone: event.start?.timeZone,
    },
    end: {
      dateTime: event.end?.dateTime ? new Date(event.end.dateTime) : undefined,
      date: event.end?.date,
      timeZone: event.end?.timeZone,
    },
    attendees: event.attendees?.map((a: any) => ({
      email: a.email,
      displayName: a.displayName,
      responseStatus: a.responseStatus || 'needsAction',
      optional: a.optional,
    })),
    organizer: event.organizer ? {
      email: event.organizer.email,
      displayName: event.organizer.displayName,
    } : undefined,
    status: event.status || 'confirmed',
    visibility: event.visibility,
    recurrence: event.recurrence,
    reminders: event.reminders || { useDefault: true },
    conferenceData: event.conferenceData,
    color: event.color || event.colorId,
    created: event.created ? new Date(event.created) : new Date(),
    updated: event.updated ? new Date(event.updated) : new Date(),
    htmlLink: event.htmlLink,
    iCalUID: event.iCalUID,
    sequence: event.sequence,
  });

  const sortEvents = (a: CalendarEvent, b: CalendarEvent): number => {
    const aStart = a.start.dateTime || (a.start.date ? new Date(a.start.date) : new Date(0));
    const bStart = b.start.dateTime || (b.start.date ? new Date(b.start.date) : new Date(0));
    return aStart.getTime() - bStart.getTime();
  };

  const getEventsForDate = useCallback((date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventStart = event.start.dateTime || (event.start.date ? new Date(event.start.date + 'T00:00:00') : null);
      const eventEnd = event.end.dateTime || (event.end.date ? new Date(event.end.date + 'T23:59:59') : null);

      if (!eventStart) return false;

      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      if (event.start.date && event.end.date) {
        // All-day event
        const start = new Date(event.start.date + 'T00:00:00');
        const end = new Date(event.end.date + 'T00:00:00');
        return start <= endOfDay && end >= startOfDay;
      }

      return eventStart <= endOfDay && (eventEnd || eventStart) >= startOfDay;
    });
  }, [events]);

  const getEventById = useCallback((eventId: string): CalendarEvent | undefined => {
    return events.find(e => e.id === eventId);
  }, [events]);

  // ============================================
  // Auto-fetch on date/view change
  // ============================================

  useEffect(() => {
    if (isAuthenticated) {
      fetchEvents();
    }
  }, [currentDate, viewMode, selectedCalendars, isAuthenticated]);

  // ============================================
  // Initialize on mount
  // ============================================

  useEffect(() => {
    if (isAuthenticated) {
      fetchCalendars();
      fetchSettings();
    }
  }, [isAuthenticated]);

  // ============================================
  // Auto-refresh every 5 minutes
  // ============================================

  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      fetchEvents(true);
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isAuthenticated, fetchEvents]);

  return {
    // State
    events,
    calendars,
    selectedCalendars,
    currentDate,
    viewMode,
    isLoading,
    isCreating,
    isUpdating,
    error,
    lastSync,
    isConnected,
    settings,

    // Actions
    fetchEvents,
    fetchCalendars,
    fetchSettings,
    createEvent,
    updateEvent,
    deleteEvent,
    quickAddEvent,
    getFreeBusy,
    smartSchedule,

    // Navigation
    goToToday,
    goToNext,
    goToPrevious,
    goToDate,
    setViewMode,

    // Calendar Selection
    toggleCalendarSelection,
    selectAllCalendars,
    deselectAllCalendars,

    // Helpers
    getEventsForDate,
    getEventById,
    setError,
  };
}

export default useCalendar;