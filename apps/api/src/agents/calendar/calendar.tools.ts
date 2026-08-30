// enterprise-ai-agent-platform/apps/api/src/agents/calendar/calendar.tools.ts
import { AgentTool, AgentContext } from '../../types/agent.types';
import { CalendarClient } from './calendar.client';
import { OAuthProvider } from '@prisma/client';
import { GoogleOAuthService } from '../../auth/services/google-oauth.service';
import { logger } from '../../utils/logger';
import { 
  CalendarEvent, 
  CreateEventOptions, 
  UpdateEventOptions, 
  ListEventsOptions,
  FreeBusyRequest,
  FreeBusyResponse,
  SmartScheduleOptions,
  SuggestedMeetingTime,
  CalendarListEntry,
  CalendarSettings,
  EventAttendee,
  EventTime,
  AttendeeResponse,
} from './calendar.types';

export class CalendarTools {
  /**
   * List calendar events
   */
  static listEventsTool(): AgentTool {
    return {
      name: 'list_events',
      description: 'List calendar events within a date range',
      parameters: [
        { name: 'timeMin', type: 'string', required: false, description: 'Start date (ISO format)' },
        { name: 'timeMax', type: 'string', required: false, description: 'End date (ISO format)' },
        { name: 'maxResults', type: 'number', required: false, description: 'Maximum number of events (default: 10)' },
        { name: 'query', type: 'string', required: false, description: 'Search query' },
        { name: 'calendarId', type: 'string', required: false, description: 'Calendar ID (default: primary)' },
      ],
      execute: async (params, context) => {
        return await this.listEvents(context.userId, {
          calendarId: params.calendarId || 'primary',
          timeMin: params.timeMin ? new Date(params.timeMin) : new Date(),
          timeMax: params.timeMax ? new Date(params.timeMax) : undefined,
          maxResults: params.maxResults || 10,
          q: params.query,
        });
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Create calendar event
   */
  static createEventTool(): AgentTool {
    return {
      name: 'create_event',
      description: 'Create a new calendar event',
      parameters: [
        { name: 'title', type: 'string', required: true, description: 'Event title' },
        { name: 'start', type: 'string', required: true, description: 'Start date/time (ISO format)' },
        { name: 'end', type: 'string', required: true, description: 'End date/time (ISO format)' },
        { name: 'description', type: 'string', required: false, description: 'Event description' },
        { name: 'location', type: 'string', required: false, description: 'Event location' },
        { name: 'attendees', type: 'array', required: false, description: 'Array of attendee emails' },
        { name: 'timeZone', type: 'string', required: false, description: 'Time zone (e.g., "America/New_York")' },
        { name: 'isAllDay', type: 'boolean', required: false, description: 'All-day event' },
        { name: 'sendUpdates', type: 'string', required: false, description: 'Send updates to attendees (all, externalOnly, none)' },
      ],
      execute: async (params, context) => {
        return await this.createEvent(context.userId, {
          title: params.title,
          description: params.description,
          location: params.location,
          start: new Date(params.start),
          end: new Date(params.end),
          attendees: params.attendees,
          timeZone: params.timeZone,
          isAllDay: params.isAllDay,
          sendUpdates: params.sendUpdates,
        });
      },
      requiresApiCall: true,
      cost: 2,
    };
  }

  /**
   * Update calendar event
   */
  static updateEventTool(): AgentTool {
    return {
      name: 'update_event',
      description: 'Update an existing calendar event',
      parameters: [
        { name: 'eventId', type: 'string', required: true, description: 'ID of the event to update' },
        { name: 'title', type: 'string', required: false, description: 'New event title' },
        { name: 'start', type: 'string', required: false, description: 'New start date/time' },
        { name: 'end', type: 'string', required: false, description: 'New end date/time' },
        { name: 'description', type: 'string', required: false, description: 'New description' },
        { name: 'location', type: 'string', required: false, description: 'New location' },
        { name: 'addAttendees', type: 'array', required: false, description: 'Attendees to add' },
        { name: 'removeAttendees', type: 'array', required: false, description: 'Attendees to remove' },
        { name: 'status', type: 'string', required: false, description: 'Event status (confirmed, tentative, cancelled)' },
      ],
      execute: async (params, context) => {
        return await this.updateEvent(context.userId, {
          eventId: params.eventId,
          calendarId: 'primary',
          title: params.title,
          description: params.description,
          location: params.location,
          start: params.start ? new Date(params.start) : undefined,
          end: params.end ? new Date(params.end) : undefined,
          addAttendees: params.addAttendees,
          removeAttendees: params.removeAttendees,
          status: params.status as any,
        });
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Delete calendar event
   */
  static deleteEventTool(): AgentTool {
    return {
      name: 'delete_event',
      description: 'Delete a calendar event',
      parameters: [
        { name: 'eventId', type: 'string', required: true, description: 'ID of the event to delete' },
        { name: 'sendUpdates', type: 'string', required: false, description: 'Send cancellation to attendees (all, externalOnly, none)' },
      ],
      execute: async (params, context) => {
        await this.deleteEvent(context.userId, params.eventId, params.sendUpdates);
        return { success: true };
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Get free/busy slots
   */
  static getFreeBusyTool(): AgentTool {
    return {
      name: 'get_free_busy',
      description: 'Get free/busy information for calendars',
      parameters: [
        { name: 'timeMin', type: 'string', required: true, description: 'Start date/time' },
        { name: 'timeMax', type: 'string', required: true, description: 'End date/time' },
        { name: 'calendars', type: 'array', required: false, description: 'Calendar IDs to check (defaults to primary)' },
        { name: 'timeZone', type: 'string', required: false, description: 'Time zone for the query' },
      ],
      execute: async (params, context) => {
        return await this.getFreeBusy(context.userId, {
          timeMin: new Date(params.timeMin),
          timeMax: new Date(params.timeMax),
          calendars: params.calendars || ['primary'],
        });
      },
      requiresApiCall: true,
      cost: 1,
    };
  }

  /**
   * Suggest optimal meeting time
   */
  static suggestMeetingTimeTool(): AgentTool {
    return {
      name: 'suggest_meeting_time',
      description: 'Suggest optimal meeting time based on attendee availability',
      parameters: [
        { name: 'title', type: 'string', required: true, description: 'Meeting title' },
        { name: 'attendees', type: 'array', required: true, description: 'Attendee email addresses' },
        { name: 'durationMinutes', type: 'number', required: true, description: 'Meeting duration in minutes' },
        { name: 'timeMin', type: 'string', required: false, description: 'Earliest meeting time' },
        { name: 'timeMax', type: 'string', required: false, description: 'Latest meeting time' },
        { name: 'bufferMinutes', type: 'number', required: false, description: 'Buffer time between meetings' },
        { name: 'workingHoursOnly', type: 'boolean', required: false, description: 'Only suggest during working hours' },
      ],
      execute: async (params, context) => {
        return await this.suggestMeetingTime(context.userId, {
          title: params.title,
          attendees: params.attendees,
          durationMinutes: params.durationMinutes,
          timeMin: params.timeMin ? new Date(params.timeMin) : new Date(),
          timeMax: params.timeMax ? new Date(params.timeMax) : undefined,
          bufferMinutes: params.bufferMinutes || 15,
          workingHours: params.workingHoursOnly !== false ? {
            daysOfWeek: [0, 1, 2, 3, 4],
            startHour: 9,
            endHour: 17,
          } : undefined,
        });
      },
      requiresApiCall: true,
      cost: 3,
    };
  }

  /**
   * Create event with smart scheduling
   */
  static smartScheduleTool(): AgentTool {
    return {
      name: 'smart_schedule',
      description: 'Automatically schedule a meeting at the best available time',
      parameters: [
        { name: 'title', type: 'string', required: true, description: 'Meeting title' },
        { name: 'attendees', type: 'array', required: true, description: 'Attendee email addresses' },
        { name: 'durationMinutes', type: 'number', required: true, description: 'Meeting duration in minutes' },
        { name: 'timeMin', type: 'string', required: false, description: 'Earliest meeting time' },
        { name: 'timeMax', type: 'string', required: false, description: 'Latest meeting time' },
        { name: 'workingHoursOnly', type: 'boolean', required: false, description: 'Only schedule during working hours' },
        { name: 'description', type: 'string', required: false, description: 'Meeting description' },
      ],
      execute: async (params, context) => {
        return await this.smartSchedule(context.userId, {
          title: params.title,
          attendees: params.attendees,
          durationMinutes: params.durationMinutes,
          timeMin: params.timeMin ? new Date(params.timeMin) : new Date(),
          timeMax: params.timeMax ? new Date(params.timeMax) : undefined,
          bufferMinutes: 15,
          workingHours: params.workingHoursOnly !== false ? {
            daysOfWeek: [0, 1, 2, 3, 4],
            startHour: 9,
            endHour: 17,
          } : undefined,
        });
      },
      requiresApiCall: true,
      cost: 5,
    };
  }

  /**
   * Get calendar list
   */
  static listCalendarsTool(): AgentTool {
    return {
      name: 'list_calendars',
      description: 'List all calendars for the user',
      parameters: [],
      execute: async (params, context) => {
        return await this.listCalendars(context.userId);
      },
      requiresApiCall: true,
      cost: 0.5,
    };
  }

  // ============================================
  // Implementation Methods
  // ============================================

  /**
   * Get Calendar client for a user
   */
  private static async getCalendarClient(userId: string): Promise<CalendarClient> {
    const accessToken = await GoogleOAuthService.getValidAccessToken(userId, OAuthProvider.GOOGLE_CALENDAR);
    if (!accessToken) {
      throw new Error('Google Calendar not connected. Please connect your Calendar account in Settings.');
    }
    return new CalendarClient(accessToken);
  }

  /**
   * List calendar events
   */
  static async listEvents(
    userId: string,
    options: ListEventsOptions
  ): Promise<{ events: CalendarEvent[]; nextPageToken?: string }> {
    try {
      const client = await this.getCalendarClient(userId);
      
      logger.info({ userId, options }, 'Listing calendar events');
      
      const result = await client.listEvents(options.calendarId || 'primary', {
        timeMin: options.timeMin?.toISOString(),
        timeMax: options.timeMax?.toISOString(),
        maxResults: options.maxResults,
        singleEvents: options.singleEvents,
        orderBy: options.orderBy,
        q: options.q,
      });

      const events: CalendarEvent[] = (result.items || []).map(e => ({
        id: e.id,
        calendarId: options.calendarId || 'primary',
        title: e.summary || '',
        description: e.description,
        location: e.location,
        start: {
          dateTime: e.start?.dateTime ? new Date(e.start.dateTime) : undefined,
          date: e.start?.date,
          timeZone: e.start?.timeZone,
        },
        end: {
          dateTime: e.end?.dateTime ? new Date(e.end.dateTime) : undefined,
          date: e.end?.date,
          timeZone: e.end?.timeZone,
        },
        attendees: e.attendees?.map(a => ({
          email: a.email,
          displayName: a.displayName,
          responseStatus: a.responseStatus as AttendeeResponse,
          optional: a.optional,
          comment: a.comment,
          additionalGuests: a.additionalGuests,
        })),
        organizer: e.organizer ? {
          email: e.organizer.email,
          displayName: e.organizer.displayName,
          responseStatus: 'accepted' as AttendeeResponse,
        } : undefined,
        status: (e.status as any) || 'confirmed',
        visibility: (e.visibility as any) || 'default',
        created: e.created ? new Date(e.created) : new Date(),
        updated: e.updated ? new Date(e.updated) : new Date(),
        htmlLink: e.htmlLink,
        iCalUID: e.iCalUID,
        sequence: e.sequence,
      }));

      return {
        events,
        nextPageToken: result.nextPageToken,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to list events');
      throw error;
    }
  }

  /**
   * Create calendar event
   */
  static async createEvent(
    userId: string,
    options: CreateEventOptions
  ): Promise<CalendarEvent> {
    try {
      const client = await this.getCalendarClient(userId);
      
      logger.info({ userId, title: options.title, start: options.start }, 'Creating calendar event');

      const eventData: any = {
        summary: options.title,
        description: options.description,
        location: options.location,
        attendees: options.attendees?.map(email => ({ email })),
        reminders: options.reminders || { useDefault: true },
      };

      if (options.isAllDay) {
        eventData.start = {
          date: options.start.toISOString().split('T')[0],
          timeZone: options.timeZone || 'UTC',
        };
        eventData.end = {
          date: options.end.toISOString().split('T')[0],
          timeZone: options.timeZone || 'UTC',
        };
      } else {
        eventData.start = {
          dateTime: options.start.toISOString(),
          timeZone: options.timeZone || 'UTC',
        };
        eventData.end = {
          dateTime: options.end.toISOString(),
          timeZone: options.timeZone || 'UTC',
        };
      }

      if (options.conferenceData) {
        eventData.conferenceData = {
          createRequest: {
            requestId: `${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        };
      }

      const result = await client.createEvent(
        options.calendarId || 'primary',
        eventData,
        options.sendUpdates || 'all'
      );

      return {
        id: result.id,
        calendarId: options.calendarId || 'primary',
        title: result.summary || '',
        description: result.description,
        location: result.location,
        start: {
          dateTime: result.start?.dateTime ? new Date(result.start.dateTime) : undefined,
          date: result.start?.date,
          timeZone: result.start?.timeZone,
        },
        end: {
          dateTime: result.end?.dateTime ? new Date(result.end.dateTime) : undefined,
          date: result.end?.date,
          timeZone: result.end?.timeZone,
        },
        attendees: result.attendees?.map(a => ({
          email: a.email,
          displayName: a.displayName,
          responseStatus: a.responseStatus as AttendeeResponse,
          optional: a.optional,
        })),
        organizer: result.organizer ? {
          email: result.organizer.email,
          displayName: result.organizer.displayName,
          responseStatus: 'accepted' as AttendeeResponse,
        } : undefined,
        status: (result.status as any) || 'confirmed',
        visibility: (result.visibility as any) || 'default',
        created: result.created ? new Date(result.created) : new Date(),
        updated: result.updated ? new Date(result.updated) : new Date(),
        htmlLink: result.htmlLink,
        iCalUID: result.iCalUID,
        sequence: result.sequence,
      };
    } catch (error) {
      logger.error({ error, userId, title: options.title }, 'Failed to create event');
      throw error;
    }
  }

  /**
   * Update calendar event
   */
  static async updateEvent(
    userId: string,
    options: UpdateEventOptions
  ): Promise<CalendarEvent> {
    try {
      const client = await this.getCalendarClient(userId);
      
      logger.info({ userId, eventId: options.eventId }, 'Updating calendar event');

      const updates: any = {};
      
      if (options.title) updates.summary = options.title;
      if (options.description) updates.description = options.description;
      if (options.location) updates.location = options.location;
      if (options.status) updates.status = options.status;
      
      if (options.start) {
        updates.start = {
          dateTime: options.start.toISOString(),
          timeZone: options.timeZone || 'UTC',
        };
      }
      if (options.end) {
        updates.end = {
          dateTime: options.end.toISOString(),
          timeZone: options.timeZone || 'UTC',
        };
      }

      const result = await client.patchEvent(
        options.calendarId || 'primary',
        options.eventId,
        updates,
        options.sendUpdates
      );

      return {
        id: result.id,
        calendarId: options.calendarId || 'primary',
        title: result.summary || '',
        description: result.description,
        location: result.location,
        visibility: (result.visibility as any) || 'default',
        start: {
          dateTime: result.start?.dateTime ? new Date(result.start.dateTime) : undefined,
          date: result.start?.date,
          timeZone: result.start?.timeZone,
        },
        end: {
          dateTime: result.end?.dateTime ? new Date(result.end.dateTime) : undefined,
          date: result.end?.date,
          timeZone: result.end?.timeZone,
        },
        attendees: result.attendees?.map(a => ({
          email: a.email,
          displayName: a.displayName,
          responseStatus: a.responseStatus as AttendeeResponse,
        })),
        organizer: result.organizer ? {
          email: result.organizer.email,
          displayName: result.organizer.displayName,
          responseStatus: 'accepted' as AttendeeResponse,
        } : undefined,
        status: (result.status as any) || 'confirmed',
        created: result.created ? new Date(result.created) : new Date(),
        updated: result.updated ? new Date(result.updated) : new Date(),
        htmlLink: result.htmlLink,
        iCalUID: result.iCalUID,
        sequence: result.sequence,
      };
    } catch (error) {
      logger.error({ error, userId, eventId: options.eventId }, 'Failed to update event');
      throw error;
    }
  }

  /**
   * Delete calendar event
   */
  static async deleteEvent(
    userId: string,
    eventId: string,
    sendUpdates: string = 'all'
  ): Promise<void> {
    try {
      const client = await this.getCalendarClient(userId);
      
      logger.info({ userId, eventId }, 'Deleting calendar event');
      
      await client.deleteEvent('primary', eventId, sendUpdates as any);
    } catch (error) {
      logger.error({ error, userId, eventId }, 'Failed to delete event');
      throw error;
    }
  }

  /**
   * Get free/busy information
   */
  static async getFreeBusy(
    userId: string,
    request: FreeBusyRequest
  ): Promise<FreeBusyResponse> {
    try {
      const client = await this.getCalendarClient(userId);
      
      logger.info({ userId, timeMin: request.timeMin, timeMax: request.timeMax }, 'Getting free/busy');

      const items = request.calendars.map(id => ({ id }));
      
      const result = await client.getFreeBusy({
        timeMin: request.timeMin.toISOString(),
        timeMax: request.timeMax.toISOString(),
        timeZone: request.timeZone,
        items,
      });

      const calendars: Record<string, { busy: Array<{ start: Date; end: Date }> }> = {};
      
      for (const [id, data] of Object.entries(result.calendars || {})) {
        calendars[id] = {
          busy: (data.busy || []).map(b => ({
            start: new Date(b.start),
            end: new Date(b.end),
          })),
        };
      }

      return {
        calendars,
        timeMin: request.timeMin,
        timeMax: request.timeMax,
      };
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get free/busy');
      throw error;
    }
  }

  /**
   * Suggest meeting times
   */
  static async suggestMeetingTime(
    userId: string,
    options: SmartScheduleOptions
  ): Promise<SuggestedMeetingTime[]> {
    try {
      const client = await this.getCalendarClient(userId);
      
      logger.info({ userId, title: options.title, attendees: options.attendees }, 'Suggesting meeting times');

      const allCalendars = [userId, ...options.attendees];
      
      const freeBusy = await this.getFreeBusy(userId, {
        timeMin: options.timeMin || new Date(),
        timeMax: options.timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        calendars: allCalendars,
      });

      // Find common free slots
      const suggestions: SuggestedMeetingTime[] = [];
      const now = new Date();
      const endDate = options.timeMax || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const slotDuration = options.durationMinutes * 60 * 1000;
      const bufferMs = (options.bufferMinutes || 15) * 60 * 1000;
      const workingHours = options.workingHours;

      // Generate time slots in 30-minute increments
      let currentSlot = new Date(Math.max(now.getTime(), options.timeMin?.getTime() || now.getTime()));
      
      while (currentSlot.getTime() + slotDuration <= endDate.getTime()) {
        const slotEnd = new Date(currentSlot.getTime() + slotDuration);
        let slotAvailable = true;

        // Check working hours if specified
        if (workingHours) {
          const dayOfWeek = currentSlot.getDay();
          const hour = currentSlot.getHours();
          
          if (!workingHours.daysOfWeek.includes(dayOfWeek) ||
              hour < workingHours.startHour ||
              hour >= workingHours.endHour) {
            slotAvailable = false;
          }
        }

        // Check free/busy
        if (slotAvailable) {
          for (const [calId, data] of Object.entries(freeBusy.calendars)) {
            for (const busy of data.busy) {
              if (currentSlot < busy.end && slotEnd > busy.start) {
                slotAvailable = false;
                break;
              }
            }
            if (!slotAvailable) break;
          }
        }

        if (slotAvailable) {
          suggestions.push({
            start: new Date(currentSlot),
            end: new Date(slotEnd),
            attendees: options.attendees,
            confidence: 0.85,
          });
        }

        // Increment by 30 minutes
        currentSlot = new Date(currentSlot.getTime() + 30 * 60 * 1000 + bufferMs);
      }

      return suggestions;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to suggest meeting times');
      throw error;
    }
  }

  /**
   * Smart schedule a meeting
   */
  static async smartSchedule(
    userId: string,
    options: SmartScheduleOptions
  ): Promise<CalendarEvent> {
    try {
      const suggestions = await this.suggestMeetingTime(userId, options);
      
      if (suggestions.length === 0) {
        throw new Error('No suitable meeting times found');
      }
      
      const bestSlot = suggestions[0];
      
      const event = await this.createEvent(userId, {
        title: options.title,
        start: bestSlot.start,
        end: bestSlot.end,
        attendees: options.attendees,
        sendUpdates: 'all',
      });
      
      logger.info({ userId, eventId: event.id, start: bestSlot.start }, 'Meeting scheduled via smart scheduling');
      
      return event;
    } catch (error) {
      logger.error({ error, userId }, 'Smart scheduling failed');
      throw error;
    }
  }

  /**
   * List calendars
   */
  static async listCalendars(userId: string): Promise<CalendarListEntry[]> {
    try {
      const client = await this.getCalendarClient(userId);
      
      logger.info({ userId }, 'Listing calendars');
      
      const calendars = await client.listCalendars();
      
      return calendars.map(c => ({
        id: c.id,
        summary: c.summary,
        description: c.description,
        location: c.location,
        timeZone: c.timeZone,
        summaryOverride: c.summaryOverride,
        colorId: c.colorId,
        backgroundColor: c.backgroundColor,
        foregroundColor: c.foregroundColor,
        hidden: c.hidden,
        selected: c.selected,
        accessRole: c.accessRole as CalendarListEntry['accessRole'],
        primary: c.primary,
        deleted: c.deleted,
      }));
    } catch (error) {
      logger.error({ error, userId }, 'Failed to list calendars');
      throw error;
    }
  }
}