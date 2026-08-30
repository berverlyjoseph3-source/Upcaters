// enterprise-ai-agent-platform/apps/api/src/agents/calendar/calendar.types.ts

/**
 * Calendar Event Interface
 */
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
  recurrence?: RecurrenceRule;
  reminders?: ReminderSettings;
  attachments?: EventAttachment[];
  conferenceData?: ConferenceData;
  created: Date;
  updated: Date;
  htmlLink?: string;
  iCalUID?: string;
  sequence?: number;
}

/**
 * Event Time Interface
 */
export interface EventTime {
  dateTime?: Date;
  date?: string; // All-day event (YYYY-MM-DD)
  timeZone?: string;
}

/**
 * Event Attendee Interface
 */
export interface EventAttendee {
  email: string;
  displayName?: string;
  responseStatus: AttendeeResponse;
  optional?: boolean;
  comment?: string;
  additionalGuests?: number;
}

/**
 * Attendee Response Status
 */
export enum AttendeeResponse {
  NEEDS_ACTION = 'needsAction',
  DECLINED = 'declined',
  TENTATIVE = 'tentative',
  ACCEPTED = 'accepted',
}

/**
 * Event Status
 */
export enum EventStatus {
  CONFIRMED = 'confirmed',
  TENTATIVE = 'tentative',
  CANCELLED = 'cancelled',
}

/**
 * Event Visibility
 */
export enum EventVisibility {
  DEFAULT = 'default',
  PUBLIC = 'public',
  PRIVATE = 'private',
  CONFIDENTIAL = 'confidential',
}

/**
 * Recurrence Rule
 */
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

/**
 * Reminder Settings
 */
export interface ReminderSettings {
  useDefault: boolean;
  overrides?: ReminderOverride[];
}

/**
 * Reminder Override
 */
export interface ReminderOverride {
  method: 'email' | 'popup';
  minutes: number;
}

/**
 * Event Attachment
 */
export interface EventAttachment {
  fileUrl: string;
  title: string;
  mimeType?: string;
  iconLink?: string;
  fileId?: string;
}

/**
 * Conference Data
 */
export interface ConferenceData {
  createRequest?: {
    requestId: string;
    conferenceSolutionKey: { type: string };
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

/**
 * Conference Entry Point
 */
export interface ConferenceEntryPoint {
  entryPointType: 'video' | 'phone' | 'sip' | 'more';
  uri: string;
  label?: string;
  pin?: string;
  accessCode?: string;
  meetingCode?: string;
  passcode?: string;
  password?: string;
}

/**
 * Create Event Options
 */
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
  conferenceData?: ConferenceData;
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}

/**
 * Update Event Options
 */
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
  sendUpdates?: 'all' | 'externalOnly' | 'none';
}

/**
 * List Events Options
 */
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
}

/**
 * Free/Busy Request
 */
export interface FreeBusyRequest {
  timeMin: Date;
  timeMax: Date;
  calendars: string[];
  timeZone?: string;
  groupExpansionMax?: number;
  calendarExpansionMax?: number;
  items?: Array<{ id: string }>;
}

/**
 * Free/Busy Response
 */
export interface FreeBusyResponse {
  calendars: Record<string, {
    busy: Array<{ start: Date; end: Date }>;
    errors?: Array<{ domain: string; reason: string }>;
  }>;
  timeMin: Date;
  timeMax: Date;
  groups?: Record<string, {
    calendars: string[];
    errors?: Array<{ domain: string; reason: string }>;
  }>;
}

/**
 * Calendar List Entry
 */
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
  defaultReminders?: ReminderOverride[];
  notificationSettings?: {
    notifications: Array<{ type: string; method: string }>;
  };
  primary?: boolean;
  deleted?: boolean;
  conferenceProperties?: {
    allowedConferenceSolutionTypes?: string[];
  };
}

/**
 * Suggested Meeting Time
 */
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

/**
 * Smart Scheduling Options
 */
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
  preferredSlots?: Array<{ start: Date; end: Date }>;
  meetingRoomRequired?: boolean;
}

/**
 * Working Hours
 */
export interface WorkingHours {
  daysOfWeek: number[]; // 0 = Monday, 6 = Sunday
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  timeZone: string;
}

/**
 * Calendar Settings
 */
export interface CalendarSettings {
  timeZone: string;
  dateFormat: string;
  timeFormat: '12' | '24';
  weekStart: 'sunday' | 'monday';
  defaultCalendarId: string;
  workingHours: WorkingHours;
  notificationSettings: {
    newEvents: boolean;
    changedEvents: boolean;
    cancelledEvents: boolean;
    responses: boolean;
    dailyAgenda: boolean;
  };
}

/**
 * Google Calendar API Response Types
 */
export interface GoogleCalendarEventResponse {
  kind: string;
  etag: string;
  id: string;
  status: string;
  htmlLink: string;
  created: string;
  updated: string;
  summary: string;
  description?: string;
  location?: string;
  colorId?: string;
  creator: { email: string; self?: boolean };
  organizer: { email: string; self?: boolean; displayName?: string };
  start: { dateTime?: string; date?: string; timeZone?: string };
  end: { dateTime?: string; date?: string; timeZone?: string };
  recurrence?: string[];
  recurringEventId?: string;
  originalStartTime?: { dateTime?: string; date?: string; timeZone?: string };
  transparency?: 'opaque' | 'transparent';
  visibility?: 'default' | 'public' | 'private' | 'confidential';
  iCalUID: string;
  sequence: number;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
    optional?: boolean;
    comment?: string;
    additionalGuests?: number;
  }>;
  attendeesOmitted?: boolean;
  extendedProperties?: {
    private?: Record<string, string>;
    shared?: Record<string, string>;
  };
  hangoutLink?: string;
  conferenceData?: GoogleConferenceData;
  gadget?: {
    type: string;
    title: string;
    link: string;
    iconLink: string;
    width: number;
    height: number;
    display: string;
    preferences: Record<string, string>;
  };
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{ method: string; minutes: number }>;
  };
  source?: { url: string; title: string };
  workingLocationProperties?: {
    type: string;
    homeOffice?: { customLocation: { label: string } };
    officeLocation?: { buildingId: string; floorId: string; deskId: string; label: string };
  };
  eventType?: 'default' | 'outOfOffice' | 'focusTime' | 'workingLocation';
}

export interface GoogleConferenceData {
  createRequest?: {
    requestId: string;
    conferenceSolutionKey: { type: string };
    status: { statusCode: string };
  };
  entryPoints?: Array<{
    entryPointType: string;
    uri: string;
    label?: string;
    pin?: string;
    accessCode?: string;
    meetingCode?: string;
    passcode?: string;
    password?: string;
  }>;
  conferenceSolution?: {
    key: { type: string };
    name: string;
    iconUri: string;
  };
  conferenceId?: string;
  signature?: string;
  notes?: string;
}

/**
 * Calendar Agent Configuration
 */
export interface CalendarAgentConfig {
  defaultTimeZone: string;
  maxEventsPerFetch: number;
  enableSmartScheduling: boolean;
  enableMeetingRoomBooking: boolean;
  bufferMinutesDefault: number;
  workingHoursDefault: WorkingHours;
}