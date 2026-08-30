// apps/frontend/src/services/calendar.service.ts
import { apiClient } from '../api/client';

// ============================================
// Types
// ============================================

export interface CalendarEvent {
  id: string;
  calendarId: string;
  title: string;
  description?: string;
  location?: string;
  start: EventTime;
  end: EventTime;
  attendees?: EventAttendee[];
  organizer?: EventAttendee;
  status: EventStatus;
  visibility: EventVisibility;
  recurrence?: string[];
  recurringEventId?: string;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
  conferenceData?: ConferenceData;
  attachments?: EventAttachment[];
  colorId?: string;
  eventType?: 'default' | 'outOfOffice' | 'focusTime' | 'workingLocation';
  transparency?: 'opaque' | 'transparent';
  created: Date;
  updated: Date;
  htmlLink?: string;
  iCalUID?: string;
  sequence?: number;
  privateCopy?: boolean;
  locked?: boolean;
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
  source?: {
    url?: string;
    title?: string;
  };
  workingLocationProperties?: {
    type: 'homeOffice' | 'officeLocation' | 'customLocation';
    homeOffice?: any;
    customLocation?: { label: string };
    officeLocation?: { buildingId: string; floorId?: string; deskId?: string };
  };
}

export interface EventTime {
  dateTime?: Date;
  date?: string;
  timeZone?: string;
}

export interface EventAttendee {
  email: string;
  displayName?: string;
  responseStatus: 'needsAction' | 'declined' | 'tentative' | 'accepted';
  comment?: string;
  optional?: boolean;
  additionalGuests?: number;
  self?: boolean;
  organizer?: boolean;
  resource?: boolean;
}

export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';
export type EventVisibility = 'default' | 'public' | 'private' | 'confidential';

export interface ConferenceData {
  createRequest?: {
    requestId: string;
    conferenceSolutionKey: { type: string };
    status: { statusCode: string };
  };
  entryPoints?: ConferenceEntryPoint[];
  conferenceSolution?: {
    key: { type: string };
    name: string;
    iconUri: string;
  };
  conferenceId?: string;
  signature?: string;
  notes?: string;
}

export interface ConferenceEntryPoint {
  entryPointType: 'video' | 'phone' | 'sip' | 'more';
  uri: string;
  label?: string;
  pin?: string;
  accessCode?: string;
  meetingCode?: string;
  passcode?: string;
  password?: string;
  regionCode?: string;
}

export interface EventAttachment {
  fileUrl: string;
  title: string;
  mimeType?: string;
  iconLink?: string;
  fileId?: string;
  size?: number;
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
  accessRole: 'freeBusyReader' | 'reader' | 'writer' | 'owner';
  primary?: boolean;
  deleted?: boolean;
  defaultReminders?: Array<{ method: string; minutes: number }>;
  notificationSettings?: {
    notifications: Array<{ type: string; method: string }>;
  };
  conferenceProperties?: {
    allowedConferenceSolutionTypes?: string[];
  };
}

export interface CreateEventOptions {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  timeZone?: string;
  attendees?: string[];
  attendeeEmails?: string[];
  isAllDay?: boolean;
  recurrence?: string[];
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
  conferenceData?: boolean;
  conferenceSolution?: 'hangoutsMeet' | 'zoom' | 'teams';
  visibility?: EventVisibility;
  colorId?: string;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
  calendarId?: string;
  guestsCanInviteOthers?: boolean;
  guestsCanModify?: boolean;
  guestsCanSeeOtherGuests?: boolean;
  attachments?: Array<{ fileUrl: string; title: string; mimeType?: string }>;
  eventType?: 'default' | 'outOfOffice' | 'focusTime';
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
  visibility?: EventVisibility;
  recurrence?: string[] | null;
  reminders?: {
    useDefault?: boolean;
    overrides?: Array<{ method: 'email' | 'popup'; minutes: number }>;
  } | null;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}

export interface ListEventsOptions {
  calendarId?: string;
  timeMin?: Date;
  timeMax?: Date;
  maxResults?: number;
  pageToken?: string;
  showDeleted?: boolean;
  showHiddenInvitations?: boolean;
  singleEvents?: boolean;
  orderBy?: 'startTime' | 'updated';
  q?: string;
  iCalUID?: string;
  privateExtendedProperty?: string;
  sharedExtendedProperty?: string;
  timeZone?: string;
  updatedMin?: Date;
  eventTypes?: string[];
}

export interface FreeBusyRequest {
  timeMin: Date;
  timeMax: Date;
  calendars?: string[];
  items?: Array<{ id: string }>;
  timeZone?: string;
  groupExpansionMax?: number;
  calendarExpansionMax?: number;
}

export interface FreeBusySlot {
  start: Date;
  end: Date;
}

export interface FreeBusyResponse {
  calendars: Record<string, { busy: FreeBusySlot[]; errors?: Array<{ domain: string; reason: string }> }>;
  timeMin: Date;
  timeMax: Date;
  groups?: Record<string, { calendars: string[]; errors?: Array<{ domain: string; reason: string }> }>;
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
  avoidConflicts?: boolean;
  prioritySlots?: Array<{ start: Date; end: Date }>;
  minimumAttendees?: number;
}

export interface SuggestedMeetingTime {
  start: Date;
  end: Date;
  attendees: string[];
  confidence: number;
  conflicts?: Array<{ email: string; reason: string }>;
  score?: number;
}

export interface CalendarSettings {
  timeZone: string;
  dateFormat: string;
  timeFormat: '12' | '24';
  weekStart: 'sunday' | 'monday';
  defaultCalendarId: string;
  workingHours: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
  notificationSettings: {
    newEvents: boolean;
    changedEvents: boolean;
    cancelledEvents: boolean;
    responses: boolean;
    dailyAgenda: boolean;
    reminders: Array<{ method: 'email' | 'popup'; minutes: number }>;
  };
  conferenceDefaults: {
    autoGenerate: boolean;
    preferredSolution?: string;
  };
}

export interface CalendarQuickAddOptions {
  text: string;
  calendarId?: string;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  until?: Date;
  count?: number;
  byDay?: string[];
  byMonthDay?: number[];
  byMonth?: number[];
  byYearDay?: number[];
  byWeekNo?: number[];
  byHour?: number[];
  byMinute?: number[];
  bySecond?: number[];
  weekStart?: string;
}

// ============================================
// Calendar Service
// ============================================

class CalendarService {
  // ============================================
  // Calendar Management
  // ============================================

  static async listCalendars(): Promise<CalendarListEntry[]> {
    const response = await apiClient.get<{ items: CalendarListEntry[] }>(
      '/api/agent/calendar/calendars'
    );

    if (response.success && response.data) {
      return response.data.items || [];
    }

    throw new Error(response.error || 'Failed to list calendars');
  }

  static async getCalendar(calendarId: string): Promise<CalendarListEntry> {
    const response = await apiClient.get<CalendarListEntry>(
      `/api/agent/calendar/calendars/${calendarId}`
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get calendar');
  }

  static async createCalendar(
    summary: string,
    options?: {
      description?: string;
      location?: string;
      timeZone?: string;
      backgroundColor?: string;
      foregroundColor?: string;
    }
  ): Promise<CalendarListEntry> {
    const response = await apiClient.post<CalendarListEntry>(
      '/api/agent/calendar/calendars',
      { summary, ...options }
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to create calendar');
  }

  static async updateCalendar(
    calendarId: string,
    updates: Partial<Pick<CalendarListEntry, 'summary' | 'description' | 'location' | 'timeZone' | 'backgroundColor' | 'foregroundColor' | 'selected' | 'hidden'>>
  ): Promise<CalendarListEntry> {
    const response = await apiClient.patch<CalendarListEntry>(
      `/api/agent/calendar/calendars/${calendarId}`,
      updates
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to update calendar');
  }

  static async deleteCalendar(calendarId: string): Promise<void> {
    const response = await apiClient.delete(`/api/agent/calendar/calendars/${calendarId}`);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete calendar');
    }
  }

  // ============================================
  // Events
  // ============================================

  static async listEvents(options: ListEventsOptions = {}): Promise<{
    events: CalendarEvent[];
    nextPageToken?: string;
    nextSyncToken?: string;
    summary?: string;
    updated?: Date;
    timeZone?: string;
  }> {
    const params: Record<string, any> = {
      calendarId: options.calendarId || 'primary',
      timeMin: options.timeMin?.toISOString(),
      timeMax: options.timeMax?.toISOString(),
      maxResults: options.maxResults || 250,
      pageToken: options.pageToken,
      showDeleted: options.showDeleted || false,
      showHiddenInvitations: options.showHiddenInvitations || false,
      singleEvents: options.singleEvents !== false,
      orderBy: options.orderBy || 'startTime',
      q: options.q,
      iCalUID: options.iCalUID,
      timeZone: options.timeZone,
      updatedMin: options.updatedMin?.toISOString(),
    };

    const response = await apiClient.get<{
      events: any[];
      nextPageToken?: string;
      nextSyncToken?: string;
      summary?: string;
      updated?: string;
      timeZone?: string;
    }>('/api/agent/calendar/events', { params });

    if (response.success && response.data) {
      return {
        events: (response.data.events || []).map(CalendarService.transformEvent),
        nextPageToken: response.data.nextPageToken,
        nextSyncToken: response.data.nextSyncToken,
        summary: response.data.summary,
        updated: response.data.updated ? new Date(response.data.updated) : undefined,
        timeZone: response.data.timeZone,
      };
    }

    throw new Error(response.error || 'Failed to list events');
  }

  static async getEvent(
    eventId: string,
    calendarId: string = 'primary'
  ): Promise<CalendarEvent> {
    const response = await apiClient.get<any>(
      `/api/agent/calendar/events/${eventId}`,
      { params: { calendarId } }
    );

    if (response.success && response.data) {
      return CalendarService.transformEvent(response.data);
    }

    throw new Error(response.error || 'Failed to get event');
  }

  static async createEvent(options: CreateEventOptions): Promise<CalendarEvent> {
    const payload: Record<string, any> = {
      title: options.title,
      description: options.description,
      location: options.location,
      attendees: options.attendees?.map(email => ({ email })) || options.attendeeEmails?.map(email => ({ email })),
      visibility: options.visibility,
      colorId: options.colorId,
      calendarId: options.calendarId || 'primary',
      sendUpdates: options.sendUpdates || 'all',
      guestsCanInviteOthers: options.guestsCanInviteOthers,
      guestsCanModify: options.guestsCanModify,
      guestsCanSeeOtherGuests: options.guestsCanSeeOtherGuests,
      eventType: options.eventType || 'default',
    };

    // Handle start/end times
    if (options.isAllDay) {
      payload.start = {
        date: options.start.toISOString().split('T')[0],
        timeZone: options.timeZone || 'UTC',
      };
      payload.end = {
        date: options.end.toISOString().split('T')[0],
        timeZone: options.timeZone || 'UTC',
      };
    } else {
      payload.start = {
        dateTime: options.start.toISOString(),
        timeZone: options.timeZone || 'UTC',
      };
      payload.end = {
        dateTime: options.end.toISOString(),
        timeZone: options.timeZone || 'UTC',
      };
    }

    // Recurrence
    if (options.recurrence && options.recurrence.length > 0) {
      payload.recurrence = options.recurrence;
    }

    // Reminders
    if (options.reminders) {
      payload.reminders = options.reminders;
    }

    // Conference data
    if (options.conferenceData) {
      payload.conferenceData = {
        createRequest: {
          requestId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          conferenceSolutionKey: {
            type: options.conferenceSolution || 'hangoutsMeet',
          },
        },
      };
    }

    // Attachments
    if (options.attachments && options.attachments.length > 0) {
      payload.attachments = options.attachments;
    }

    const response = await apiClient.post<any>('/api/agent/calendar/events', payload);

    if (response.success && response.data) {
      return CalendarService.transformEvent(response.data);
    }

    throw new Error(response.error || 'Failed to create event');
  }

  static async updateEvent(options: UpdateEventOptions): Promise<CalendarEvent> {
    const payload: Record<string, any> = {
      calendarId: options.calendarId || 'primary',
      sendUpdates: options.sendUpdates || 'all',
    };

    if (options.title !== undefined) payload.title = options.title;
    if (options.description !== undefined) payload.description = options.description;
    if (options.location !== undefined) payload.location = options.location;
    if (options.status !== undefined) payload.status = options.status;
    if (options.visibility !== undefined) payload.visibility = options.visibility;
    if (options.recurrence !== undefined) payload.recurrence = options.recurrence;
    if (options.reminders !== undefined) payload.reminders = options.reminders;

    if (options.start) {
      payload.start = {
        dateTime: options.start.toISOString(),
        timeZone: options.timeZone,
      };
    }
    if (options.end) {
      payload.end = {
        dateTime: options.end.toISOString(),
        timeZone: options.timeZone,
      };
    }

    // Handle attendee changes
    if (options.addAttendees && options.addAttendees.length > 0) {
      payload.addAttendees = options.addAttendees.map(email => ({ email }));
    }
    if (options.removeAttendees && options.removeAttendees.length > 0) {
      payload.removeAttendees = options.removeAttendees.map(email => ({ email }));
    }

    const response = await apiClient.put<any>(
      `/api/agent/calendar/events/${options.eventId}`,
      payload
    );

    if (response.success && response.data) {
      return CalendarService.transformEvent(response.data);
    }

    throw new Error(response.error || 'Failed to update event');
  }

  static async patchEvent(
    eventId: string,
    updates: Partial<CalendarEvent>,
    options?: {
      calendarId?: string;
      sendUpdates?: 'all' | 'externalOnly' | 'none';
    }
  ): Promise<CalendarEvent> {
    const response = await apiClient.patch<any>(
      `/api/agent/calendar/events/${eventId}`,
      { ...updates, ...options }
    );

    if (response.success && response.data) {
      return CalendarService.transformEvent(response.data);
    }

    throw new Error(response.error || 'Failed to patch event');
  }

  static async deleteEvent(
    eventId: string,
    options?: {
      calendarId?: string;
      sendUpdates?: 'all' | 'externalOnly' | 'none';
    }
  ): Promise<void> {
    // Build query string from options since apiClient.delete only accepts 1 argument
    const queryParams: string[] = [];
    if (options?.calendarId) {
      queryParams.push(`calendarId=${encodeURIComponent(options.calendarId)}`);
    }
    if (options?.sendUpdates) {
      queryParams.push(`sendUpdates=${encodeURIComponent(options.sendUpdates)}`);
    }

    const url = `/api/agent/calendar/events/${eventId}${queryParams.length > 0 ? '?' + queryParams.join('&') : ''}`;

    const response = await apiClient.delete(url);

    if (!response.success) {
      throw new Error(response.error || 'Failed to delete event');
    }
  }

  static async moveEvent(
    eventId: string,
    destinationCalendarId: string,
    options?: {
      sendUpdates?: 'all' | 'externalOnly' | 'none';
    }
  ): Promise<CalendarEvent> {
    const response = await apiClient.post<any>(
      `/api/agent/calendar/events/${eventId}/move`,
      { destination: destinationCalendarId, ...options }
    );

    if (response.success && response.data) {
      return CalendarService.transformEvent(response.data);
    }

    throw new Error(response.error || 'Failed to move event');
  }

  // ============================================
  // Quick Add
  // ============================================

  static async quickAddEvent(options: CalendarQuickAddOptions): Promise<CalendarEvent> {
    const response = await apiClient.post<any>(
      '/api/agent/calendar/events/quick-add',
      options
    );

    if (response.success && response.data) {
      return CalendarService.transformEvent(response.data);
    }

    throw new Error(response.error || 'Failed to quick add event');
  }

  // ============================================
  // Instances (Recurring Events)
  // ============================================

  static async getEventInstances(
    eventId: string,
    options?: {
      calendarId?: string;
      timeMin?: Date;
      timeMax?: Date;
      maxResults?: number;
    }
  ): Promise<CalendarEvent[]> {
    const params: Record<string, any> = {
      calendarId: options?.calendarId || 'primary',
      timeMin: options?.timeMin?.toISOString(),
      timeMax: options?.timeMax?.toISOString(),
      maxResults: options?.maxResults || 250,
    };

    const response = await apiClient.get<{ events: any[] }>(
      `/api/agent/calendar/events/${eventId}/instances`,
      { params }
    );

    if (response.success && response.data) {
      return (response.data.events || []).map(CalendarService.transformEvent);
    }

    throw new Error(response.error || 'Failed to get instances');
  }

  // ============================================
  // Free/Busy
  // ============================================

  static async getFreeBusy(request: FreeBusyRequest): Promise<FreeBusyResponse> {
    const response = await apiClient.post<FreeBusyResponse>(
      '/api/agent/calendar/freebusy',
      {
        timeMin: request.timeMin.toISOString(),
        timeMax: request.timeMax.toISOString(),
        items: request.items || request.calendars?.map(id => ({ id })) || [{ id: 'primary' }],
        timeZone: request.timeZone,
        groupExpansionMax: request.groupExpansionMax,
        calendarExpansionMax: request.calendarExpansionMax,
      }
    );

    if (response.success && response.data) {
      return {
        ...response.data,
        timeMin: new Date(response.data.timeMin),
        timeMax: new Date(response.data.timeMax),
        calendars: Object.entries(response.data.calendars).reduce((acc, [key, value]) => ({
          ...acc,
          [key]: {
            busy: value.busy.map(b => ({
              start: new Date(b.start),
              end: new Date(b.end),
            })),
            errors: value.errors,
          },
        }), {}),
      };
    }

    throw new Error(response.error || 'Failed to get free/busy');
  }

  // ============================================
  // Smart Scheduling
  // ============================================

  static async findMeetingTimes(options: SmartScheduleOptions): Promise<SuggestedMeetingTime[]> {
    const response = await apiClient.post<{ suggestions: SuggestedMeetingTime[] }>(
      '/api/agent/calendar/smart-schedule',
      {
        ...options,
        timeMin: options.timeMin?.toISOString(),
        timeMax: options.timeMax?.toISOString(),
      }
    );

    if (response.success && response.data) {
      return response.data.suggestions.map(s => ({
        ...s,
        start: new Date(s.start),
        end: new Date(s.end),
      }));
    }

    throw new Error(response.error || 'Failed to find meeting times');
  }

  static async scheduleWithAI(
    options: SmartScheduleOptions
  ): Promise<{ event: CalendarEvent; suggestions: SuggestedMeetingTime[] }> {
    const response = await apiClient.post<{
      event: CalendarEvent;
      suggestions: SuggestedMeetingTime[];
    }>('/api/agent/calendar/smart-schedule/auto', {
      ...options,
      timeMin: options.timeMin?.toISOString(),
      timeMax: options.timeMax?.toISOString(),
    });

    if (response.success && response.data) {
      return {
        event: CalendarService.transformEvent(response.data.event),
        suggestions: response.data.suggestions.map(s => ({
          ...s,
          start: new Date(s.start),
          end: new Date(s.end),
        })),
      };
    }

    throw new Error(response.error || 'Failed to auto-schedule');
  }

  // ============================================
  // Settings
  // ============================================

  static async getSettings(): Promise<CalendarSettings> {
    const response = await apiClient.get<CalendarSettings>(
      '/api/agent/calendar/settings'
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get settings');
  }

  static async updateSettings(settings: Partial<CalendarSettings>): Promise<CalendarSettings> {
    const response = await apiClient.patch<CalendarSettings>(
      '/api/agent/calendar/settings',
      settings
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to update settings');
  }

  // ============================================
  // Notifications
  // ============================================

  static async getNotificationSettings(): Promise<{
    notifications: Array<{ id: string; type: string; method: string; label: string }>;
  }> {
    const response = await apiClient.get<{
      notifications: Array<{ id: string; type: string; method: string; label: string }>;
    }>('/api/agent/calendar/notifications');

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(response.error || 'Failed to get notification settings');
  }

  // ============================================
  // Watch
  // ============================================

  static async watchEvents(
    calendarId: string,
    webhookUrl: string,
    options?: {
      ttl?: number;
      token?: string;
    }
  ): Promise<{
    id: string;
    resourceId: string;
    resourceUri: string;
    expiration: Date;
  }> {
    const response = await apiClient.post<{
      id: string;
      resourceId: string;
      resourceUri: string;
      expiration: string;
    }>('/api/agent/calendar/watch', {
      calendarId,
      webhookUrl,
      ttl: options?.ttl || 3600,
      token: options?.token,
    });

    if (response.success && response.data) {
      return {
        ...response.data,
        expiration: new Date(response.data.expiration),
      };
    }

    throw new Error(response.error || 'Failed to setup watch');
  }

  static async stopWatch(channelId: string, resourceId: string): Promise<void> {
    const response = await apiClient.post('/api/agent/calendar/watch/stop', {
      channelId,
      resourceId,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to stop watch');
    }
  }

  // ============================================
  // Import
  // ============================================

  static async importEvent(
    calendarId: string,
    event: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    const response = await apiClient.post<any>(
      `/api/agent/calendar/events/import`,
      { calendarId, event }
    );

    if (response.success && response.data) {
      return CalendarService.transformEvent(response.data);
    }

    throw new Error(response.error || 'Failed to import event');
  }

  static async importICS(
    icsContent: string,
    calendarId?: string
  ): Promise<{ imported: number; events: CalendarEvent[] }> {
    const response = await apiClient.post<{ imported: number; events: CalendarEvent[] }>(
      '/api/agent/calendar/import/ics',
      { icsContent, calendarId }
    );

    if (response.success && response.data) {
      return {
        imported: response.data.imported,
        events: response.data.events.map(CalendarService.transformEvent),
      };
    }

    throw new Error(response.error || 'Failed to import ICS');
  }

  // ============================================
  // Export
  // ============================================

  static async exportEvent(eventId: string): Promise<string> {
    const response = await apiClient.get<{ ics: string }>(
      `/api/agent/calendar/events/${eventId}/export`
    );

    if (response.success && response.data) {
      return response.data.ics;
    }

    throw new Error(response.error || 'Failed to export event');
  }

  static async exportCalendar(
    calendarId: string = 'primary',
    options?: { timeMin?: Date; timeMax?: Date }
  ): Promise<string> {
    const response = await apiClient.get<{ ics: string }>(
      `/api/agent/calendar/calendars/${calendarId}/export`,
      {
        params: {
          timeMin: options?.timeMin?.toISOString(),
          timeMax: options?.timeMax?.toISOString(),
        },
      }
    );

    if (response.success && response.data) {
      return response.data.ics;
    }

    throw new Error(response.error || 'Failed to export calendar');
  }

  // ============================================
  // Batch Operations
  // ============================================

  static async batchCreateEvents(events: CreateEventOptions[]): Promise<CalendarEvent[]> {
    const response = await apiClient.post<{ events: CalendarEvent[] }>(
      '/api/agent/calendar/events/batch/create',
      { events }
    );

    if (response.success && response.data) {
      return response.data.events.map(CalendarService.transformEvent);
    }

    throw new Error(response.error || 'Failed to batch create events');
  }

  static async batchDeleteEvents(eventIds: string[]): Promise<void> {
    const response = await apiClient.post(
      '/api/agent/calendar/events/batch/delete',
      { eventIds }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to batch delete events');
    }
  }

  // ============================================
  // Connection
  // ============================================

  static async isConnected(): Promise<boolean> {
    try {
      const response = await apiClient.get<{ connected: boolean }>('/api/agent/calendar/status');
      return response.data?.connected || false;
    } catch {
      return false;
    }
  }

  static async disconnect(): Promise<void> {
    const response = await apiClient.delete('/api/agent/calendar/disconnect');
    if (!response.success) {
      throw new Error(response.error || 'Failed to disconnect');
    }
  }

  // ============================================
  // Transform Helpers
  // ============================================

  private static transformEvent(event: any): CalendarEvent {
    return {
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
        comment: a.comment,
        optional: a.optional,
        additionalGuests: a.additionalGuests,
        self: a.self,
        organizer: a.organizer,
        resource: a.resource,
      })),
      organizer: event.organizer ? {
        email: event.organizer.email,
        displayName: event.organizer.displayName,
        responseStatus: 'accepted',
      } : undefined,
      status: event.status || 'confirmed',
      visibility: event.visibility || 'default',
      recurrence: event.recurrence,
      recurringEventId: event.recurringEventId,
      reminders: event.reminders || { useDefault: true },
      conferenceData: event.conferenceData,
      attachments: event.attachments,
      colorId: event.colorId,
      eventType: event.eventType || 'default',
      transparency: event.transparency,
      created: new Date(event.created || Date.now()),
      updated: new Date(event.updated || Date.now()),
      htmlLink: event.htmlLink,
      iCalUID: event.iCalUID,
      sequence: event.sequence || 0,
      privateCopy: event.privateCopy,
      locked: event.locked,
      extendedProperties: event.extendedProperties,
      source: event.source,
      workingLocationProperties: event.workingLocationProperties,
    };
  }

  // ============================================
  // Utility
  // ============================================

  static parseRecurrenceRule(rrule: string): RecurrenceRule | null {
    try {
      const parts = rrule.split(';');
      const rule: Record<string, any> = {};

      for (const part of parts) {
        const [key, value] = part.split('=');
        switch (key) {
          case 'FREQ':
            rule.frequency = value.toLowerCase();
            break;
          case 'INTERVAL':
            rule.interval = parseInt(value, 10);
            break;
          case 'UNTIL':
            rule.until = new Date(
              parseInt(value.slice(0, 4)),
              parseInt(value.slice(4, 6)) - 1,
              parseInt(value.slice(6, 8)),
              parseInt(value.slice(9, 11)) || 0,
              parseInt(value.slice(11, 13)) || 0,
              parseInt(value.slice(13, 15)) || 0
            );
            break;
          case 'COUNT':
            rule.count = parseInt(value, 10);
            break;
          case 'BYDAY':
            rule.byDay = value.split(',');
            break;
          case 'BYMONTHDAY':
            rule.byMonthDay = value.split(',').map(Number);
            break;
          case 'BYMONTH':
            rule.byMonth = value.split(',').map(Number);
            break;
        }
      }

      return rule as RecurrenceRule;
    } catch {
      return null;
    }
  }

  static formatRecurrenceRule(rule: RecurrenceRule): string {
    const parts: string[] = [`RRULE:FREQ=${rule.frequency.toUpperCase()}`];

    if (rule.interval && rule.interval !== 1) parts.push(`INTERVAL=${rule.interval}`);
    if (rule.until) {
      const y = rule.until.getFullYear();
      const m = String(rule.until.getMonth() + 1).padStart(2, '0');
      const d = String(rule.until.getDate()).padStart(2, '0');
      parts.push(`UNTIL=${y}${m}${d}T000000Z`);
    }
    if (rule.count) parts.push(`COUNT=${rule.count}`);
    if (rule.byDay) parts.push(`BYDAY=${rule.byDay.join(',')}`);
    if (rule.byMonthDay) parts.push(`BYMONTHDAY=${rule.byMonthDay.join(',')}`);
    if (rule.byMonth) parts.push(`BYMONTH=${rule.byMonth.join(',')}`);

    return parts.join(';');
  }

  static getRecurrenceDescription(rule: RecurrenceRule): string {
    const freqMap: Record<string, string> = {
      daily: 'day',
      weekly: 'week',
      monthly: 'month',
      yearly: 'year',
    };

    const freq = freqMap[rule.frequency] || rule.frequency;
    const interval = rule.interval && rule.interval > 1 ? ` every ${rule.interval} ${freq}s` : ` every ${freq}`;

    let description = `Repeats${interval}`;

    if (rule.byDay && rule.byDay.length > 0) {
      const days = rule.byDay.map(d => {
        const dayMap: Record<string, string> = {
          MO: 'Monday', TU: 'Tuesday', WE: 'Wednesday',
          TH: 'Thursday', FR: 'Friday', SA: 'Saturday', SU: 'Sunday',
        };
        return dayMap[d] || d;
      });
      description += ` on ${days.join(', ')}`;
    }

    if (rule.until) {
      description += ` until ${rule.until.toLocaleDateString()}`;
    } else if (rule.count) {
      description += ` for ${rule.count} occurrences`;
    }

    return description;
  }

  static formatEventDuration(event: CalendarEvent): string {
    const start = event.start.dateTime || (event.start.date ? new Date(event.start.date + 'T00:00:00') : null);
    const end = event.end.dateTime || (event.end.date ? new Date(event.end.date + 'T00:00:00') : null);

    if (!start || !end) return 'Unknown duration';

    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / 60000);
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours === 0) return `${minutes}m`;
    if (remainingMinutes === 0) return `${hours}h`;
    return `${hours}h ${remainingMinutes}m`;
  }

  static isEventAllDay(event: CalendarEvent): boolean {
    return !!(event.start.date && event.end.date);
  }

  static isEventNow(event: CalendarEvent): boolean {
    const now = new Date();
    const start = event.start.dateTime || (event.start.date ? new Date(event.start.date + 'T00:00:00') : null);
    const end = event.end.dateTime || (event.end.date ? new Date(event.end.date + 'T23:59:59') : null);

    if (!start || !end) return false;
    return now >= start && now <= end;
  }

  static isEventUpcoming(event: CalendarEvent): boolean {
    const now = new Date();
    const start = event.start.dateTime || (event.start.date ? new Date(event.start.date + 'T00:00:00') : null);
    return !!start && start > now;
  }

  static isEventPast(event: CalendarEvent): boolean {
    const now = new Date();
    const end = event.end.dateTime || (event.end.date ? new Date(event.end.date + 'T23:59:59') : null);
    return !!end && end < now;
  }

  static getEventColor(event: CalendarEvent): string {
    const colorMap: Record<string, string> = {
      '1': '#a4bdfc',  // Lavender
      '2': '#7ae7bf',  // Sage
      '3': '#dbadff',  // Grape
      '4': '#ff887c',  // Flamingo
      '5': '#fbd75b',  // Banana
      '6': '#ffb878',  // Tangerine
      '7': '#46d6db',  // Peacock
      '8': '#e1e1e1',  // Graphite
      '9': '#5484ed',  // Blueberry
      '10': '#51b749', // Basil
      '11': '#dc2127', // Tomato
    };
    return event.colorId ? colorMap[event.colorId] || '#a4bdfc' : '#a4bdfc';
  }

  static getAttendeeResponseColor(status: string): string {
    const colors: Record<string, string> = {
      accepted: 'text-green-600',
      tentative: 'text-yellow-600',
      declined: 'text-red-600',
      needsAction: 'text-secondary-500',
    };
    return colors[status] || 'text-secondary-500';
  }

  static getAttendeeResponseIcon(status: string): string {
    const icons: Record<string, string> = {
      accepted: '✅',
      tentative: '❓',
      declined: '❌',
      needsAction: '⏳',
    };
    return icons[status] || '⏳';
  }
}

export default CalendarService;
