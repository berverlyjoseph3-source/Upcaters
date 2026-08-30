// enterprise-ai-agent-platform/apps/frontend/src/store/calendar.store.ts
import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { apiClient } from '../api/client';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  subDays,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
} from 'date-fns';

// ============================================
// Types
// ============================================

export type CalendarView = 'month' | 'week' | 'day';
export type CalendarViewMode = 'calendar' | 'schedule' | 'list';
export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';
export type EventVisibility = 'default' | 'public' | 'private' | 'confidential';
export type AttendeeResponse = 'needsAction' | 'declined' | 'tentative' | 'accepted';
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type ReminderMethod = 'email' | 'popup';
export type SendUpdates = 'all' | 'externalOnly' | 'none';

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  timeZone?: string;
  isAllDay: boolean;
  attendees?: EventAttendee[];
  organizer?: EventAttendee;
  status: EventStatus;
  visibility: EventVisibility;
  recurrence?: RecurrenceRule;
  reminders?: ReminderSettings;
  conferenceData?: ConferenceData;
  color?: string;
  created: Date;
  updated: Date;
  htmlLink?: string;
}

export interface EventAttendee {
  email: string;
  displayName?: string;
  responseStatus: AttendeeResponse;
  optional?: boolean;
  comment?: string;
}

export interface RecurrenceRule {
  frequency: RecurrenceFrequency;
  interval?: number;
  until?: Date;
  count?: number;
  byDay?: string[];
  byMonthDay?: number[];
  byMonth?: number[];
}

export interface ReminderSettings {
  useDefault: boolean;
  overrides?: ReminderOverride[];
}

export interface ReminderOverride {
  method: ReminderMethod;
  minutes: number;
}

export interface ConferenceData {
  entryPoints?: ConferenceEntryPoint[];
  conferenceSolution?: {
    name: string;
    iconUri: string;
  };
  conferenceId?: string;
}

export interface ConferenceEntryPoint {
  entryPointType: 'video' | 'phone' | 'sip' | 'more';
  uri: string;
  label?: string;
  pin?: string;
}

export interface CalendarListEntry {
  id: string;
  summary: string;
  description?: string;
  timeZone?: string;
  color?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  accessRole?: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
}

export interface FreeBusyResponse {
  calendars: Record<string, {
    busy: Array<{ start: Date; end: Date }>;
  }>;
  timeMin: Date;
  timeMax: Date;
}

export interface SuggestedMeetingTime {
  start: Date;
  end: Date;
  attendees: string[];
  confidence: number;
  meetingRoom?: {
    id: string;
    name: string;
    location: string;
  };
}

export interface WorkingHours {
  daysOfWeek: number[];
  startTime: string;
  endTime: string;
  timeZone: string;
}

export interface CalendarSettings {
  timeZone: string;
  dateFormat: string;
  timeFormat: '12' | '24';
  weekStart: 'sunday' | 'monday';
  defaultCalendarId: string;
  defaultReminders: ReminderOverride[];
  workingHours: WorkingHours;
  showWeekends: boolean;
  showDeclinedEvents: boolean;
}

export interface CreateEventOptions {
  calendarId?: string;
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  timeZone?: string;
  attendees?: string[];
  isAllDay?: boolean;
  recurrence?: RecurrenceRule;
  reminders?: ReminderSettings;
  conferenceData?: boolean;
  color?: string;
  sendUpdates?: SendUpdates;
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
  status?: EventStatus;
  recurrence?: RecurrenceRule | null;
  color?: string;
  sendUpdates?: SendUpdates;
}

export interface SmartScheduleOptions {
  title: string;
  attendees: string[];
  durationMinutes: number;
  timeMin?: Date;
  timeMax?: Date;
  timeZone?: string;
  bufferMinutes?: number;
  workingHoursOnly?: boolean;
  description?: string;
}

// ============================================
// Helper Functions
// ============================================

const EVENT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#a855f7',
];

const getDefaultColor = (): string => {
  return EVENT_COLORS[Math.floor(Math.random() * EVENT_COLORS.length)];
};

// ============================================
// Initial State
// ============================================

const initialState = {
  // Calendar Data
  events: [] as CalendarEvent[],
  calendars: [] as CalendarListEntry[],
  selectedEventId: null as string | null,
  selectedCalendarId: 'primary' as string,
  
  // View State
  currentDate: new Date(),
  viewMode: 'month' as CalendarView,
  activeView: 'calendar' as CalendarViewMode,
  
  // Loading State
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isDeleting: false,
  isScheduling: false,
  error: null as string | null,
  lastSyncTime: null as Date | null,
  
  // Event Form State
  eventFormOpen: false,
  editingEvent: null as CalendarEvent | null,
  eventFormTitle: '',
  eventFormDescription: '',
  eventFormLocation: '',
  eventFormStart: new Date(),
  eventFormEnd: new Date(new Date().setHours(new Date().getHours() + 1)),
  eventFormTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  eventFormIsAllDay: false,
  eventFormAttendees: [] as string[],
  eventFormAttendeeInput: '',
  eventFormRecurrence: null as RecurrenceRule | null,
  eventFormReminders: { useDefault: true, overrides: [] } as ReminderSettings,
  eventFormConferenceData: false,
  eventFormColor: getDefaultColor(),
  eventFormStatus: 'confirmed' as EventStatus,
  eventFormVisibility: 'default' as EventVisibility,
  
  // Smart Scheduler State
  schedulerOpen: false,
  schedulerTitle: '',
  schedulerDuration: 60,
  schedulerAttendees: [] as string[],
  schedulerAttendeeInput: '',
  schedulerWorkingHoursOnly: true,
  schedulerBufferMinutes: 15,
  schedulerSuggestions: [] as SuggestedMeetingTime[],
  schedulerSelectedSlot: null as SuggestedMeetingTime | null,
  
  // Settings
  settings: {
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    dateFormat: 'MM/dd/yyyy',
    timeFormat: '12' as '12' | '24',
    weekStart: 'monday' as 'sunday' | 'monday',
    defaultCalendarId: 'primary',
    defaultReminders: [{ method: 'popup' as ReminderMethod, minutes: 15 }],
    workingHours: {
      daysOfWeek: [0, 1, 2, 3, 4],
      startTime: '09:00',
      endTime: '17:00',
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    showWeekends: true,
    showDeclinedEvents: false,
  } as CalendarSettings,
};

// ============================================
// Store State Interface
// ============================================

interface CalendarState {
  // ============================================
  // State (from initialState)
  // ============================================
  events: CalendarEvent[];
  calendars: CalendarListEntry[];
  selectedEventId: string | null;
  selectedCalendarId: string;
  currentDate: Date;
  viewMode: CalendarView;
  activeView: CalendarViewMode;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  isScheduling: boolean;
  error: string | null;
  lastSyncTime: Date | null;
  
  // Event Form
  eventFormOpen: boolean;
  editingEvent: CalendarEvent | null;
  eventFormTitle: string;
  eventFormDescription: string;
  eventFormLocation: string;
  eventFormStart: Date;
  eventFormEnd: Date;
  eventFormTimeZone: string;
  eventFormIsAllDay: boolean;
  eventFormAttendees: string[];
  eventFormAttendeeInput: string;
  eventFormRecurrence: RecurrenceRule | null;
  eventFormReminders: ReminderSettings;
  eventFormConferenceData: boolean;
  eventFormColor: string;
  eventFormStatus: EventStatus;
  eventFormVisibility: EventVisibility;
  
  // Scheduler
  schedulerOpen: boolean;
  schedulerTitle: string;
  schedulerDuration: number;
  schedulerAttendees: string[];
  schedulerAttendeeInput: string;
  schedulerWorkingHoursOnly: boolean;
  schedulerBufferMinutes: number;
  schedulerSuggestions: SuggestedMeetingTime[];
  schedulerSelectedSlot: SuggestedMeetingTime | null;
  
  // Settings
  settings: CalendarSettings;

  // ============================================
  // Computed
  // ============================================
  getSelectedEvent: () => CalendarEvent | null;
  getEventsForDate: (date: Date) => CalendarEvent[];
  getEventsForDateRange: (start: Date, end: Date) => CalendarEvent[];
  getUpcomingEvents: (limit?: number) => CalendarEvent[];
  getTodayEvents: () => CalendarEvent[];
  getDayEvents: (date: Date) => CalendarEvent[];
  getWeekEvents: () => CalendarEvent[];
  getMonthEvents: () => CalendarEvent[];
  getDaysInView: () => Date[];
  getViewTitle: () => string;
  getNextDate: () => Date;
  getPreviousDate: () => Date;

  // ============================================
  // Actions - Event Fetching
  // ============================================
  fetchEvents: (timeMin?: Date, timeMax?: Date) => Promise<void>;
  fetchEventById: (eventId: string) => Promise<CalendarEvent | null>;
  fetchCalendars: () => Promise<void>;
  refreshEvents: () => Promise<void>;
  syncEvents: () => Promise<void>;

  // ============================================
  // Actions - Event CRUD
  // ============================================
  createEvent: (options: CreateEventOptions) => Promise<{ success: boolean; eventId?: string; error?: string }>;
  updateEvent: (options: UpdateEventOptions) => Promise<{ success: boolean; error?: string }>;
  deleteEvent: (eventId: string, sendUpdates?: SendUpdates) => Promise<{ success: boolean; error?: string }>;
  deleteRecurringEvent: (eventId: string, deleteAll: boolean) => Promise<{ success: boolean; error?: string }>;
  quickAddEvent: (text: string) => Promise<{ success: boolean; eventId?: string; error?: string }>;

  // ============================================
  // Actions - Event Management
  // ============================================
  markEventStatus: (eventId: string, status: EventStatus) => Promise<void>;
  addAttendees: (eventId: string, attendees: string[]) => Promise<void>;
  removeAttendees: (eventId: string, attendees: string[]) => Promise<void>;
  respondToEvent: (eventId: string, response: AttendeeResponse, comment?: string) => Promise<void>;

  // ============================================
  // Actions - Free/Busy & Scheduling
  // ============================================
  checkFreeBusy: (timeMin: Date, timeMax: Date, calendars?: string[]) => Promise<FreeBusyResponse | null>;
  findAvailableSlots: (options: SmartScheduleOptions) => Promise<void>;
  smartSchedule: (options: SmartScheduleOptions) => Promise<{ success: boolean; eventId?: string; error?: string }>;
  openScheduler: () => void;
  closeScheduler: () => void;
  updateSchedulerField: (field: string, value: any) => void;
  addSchedulerAttendee: () => void;
  removeSchedulerAttendee: (email: string) => void;
  selectSchedulerSlot: (slot: SuggestedMeetingTime) => void;

  // ============================================
  // Actions - Event Form
  // ============================================
  openNewEventForm: (date?: Date) => void;
  openEditEventForm: (event: CalendarEvent) => void;
  closeEventForm: () => void;
  updateEventForm: (field: string, value: any) => void;
  addEventFormAttendee: () => void;
  removeEventFormAttendee: (email: string) => void;
  setEventFormRecurrence: (frequency: RecurrenceFrequency | null) => void;
  addEventFormReminder: (method: ReminderMethod, minutes: number) => void;
  removeEventFormReminder: (index: number) => void;

  // ============================================
  // Actions - Navigation
  // ============================================
  goToToday: () => void;
  goToDate: (date: Date) => void;
  navigateNext: () => void;
  navigatePrevious: () => void;
  goToMonth: (date: Date) => void;

  // ============================================
  // Actions - View & Settings
  // ============================================
  setViewMode: (mode: CalendarView) => void;
  setActiveView: (view: CalendarViewMode) => void;
  selectEvent: (eventId: string | null) => void;
  selectCalendar: (calendarId: string) => void;
  updateSettings: (updates: Partial<CalendarSettings>) => void;
  clearError: () => void;
  resetState: () => void;
}

// ============================================
// Store Implementation
// ============================================

export const useCalendarStore = create<CalendarState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // ============================================
        // Computed Getters
        // ============================================

        getSelectedEvent: () => {
          const { events, selectedEventId } = get();
          return events.find(e => e.id === selectedEventId) || null;
        },

        getEventsForDate: (date: Date) => {
          return get().events.filter(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            return eventStart <= dayEnd && eventEnd >= dayStart;
          });
        },

        getEventsForDateRange: (start: Date, end: Date) => {
          return get().events.filter(event => {
            const eventStart = new Date(event.start);
            const eventEnd = new Date(event.end);
            return eventStart < end && eventEnd > start;
          });
        },

        getUpcomingEvents: (limit: number = 5) => {
          const now = new Date();
          return get().events
            .filter(e => new Date(e.start) >= now && e.status !== 'cancelled')
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
            .slice(0, limit);
        },

        getTodayEvents: () => {
          return get().getEventsForDate(new Date());
        },

        getDayEvents: (date: Date) => {
          return get().getEventsForDate(date);
        },

        getWeekEvents: () => {
          const { currentDate } = get();
          const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
          const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
          return get().getEventsForDateRange(weekStart, weekEnd);
        },

        getMonthEvents: () => {
          const { currentDate } = get();
          const monthStart = startOfMonth(currentDate);
          const monthEnd = endOfMonth(currentDate);
          return get().getEventsForDateRange(monthStart, monthEnd);
        },

        getDaysInView: () => {
          const { currentDate, viewMode } = get();
          let start: Date;
          let end: Date;

          switch (viewMode) {
            case 'month':
              start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
              end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
              break;
            case 'week':
              start = startOfWeek(currentDate, { weekStartsOn: 1 });
              end = endOfWeek(currentDate, { weekStartsOn: 1 });
              break;
            case 'day':
              start = new Date(currentDate);
              start.setHours(0, 0, 0, 0);
              end = new Date(currentDate);
              end.setHours(23, 59, 59, 999);
              return [start];
            default:
              start = startOfMonth(currentDate);
              end = endOfMonth(currentDate);
          }

          const days: Date[] = [];
          let current = new Date(start);
          while (current <= end) {
            days.push(new Date(current));
            current = addDays(current, 1);
          }
          return days;
        },

        getViewTitle: () => {
          const { currentDate, viewMode } = get();
          switch (viewMode) {
            case 'month':
              return format(currentDate, 'MMMM yyyy');
            case 'week': {
              const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
              const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
              return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
            }
            case 'day':
              return format(currentDate, 'EEEE, MMMM d, yyyy');
            default:
              return format(currentDate, 'MMMM yyyy');
          }
        },

        getNextDate: () => {
          const { currentDate, viewMode } = get();
          switch (viewMode) {
            case 'month':
              return addMonths(currentDate, 1);
            case 'week':
              return addWeeks(currentDate, 1);
            case 'day':
              return addDays(currentDate, 1);
            default:
              return addMonths(currentDate, 1);
          }
        },

        getPreviousDate: () => {
          const { currentDate, viewMode } = get();
          switch (viewMode) {
            case 'month':
              return subMonths(currentDate, 1);
            case 'week':
              return subWeeks(currentDate, 1);
            case 'day':
              return subDays(currentDate, 1);
            default:
              return subMonths(currentDate, 1);
          }
        },

        // ============================================
        // Event Fetching Actions
        // ============================================

        fetchEvents: async (timeMin?: Date, timeMax?: Date) => {
          set({ isLoading: true, error: null });

          try {
            const { currentDate, viewMode } = get();
            const effectiveTimeMin = timeMin || (() => {
              switch (viewMode) {
                case 'month':
                  return startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
                case 'week':
                  return startOfWeek(currentDate, { weekStartsOn: 1 });
                case 'day':
                  const d = new Date(currentDate);
                  d.setHours(0, 0, 0, 0);
                  return d;
                default:
                  return startOfMonth(currentDate);
              }
            })();

            const effectiveTimeMax = timeMax || (() => {
              switch (viewMode) {
                case 'month':
                  return endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
                case 'week':
                  return endOfWeek(currentDate, { weekStartsOn: 1 });
                case 'day':
                  const d = new Date(currentDate);
                  d.setHours(23, 59, 59, 999);
                  return d;
                default:
                  return endOfMonth(currentDate);
              }
            })();

            const params: Record<string, any> = {
              timeMin: effectiveTimeMin.toISOString(),
              timeMax: effectiveTimeMax.toISOString(),
              calendarId: get().selectedCalendarId,
              maxResults: 250,
              singleEvents: true,
              orderBy: 'startTime',
            };

            const response = await apiClient.get<{
              events: any[];
            }>('/api/agent/calendar/events', params);

            if (response.success && response.data) {
              const events = (response.data.events || []).map((event: any) => ({
                ...event,
                start: new Date(event.start?.dateTime || event.start?.date || event.start),
                end: new Date(event.end?.dateTime || event.end?.date || event.end),
                created: new Date(event.created),
                updated: new Date(event.updated),
              }));

              set({
                events,
                lastSyncTime: new Date(),
                isLoading: false,
              });
            } else {
              set({ isLoading: false, error: response.error || 'Failed to fetch events' });
            }
          } catch (err) {
            set({
              isLoading: false,
              error: err instanceof Error ? err.message : 'Failed to fetch events',
            });
          }
        },

        fetchEventById: async (eventId: string) => {
          try {
            const response = await apiClient.get<CalendarEvent>(`/api/agent/calendar/events/${eventId}`);
            if (response.success && response.data) {
              const event: CalendarEvent = {
                ...response.data,
                start: new Date(response.data.start),
                end: new Date(response.data.end),
                created: new Date(response.data.created),
                updated: new Date(response.data.updated),
              };

              set(state => ({
                events: state.events.map(e => e.id === eventId ? event : e),
              }));

              return event;
            }
            return null;
          } catch (err) {
            return null;
          }
        },

        fetchCalendars: async () => {
          try {
            const response = await apiClient.get<CalendarListEntry[]>('/api/agent/calendar/calendars');
            if (response.success && response.data) {
              set({ calendars: response.data });
            }
          } catch (err) {
            console.error('Failed to fetch calendars:', err);
          }
        },

        refreshEvents: async () => {
          await get().fetchEvents();
          await get().fetchCalendars();
        },

        syncEvents: async () => {
          set({ isLoading: true });
          
          try {
            const response = await apiClient.post('/api/agent/calendar/sync');
            if (response.success) {
              await get().fetchEvents();
            }
            set({ isLoading: false });
          } catch (err) {
            set({ isLoading: false, error: err instanceof Error ? err.message : 'Failed to sync events' });
          }
        },

        // ============================================
        // Event CRUD Actions
        // ============================================

        createEvent: async (options: CreateEventOptions) => {
          set({ isCreating: true, error: null });

          try {
            const response = await apiClient.post<{ id: string }>('/api/agent/calendar/events', {
              calendarId: options.calendarId || get().selectedCalendarId,
              title: options.title,
              description: options.description,
              location: options.location,
              start: options.start.toISOString(),
              end: options.end.toISOString(),
              timeZone: options.timeZone || get().settings.timeZone,
              attendees: options.attendees,
              isAllDay: options.isAllDay || false,
              recurrence: options.recurrence,
              reminders: options.reminders,
              conferenceData: options.conferenceData ? { createRequest: { requestId: Date.now().toString(), conferenceSolutionKey: { type: 'hangoutsMeet' } } } : undefined,
              color: options.color || getDefaultColor(),
              sendUpdates: options.sendUpdates || 'all',
            });

            if (response.success && response.data) {
              set({ isCreating: false, eventFormOpen: false });
              await get().refreshEvents();
              return { success: true, eventId: response.data.id };
            }

            set({ isCreating: false, error: response.error || 'Failed to create event' });
            return { success: false, error: response.error || 'Failed to create event' };
          } catch (err) {
            set({ isCreating: false, error: err instanceof Error ? err.message : 'Failed to create event' });
            return { success: false, error: err instanceof Error ? err.message : 'Failed to create event' };
          }
        },

        updateEvent: async (options: UpdateEventOptions) => {
          set({ isUpdating: true, error: null });

          try {
            const updates: Record<string, any> = {};
            if (options.title !== undefined) updates.title = options.title;
            if (options.description !== undefined) updates.description = options.description;
            if (options.location !== undefined) updates.location = options.location;
            if (options.start) updates.start = options.start.toISOString();
            if (options.end) updates.end = options.end.toISOString();
            if (options.timeZone) updates.timeZone = options.timeZone;
            if (options.status) updates.status = options.status;
            if (options.color) updates.color = options.color;
            if (options.recurrence !== undefined) updates.recurrence = options.recurrence;
            if (options.sendUpdates) updates.sendUpdates = options.sendUpdates;

            const response = await apiClient.patch(
              `/api/agent/calendar/events/${options.eventId}`,
              updates
            );

            if (response.success) {
              set({ isUpdating: false, eventFormOpen: false });
              await get().refreshEvents();
              return { success: true };
            }

            set({ isUpdating: false, error: response.error || 'Failed to update event' });
            return { success: false, error: response.error || 'Failed to update event' };
          } catch (err) {
            set({ isUpdating: false, error: err instanceof Error ? err.message : 'Failed to update event' });
            return { success: false, error: err instanceof Error ? err.message : 'Failed to update event' };
          }
        },

        deleteEvent: async (eventId: string, sendUpdates?: SendUpdates) => {
          set({ isDeleting: true, error: null });

          try {
            // Build query string for params instead of passing as second argument
            let url = `/api/agent/calendar/events/${eventId}`;
            if (sendUpdates) {
              url += `?sendUpdates=${encodeURIComponent(sendUpdates)}`;
            }

            const response = await apiClient.delete(url);
            
            if (response.success) {
              set(state => ({
                events: state.events.filter(e => e.id !== eventId),
                selectedEventId: state.selectedEventId === eventId ? null : state.selectedEventId,
                isDeleting: false,
              }));
              return { success: true };
            }

            set({ isDeleting: false, error: response.error || 'Failed to delete event' });
            return { success: false, error: response.error || 'Failed to delete event' };
          } catch (err) {
            set({ isDeleting: false, error: err instanceof Error ? err.message : 'Failed to delete event' });
            return { success: false, error: err instanceof Error ? err.message : 'Failed to delete event' };
          }
        },

        deleteRecurringEvent: async (eventId: string, deleteAll: boolean) => {
          try {
            // Use POST for operations that require a body payload
            const response = await apiClient.post(
              `/api/agent/calendar/events/${eventId}/recurring/delete`,
              {
                deleteAll,
              }
            );
            
            if (response.success) {
              await get().refreshEvents();
              return { success: true };
            }
            return { success: false, error: response.error || 'Failed to delete recurring event' };
          } catch (err) {
            return { success: false, error: err instanceof Error ? err.message : 'Failed to delete recurring event' };
          }
        },

        quickAddEvent: async (text: string) => {
          set({ isCreating: true, error: null });

          try {
            const response = await apiClient.post<{ id: string }>('/api/agent/calendar/events/quick-add', {
              text,
              calendarId: get().selectedCalendarId,
            });

            if (response.success && response.data) {
              set({ isCreating: false });
              await get().refreshEvents();
              return { success: true, eventId: response.data.id };
            }

            set({ isCreating: false, error: response.error || 'Failed to add event' });
            return { success: false, error: response.error || 'Failed to add event' };
          } catch (err) {
            set({ isCreating: false, error: err instanceof Error ? err.message : 'Failed to add event' });
            return { success: false, error: err instanceof Error ? err.message : 'Failed to add event' };
          }
        },

        // ============================================
        // Event Management Actions
        // ============================================

        markEventStatus: async (eventId: string, status: EventStatus) => {
          set(state => ({
            events: state.events.map(e =>
              e.id === eventId ? { ...e, status } : e
            ),
          }));

          try {
            await get().updateEvent({ eventId, status });
          } catch (err) {
            await get().fetchEventById(eventId);
          }
        },

        addAttendees: async (eventId: string, attendees: string[]) => {
          try {
            await get().updateEvent({ eventId, addAttendees: attendees });
          } catch (err) {
            console.error('Failed to add attendees:', err);
          }
        },

        removeAttendees: async (eventId: string, attendees: string[]) => {
          try {
            await get().updateEvent({ eventId, removeAttendees: attendees });
          } catch (err) {
            console.error('Failed to remove attendees:', err);
          }
        },

        respondToEvent: async (eventId: string, response: AttendeeResponse, comment?: string) => {
          try {
            await apiClient.post(`/api/agent/calendar/events/${eventId}/respond`, {
              response,
              comment,
            });
            await get().fetchEventById(eventId);
          } catch (err) {
            console.error('Failed to respond to event:', err);
          }
        },

        // ============================================
        // Free/Busy & Scheduling Actions
        // ============================================

        checkFreeBusy: async (timeMin: Date, timeMax: Date, calendars?: string[]) => {
          try {
            const response = await apiClient.post<FreeBusyResponse>('/api/agent/calendar/freebusy', {
              timeMin: timeMin.toISOString(),
              timeMax: timeMax.toISOString(),
              calendars: calendars || [get().selectedCalendarId],
            });

            if (response.success && response.data) {
              return {
                ...response.data,
                timeMin: new Date(response.data.timeMin),
                timeMax: new Date(response.data.timeMax),
                calendars: Object.fromEntries(
                  Object.entries(response.data.calendars).map(([key, value]) => [
                    key,
                    {
                      busy: value.busy.map(b => ({
                        start: new Date(b.start),
                        end: new Date(b.end),
                      })),
                    },
                  ])
                ),
              };
            }
            return null;
          } catch (err) {
            return null;
          }
        },

        findAvailableSlots: async (options: SmartScheduleOptions) => {
          set({ isScheduling: true, error: null, schedulerSuggestions: [] });

          try {
            const response = await apiClient.post<{ suggestions: SuggestedMeetingTime[] }>(
              '/api/agent/calendar/suggest-times',
              {
                title: options.title,
                attendees: options.attendees,
                durationMinutes: options.durationMinutes,
                timeMin: (options.timeMin || new Date()).toISOString(),
                timeMax: (options.timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).toISOString(),
                timeZone: options.timeZone || get().settings.timeZone,
                bufferMinutes: options.bufferMinutes || 15,
                workingHours: options.workingHoursOnly ? get().settings.workingHours : undefined,
              }
            );

            if (response.success && response.data) {
              const suggestions = response.data.suggestions.map((s: any) => ({
                ...s,
                start: new Date(s.start),
                end: new Date(s.end),
              }));

              set({ schedulerSuggestions: suggestions, isScheduling: false });
            } else {
              set({ isScheduling: false, error: response.error || 'Failed to find available slots' });
            }
          } catch (err) {
            set({ isScheduling: false, error: err instanceof Error ? err.message : 'Failed to find available slots' });
          }
        },

        smartSchedule: async (options: SmartScheduleOptions) => {
          set({ isScheduling: true, error: null });

          try {
            const response = await apiClient.post<{ id: string }>('/api/agent/calendar/smart-schedule', {
              title: options.title,
              attendees: options.attendees,
              durationMinutes: options.durationMinutes,
              timeMin: (options.timeMin || new Date()).toISOString(),
              timeMax: (options.timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).toISOString(),
              timeZone: options.timeZone || get().settings.timeZone,
              bufferMinutes: options.bufferMinutes || 15,
              workingHours: options.workingHoursOnly ? get().settings.workingHours : undefined,
              description: options.description,
            });

            if (response.success && response.data) {
              set({ isScheduling: false, schedulerOpen: false });
              await get().refreshEvents();
              return { success: true, eventId: response.data.id };
            }

            set({ isScheduling: false, error: response.error || 'Failed to schedule meeting' });
            return { success: false, error: response.error || 'Failed to schedule meeting' };
          } catch (err) {
            set({ isScheduling: false, error: err instanceof Error ? err.message : 'Failed to schedule meeting' });
            return { success: false, error: err instanceof Error ? err.message : 'Failed to schedule meeting' };
          }
        },

        openScheduler: () => {
          set({
            schedulerOpen: true,
            schedulerTitle: '',
            schedulerDuration: 60,
            schedulerAttendees: [],
            schedulerAttendeeInput: '',
            schedulerWorkingHoursOnly: true,
            schedulerBufferMinutes: 15,
            schedulerSuggestions: [],
            schedulerSelectedSlot: null,
          });
        },

        closeScheduler: () => {
          set({
            schedulerOpen: false,
            schedulerSuggestions: [],
            schedulerSelectedSlot: null,
          });
        },

        updateSchedulerField: (field: string, value: any) => {
          const fieldMap: Record<string, string> = {
            title: 'schedulerTitle',
            duration: 'schedulerDuration',
            bufferMinutes: 'schedulerBufferMinutes',
            workingHoursOnly: 'schedulerWorkingHoursOnly',
          };
          set({ [fieldMap[field] || field]: value } as any);
        },

        addSchedulerAttendee: () => {
          const { schedulerAttendeeInput, schedulerAttendees } = get();
          if (schedulerAttendeeInput && !schedulerAttendees.includes(schedulerAttendeeInput)) {
            set({
              schedulerAttendees: [...schedulerAttendees, schedulerAttendeeInput],
              schedulerAttendeeInput: '',
            });
          }
        },

        removeSchedulerAttendee: (email: string) => {
          set(state => ({
            schedulerAttendees: state.schedulerAttendees.filter(a => a !== email),
          }));
        },

        selectSchedulerSlot: (slot: SuggestedMeetingTime) => {
          set({ schedulerSelectedSlot: slot });
        },

        // ============================================
        // Event Form Actions
        // ============================================

        openNewEventForm: (date?: Date) => {
          const start = date || new Date();
          const end = new Date(start);
          end.setHours(end.getHours() + 1);

          set({
            eventFormOpen: true,
            editingEvent: null,
            eventFormTitle: '',
            eventFormDescription: '',
            eventFormLocation: '',
            eventFormStart: start,
            eventFormEnd: end,
            eventFormTimeZone: get().settings.timeZone,
            eventFormIsAllDay: false,
            eventFormAttendees: [],
            eventFormAttendeeInput: '',
            eventFormRecurrence: null,
            eventFormReminders: { useDefault: true, overrides: [] },
            eventFormConferenceData: false,
            eventFormColor: getDefaultColor(),
            eventFormStatus: 'confirmed',
            eventFormVisibility: 'default',
          });
        },

        openEditEventForm: (event: CalendarEvent) => {
          set({
            eventFormOpen: true,
            editingEvent: event,
            eventFormTitle: event.title,
            eventFormDescription: event.description || '',
            eventFormLocation: event.location || '',
            eventFormStart: new Date(event.start),
            eventFormEnd: new Date(event.end),
            eventFormTimeZone: event.timeZone || get().settings.timeZone,
            eventFormIsAllDay: event.isAllDay,
            eventFormAttendees: event.attendees?.map(a => a.email) || [],
            eventFormAttendeeInput: '',
            eventFormRecurrence: event.recurrence || null,
            eventFormReminders: event.reminders || { useDefault: true, overrides: [] },
            eventFormConferenceData: !!event.conferenceData,
            eventFormColor: event.color || getDefaultColor(),
            eventFormStatus: event.status,
            eventFormVisibility: event.visibility,
          });
        },

        closeEventForm: () => {
          set({
            eventFormOpen: false,
            editingEvent: null,
          });
        },

        updateEventForm: (field: string, value: any) => {
          const fieldMap: Record<string, string> = {
            title: 'eventFormTitle',
            description: 'eventFormDescription',
            location: 'eventFormLocation',
            start: 'eventFormStart',
            end: 'eventFormEnd',
            timeZone: 'eventFormTimeZone',
            isAllDay: 'eventFormIsAllDay',
            recurrence: 'eventFormRecurrence',
            reminders: 'eventFormReminders',
            conferenceData: 'eventFormConferenceData',
            color: 'eventFormColor',
            status: 'eventFormStatus',
            visibility: 'eventFormVisibility',
          };
          set({ [fieldMap[field] || field]: value } as any);
        },

        addEventFormAttendee: () => {
          const { eventFormAttendeeInput, eventFormAttendees } = get();
          if (eventFormAttendeeInput && !eventFormAttendees.includes(eventFormAttendeeInput)) {
            set({
              eventFormAttendees: [...eventFormAttendees, eventFormAttendeeInput],
              eventFormAttendeeInput: '',
            });
          }
        },

        removeEventFormAttendee: (email: string) => {
          set(state => ({
            eventFormAttendees: state.eventFormAttendees.filter(a => a !== email),
          }));
        },

        setEventFormRecurrence: (frequency: RecurrenceFrequency | null) => {
          if (!frequency) {
            set({ eventFormRecurrence: null });
          } else {
            set({
              eventFormRecurrence: {
                frequency,
                interval: 1,
              },
            });
          }
        },

        addEventFormReminder: (method: ReminderMethod, minutes: number) => {
          set(state => ({
            eventFormReminders: {
              ...state.eventFormReminders,
              useDefault: false,
              overrides: [...(state.eventFormReminders.overrides || []), { method, minutes }],
            },
          }));
        },

        removeEventFormReminder: (index: number) => {
          set(state => ({
            eventFormReminders: {
              ...state.eventFormReminders,
              overrides: state.eventFormReminders.overrides?.filter((_, i) => i !== index) || [],
            },
          }));
        },

        // ============================================
        // Navigation Actions
        // ============================================

        goToToday: () => {
          set({ currentDate: new Date() });
          get().fetchEvents();
        },

        goToDate: (date: Date) => {
          set({ currentDate: date });
          get().fetchEvents();
        },

        navigateNext: () => {
          const nextDate = get().getNextDate();
          set({ currentDate: nextDate });
          get().fetchEvents();
        },

        navigatePrevious: () => {
          const prevDate = get().getPreviousDate();
          set({ currentDate: prevDate });
          get().fetchEvents();
        },

        goToMonth: (date: Date) => {
          set({ currentDate: date, viewMode: 'month' });
          get().fetchEvents();
        },

        // ============================================
        // View & Settings Actions
        // ============================================

        setViewMode: (mode: CalendarView) => {
          set({ viewMode: mode });
          get().fetchEvents();
        },

        setActiveView: (view: CalendarViewMode) => {
          set({ activeView: view });
        },

        selectEvent: (eventId: string | null) => {
          set({ selectedEventId: eventId });
        },

        selectCalendar: (calendarId: string) => {
          set({ selectedCalendarId: calendarId });
          get().fetchEvents();
        },

        updateSettings: (updates: Partial<CalendarSettings>) => {
          set(state => ({
            settings: { ...state.settings, ...updates },
          }));
        },

        clearError: () => {
          set({ error: null });
        },

        resetState: () => {
          set({
            ...initialState,
            currentDate: new Date(),
          });
        },
      }),
      {
        name: 'calendar-agent-store',
        partialize: (state) => ({
          viewMode: state.viewMode,
          activeView: state.activeView,
          selectedCalendarId: state.selectedCalendarId,
          settings: state.settings,
        }),
      }
    )
  )
);

// ============================================
// Selector Hooks
// ============================================

export const useCalendarEvents = () => useCalendarStore(state => ({
  events: state.events,
  selectedEventId: state.selectedEventId,
  isLoading: state.isLoading,
  error: state.error,
  currentDate: state.currentDate,
  viewMode: state.viewMode,
  activeView: state.activeView,
  lastSyncTime: state.lastSyncTime,
  fetchEvents: state.fetchEvents,
  refreshEvents: state.refreshEvents,
  syncEvents: state.syncEvents,
  selectEvent: state.selectEvent,
  getSelectedEvent: state.getSelectedEvent,
  getEventsForDate: state.getEventsForDate,
  getUpcomingEvents: state.getUpcomingEvents,
  getTodayEvents: state.getTodayEvents,
  getDayEvents: state.getDayEvents,
  getWeekEvents: state.getWeekEvents,
  getMonthEvents: state.getMonthEvents,
  getDaysInView: state.getDaysInView,
  getViewTitle: state.getViewTitle,
}));

export const useCalendarNavigation = () => useCalendarStore(state => ({
  currentDate: state.currentDate,
  viewMode: state.viewMode,
  goToToday: state.goToToday,
  goToDate: state.goToDate,
  navigateNext: state.navigateNext,
  navigatePrevious: state.navigatePrevious,
  goToMonth: state.goToMonth,
  setViewMode: state.setViewMode,
  getViewTitle: state.getViewTitle,
  getNextDate: state.getNextDate,
  getPreviousDate: state.getPreviousDate,
}));

export const useCalendarEventForm = () => useCalendarStore(state => ({
  eventFormOpen: state.eventFormOpen,
  editingEvent: state.editingEvent,
  eventFormTitle: state.eventFormTitle,
  eventFormDescription: state.eventFormDescription,
  eventFormLocation: state.eventFormLocation,
  eventFormStart: state.eventFormStart,
  eventFormEnd: state.eventFormEnd,
  eventFormTimeZone: state.eventFormTimeZone,
  eventFormIsAllDay: state.eventFormIsAllDay,
  eventFormAttendees: state.eventFormAttendees,
  eventFormAttendeeInput: state.eventFormAttendeeInput,
  eventFormRecurrence: state.eventFormRecurrence,
  eventFormReminders: state.eventFormReminders,
  eventFormConferenceData: state.eventFormConferenceData,
  eventFormColor: state.eventFormColor,
  eventFormStatus: state.eventFormStatus,
  eventFormVisibility: state.eventFormVisibility,
  isCreating: state.isCreating,
  isUpdating: state.isUpdating,
  openNewEventForm: state.openNewEventForm,
  openEditEventForm: state.openEditEventForm,
  closeEventForm: state.closeEventForm,
  updateEventForm: state.updateEventForm,
  addEventFormAttendee: state.addEventFormAttendee,
  removeEventFormAttendee: state.removeEventFormAttendee,
  setEventFormRecurrence: state.setEventFormRecurrence,
  addEventFormReminder: state.addEventFormReminder,
  removeEventFormReminder: state.removeEventFormReminder,
  createEvent: state.createEvent,
  updateEvent: state.updateEvent,
  deleteEvent: state.deleteEvent,
}));

export const useCalendarScheduler = () => useCalendarStore(state => ({
  schedulerOpen: state.schedulerOpen,
  schedulerTitle: state.schedulerTitle,
  schedulerDuration: state.schedulerDuration,
  schedulerAttendees: state.schedulerAttendees,
  schedulerAttendeeInput: state.schedulerAttendeeInput,
  schedulerWorkingHoursOnly: state.schedulerWorkingHoursOnly,
  schedulerBufferMinutes: state.schedulerBufferMinutes,
  schedulerSuggestions: state.schedulerSuggestions,
  schedulerSelectedSlot: state.schedulerSelectedSlot,
  isScheduling: state.isScheduling,
  openScheduler: state.openScheduler,
  closeScheduler: state.closeScheduler,
  updateSchedulerField: state.updateSchedulerField,
  addSchedulerAttendee: state.addSchedulerAttendee,
  removeSchedulerAttendee: state.removeSchedulerAttendee,
  selectSchedulerSlot: state.selectSchedulerSlot,
  findAvailableSlots: state.findAvailableSlots,
  smartSchedule: state.smartSchedule,
}));

export const useCalendarSettings = () => useCalendarStore(state => ({
  calendars: state.calendars,
  selectedCalendarId: state.selectedCalendarId,
  settings: state.settings,
  selectCalendar: state.selectCalendar,
  updateSettings: state.updateSettings,
  fetchCalendars: state.fetchCalendars,
}));

export const useCalendarManagement = () => useCalendarStore(state => ({
  isDeleting: state.isDeleting,
  createEvent: state.createEvent,
  updateEvent: state.updateEvent,
  deleteEvent: state.deleteEvent,
  deleteRecurringEvent: state.deleteRecurringEvent,
  quickAddEvent: state.quickAddEvent,
  markEventStatus: state.markEventStatus,
  addAttendees: state.addAttendees,
  removeAttendees: state.removeAttendees,
  respondToEvent: state.respondToEvent,
  checkFreeBusy: state.checkFreeBusy,
}));
