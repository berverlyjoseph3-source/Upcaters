// enterprise-ai-agent-platform/apps/api/src/agents/calendar/calendar.agent.ts
import { BaseAgent } from '../core/base.agent';
import { CalendarClient } from './calendar.client';
import { OAuthProvider } from '@prisma/client';
import { GoogleOAuthService } from '../../auth/services/google-oauth.service';
import { AgentType, AgentRequest, AgentContext, AgentResponse, StreamingChunk } from '../../types/agent.types';
import { logger } from '../../utils/logger';
import { OpenAIService } from '../../services/ai/openai.service';
import { CalendarTools } from './calendar.tools';

export class CalendarAgent extends BaseAgent {
  constructor() {
    super(
      AgentType.CALENDAR,
      'Calendar Agent',
      'Smart scheduling, meeting management, and availability coordination',
      '1.0.0'
    );
  }

  protected registerTools(): void {
    this.registerTool(CalendarTools.listEventsTool());
    this.registerTool(CalendarTools.createEventTool());
    this.registerTool(CalendarTools.updateEventTool());
    this.registerTool(CalendarTools.deleteEventTool());
    this.registerTool(CalendarTools.getFreeBusyTool());
    this.registerTool(CalendarTools.suggestMeetingTimeTool());
    this.registerTool(CalendarTools.smartScheduleTool());
    this.registerTool(CalendarTools.listCalendarsTool());
  }

  /**
   * Get Calendar client for a user
   */
  private async getCalendarClient(userId: string): Promise<CalendarClient> {
    const accessToken = await GoogleOAuthService.getValidAccessToken(userId, OAuthProvider.GOOGLE_CALENDAR);
    if (!accessToken) {
      throw new Error('Google Calendar not connected. Please connect your Calendar account in Settings.');
    }
    return new CalendarClient(accessToken);
  }

  /**
   * Check if agent can handle the request
   */
  canHandle(request: AgentRequest): boolean {
    const input = typeof request.input === 'string' ? request.input.toLowerCase() : '';
    
    const calendarKeywords = [
      'calendar', 'schedule', 'meeting', 'event', 'appointment',
      'book', 'reminder', 'agenda', 'availability', 'free busy',
      'next week', 'tomorrow', 'today', 'this week', 'this month',
      'reschedule', 'cancel meeting', 'create event', 'add to calendar'
    ];
    
    return calendarKeywords.some(keyword => input.includes(keyword));
  }

  /**
   * Execute calendar agent logic
   */
  protected async doExecute(request: AgentRequest, context: AgentContext): Promise<any> {
    const startTime = Date.now();
    const input = typeof request.input === 'string' ? request.input : JSON.stringify(request.input);
    const lowerInput = input.toLowerCase();

    try {
      // Check Calendar connection first
      try {
        await this.getCalendarClient(context.userId);
      } catch (error) {
        return {
          success: false,
          message: 'Google Calendar is not connected. Please connect your Calendar account in Settings.',
          action: 'connect_calendar',
          error: error instanceof Error ? error.message : 'Connection failed',
        };
      }

      // Handle smart scheduling / find meeting time
      if (this.isSchedulingRequest(lowerInput)) {
        return await this.handleSmartScheduling(context.userId, input, context);
      }

      // Handle create event
      if (this.isCreateEventRequest(lowerInput)) {
        return await this.handleCreateEvent(context.userId, input);
      }

      // Handle update event
      if (this.isUpdateEventRequest(lowerInput)) {
        return await this.handleUpdateEvent(context.userId, input);
      }

      // Handle delete/cancel event
      if (this.isDeleteEventRequest(lowerInput)) {
        return await this.handleDeleteEvent(context.userId, input);
      }

      // Handle check availability
      if (this.isAvailabilityRequest(lowerInput)) {
        return await this.handleCheckAvailability(context.userId, input);
      }

      // Handle list calendars
      if (lowerInput.includes('calendars') || lowerInput.includes('calendar list')) {
        return await this.handleListCalendars(context.userId);
      }

      // Default: list events
      return await this.handleListEvents(context.userId, input);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error({ error, userId: context.userId, executionTimeMs: Date.now() - startTime }, 'Calendar agent execution failed');
      
      return {
        success: false,
        message: `Failed to process calendar request: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  private isSchedulingRequest(input: string): boolean {
    const keywords = ['schedule meeting', 'find time', 'book meeting', 'smart schedule', 'suggest time', 'arrange meeting'];
    return keywords.some(k => input.includes(k));
  }

  private isCreateEventRequest(input: string): boolean {
    const keywords = ['create', 'add', 'new event', 'schedule', 'set up', 'plan', 'organize'];
    return keywords.some(k => input.includes(k));
  }

  private isUpdateEventRequest(input: string): boolean {
    const keywords = ['update', 'change', 'modify', 'reschedule', 'move', 'edit'];
    return keywords.some(k => input.includes(k));
  }

  private isDeleteEventRequest(input: string): boolean {
    const keywords = ['delete', 'remove', 'cancel', 'clear'];
    return keywords.some(k => input.includes(k));
  }

  private isAvailabilityRequest(input: string): boolean {
    const keywords = ['availability', 'free', 'busy', 'available', 'open slots', 'free time'];
    return keywords.some(k => input.includes(k));
  }

  /**
   * Extract event details using AI
   */
  private async extractEventDetails(input: string): Promise<any> {
    try {
      const extractionPrompt = `
Extract calendar event details from: "${input}"

Return JSON with:
- title: event title (required)
- start: start date/time in ISO format (required)
- end: end date/time in ISO format (required)
- description: event description (optional, null if none)
- location: event location (optional, null if none)
- attendees: array of email addresses (optional, empty array if none)
- timeZone: timezone (optional, null if none)

If dates are relative (tomorrow, next week, etc.), calculate the actual date.
Default meeting duration is 1 hour if not specified.
Return ONLY valid JSON.`;

      const result = await OpenAIService.complete({
        prompt: extractionPrompt,
        temperature: 0.3,
        maxTokens: 500,
      });

      return JSON.parse(result.content);
    } catch (error) {
      logger.warn({ error, input }, 'AI event extraction failed, using fallback');
      
      // Fallback extraction
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      const endTime = new Date(tomorrow);
      endTime.setHours(10, 0, 0, 0);

      const titleMatch = input.match(/(?:title|called|named)\s+["']?([^"']+)["']?/i);
      const emailMatch = input.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);

      return {
        title: titleMatch?.[1] || input.substring(0, 100),
        start: tomorrow.toISOString(),
        end: endTime.toISOString(),
        description: null,
        location: null,
        attendees: emailMatch || [],
        timeZone: null,
      };
    }
  }

  /**
   * Handle smart scheduling
   */
  private async handleSmartScheduling(userId: string, input: string, context: AgentContext): Promise<any> {
    try {
      const emailMatch = input.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g);
      const attendees = emailMatch || [];
      const durationMatch = input.match(/(\d+)\s*(?:min|minute|minutes|hour|hours)/i);
      const durationMinutes = durationMatch ? parseInt(durationMatch[1]) : 60;

      const titleMatch = input.match(/(?:title|called|named|about)\s+["']?([^"']+)["']?/i);
      const title = titleMatch?.[1] || 'Meeting';

      if (attendees.length === 0) {
        return {
          success: false,
          message: 'Please provide attendee email addresses for the meeting.',
          action: 'provide_attendees',
        };
      }

      const result = await CalendarTools.smartSchedule(userId, {
        title,
        attendees,
        durationMinutes,
        timeMin: new Date(),
        timeMax: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        bufferMinutes: 15,
        workingHours: {
          daysOfWeek: [0, 1, 2, 3, 4],
          startHour: 9,
          endHour: 17,
        },
      });

      return {
        success: true,
        message: `Meeting "${title}" scheduled successfully!`,
        event: {
          id: result.id,
          title: result.title,
          start: result.start?.dateTime || result.start?.date,
          end: result.end?.dateTime || result.end?.date,
          htmlLink: result.htmlLink,
          attendees: result.attendees,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Smart scheduling failed';
      logger.error({ error, userId }, 'Smart scheduling failed');
      
      return {
        success: false,
        message: `Failed to schedule meeting: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle create event
   */
  private async handleCreateEvent(userId: string, input: string): Promise<any> {
    try {
      const eventDetails = await this.extractEventDetails(input);

      if (!eventDetails.title) {
        return {
          success: false,
          message: 'Please provide a title for the event.',
          action: 'provide_title',
        };
      }

      const result = await CalendarTools.createEvent(userId, {
        title: eventDetails.title,
        start: new Date(eventDetails.start),
        end: new Date(eventDetails.end),
        description: eventDetails.description,
        location: eventDetails.location,
        attendees: eventDetails.attendees,
        timeZone: eventDetails.timeZone,
        sendUpdates: 'all',
      });

      return {
        success: true,
        message: `Event "${result.title}" created successfully!`,
        event: {
          id: result.id,
          title: result.title,
          start: result.start?.dateTime || result.start?.date,
          end: result.end?.dateTime || result.end?.date,
          htmlLink: result.htmlLink,
          attendees: result.attendees,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create event';
      logger.error({ error, userId }, 'Create event failed');
      
      return {
        success: false,
        message: `Failed to create event: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle update event
   */
  private async handleUpdateEvent(userId: string, input: string): Promise<any> {
    try {
      const eventIdMatch = input.match(/(?:event|id)[:\s]+([a-zA-Z0-9_-]+)/i);
      
      if (!eventIdMatch) {
        return {
          success: false,
          message: 'Please specify the event ID to update.',
          action: 'provide_event_id',
        };
      }

      const eventDetails = await this.extractEventDetails(input);

      const result = await CalendarTools.updateEvent(userId, {
        eventId: eventIdMatch[1],
        title: eventDetails.title,
        start: eventDetails.start ? new Date(eventDetails.start) : undefined,
        end: eventDetails.end ? new Date(eventDetails.end) : undefined,
        description: eventDetails.description,
        location: eventDetails.location,
        addAttendees: eventDetails.attendees,
      });

      return {
        success: true,
        message: `Event updated successfully!`,
        event: result,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to update event';
      logger.error({ error, userId }, 'Update event failed');
      
      return {
        success: false,
        message: `Failed to update event: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle delete event
   */
  private async handleDeleteEvent(userId: string, input: string): Promise<any> {
    try {
      const eventIdMatch = input.match(/(?:event|id)[:\s]+([a-zA-Z0-9_-]+)/i);

      if (!eventIdMatch) {
        return {
          success: false,
          message: 'Please specify the event ID to delete.',
          action: 'provide_event_id',
        };
      }

      await CalendarTools.deleteEvent(userId, eventIdMatch[1], 'all');

      return {
        success: true,
        message: 'Event deleted successfully!',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete event';
      logger.error({ error, userId }, 'Delete event failed');
      
      return {
        success: false,
        message: `Failed to delete event: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle check availability
   */
  private async handleCheckAvailability(userId: string, input: string): Promise<any> {
    try {
      let timeMin = new Date();
      let timeMax = new Date();
      
      if (input.includes('today')) {
        timeMax.setHours(23, 59, 59, 999);
      } else if (input.includes('tomorrow')) {
        timeMin.setDate(timeMin.getDate() + 1);
        timeMin.setHours(0, 0, 0, 0);
        timeMax.setDate(timeMax.getDate() + 1);
        timeMax.setHours(23, 59, 59, 999);
      } else if (input.includes('week')) {
        timeMax.setDate(timeMax.getDate() + 7);
      } else {
        timeMax.setDate(timeMax.getDate() + 1);
      }

      const result = await CalendarTools.getFreeBusy(userId, {
        timeMin,
        timeMax,
        calendars: ['primary'],
      });

      return {
        success: true,
        message: `Availability for ${timeMin.toLocaleDateString()} retrieved`,
        busySlots: result.calendars?.primary?.busy || [],
        timeMin: result.timeMin,
        timeMax: result.timeMax,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to check availability';
      logger.error({ error, userId }, 'Check availability failed');
      
      return {
        success: false,
        message: `Failed to check availability: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle list calendars
   */
  private async handleListCalendars(userId: string): Promise<any> {
    try {
      const calendars = await CalendarTools.listCalendars(userId);

      return {
        success: true,
        message: `Found ${calendars.length} calendar(s)`,
        calendars: calendars.map(c => ({
          id: c.id,
          summary: c.summary,
          description: c.description,
          timeZone: c.timeZone,
          primary: c.primary,
          accessRole: c.accessRole,
        })),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list calendars';
      logger.error({ error, userId }, 'List calendars failed');
      
      return {
        success: false,
        message: `Failed to list calendars: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Handle list events
   */
  private async handleListEvents(userId: string, input: string): Promise<any> {
    try {
      let timeMin = new Date();
      let timeMax = new Date();
      const maxResults = parseInt(input.match(/(\d+)\s+events?/i)?.[1] || '10');

      if (input.includes('today')) {
        timeMax.setHours(23, 59, 59, 999);
      } else if (input.includes('tomorrow')) {
        timeMin.setDate(timeMin.getDate() + 1);
        timeMin.setHours(0, 0, 0, 0);
        timeMax.setDate(timeMax.getDate() + 1);
        timeMax.setHours(23, 59, 59, 999);
      } else if (input.includes('week')) {
        timeMax.setDate(timeMax.getDate() + 7);
      } else if (input.includes('month')) {
        timeMax.setMonth(timeMax.getMonth() + 1);
      } else {
        timeMax.setDate(timeMax.getDate() + 7);
      }

      const result = await CalendarTools.listEvents(userId, {
        timeMin,
        timeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return {
        success: true,
        message: `Found ${result.events.length} event(s)`,
        events: result.events.map(e => ({
          id: e.id,
          title: e.title,
          start: e.start?.dateTime || e.start?.date,
          end: e.end?.dateTime || e.end?.date,
          description: e.description,
          location: e.location,
          attendees: e.attendees?.map(a => a.email),
          status: e.status,
          htmlLink: e.htmlLink,
        })),
        count: result.events.length,
        hasMore: !!result.nextPageToken,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to list events';
      logger.error({ error, userId }, 'List events failed');
      
      return {
        success: false,
        message: `Failed to list events: ${errorMessage}`,
        error: errorMessage,
      };
    }
  }

  /**
   * Execute with streaming support
   */
  async executeStream(
    request: AgentRequest,
    context: AgentContext,
    onChunk: (chunk: StreamingChunk) => void
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      onChunk({
        type: 'thought',
        content: 'Checking your calendar...',
        timestamp: new Date(),
      });

      const result = await this.doExecute(request, context);

      onChunk({
        type: 'output',
        content: result.message || JSON.stringify(result),
        timestamp: new Date(),
      });

      return {
        id: `calendar_${Date.now()}`,
        success: result.success !== false,
        output: result,
        metadata: {
          agentType: this.agentType,
          executionTimeMs: Date.now() - startTime,
          tokensUsed: 0,
          costUsd: 0,
          retryCount: 0,
        },
        timestamp: new Date(),
      };
    } catch (error) {
      onChunk({
        type: 'error',
        content: error instanceof Error ? error.message : 'Execution failed',
        timestamp: new Date(),
      });

      return {
        id: `calendar_${Date.now()}`,
        success: false,
        output: null,
        error: error instanceof Error ? error.message : 'Execution failed',
        metadata: {
          agentType: this.agentType,
          executionTimeMs: Date.now() - startTime,
          tokensUsed: 0,
          costUsd: 0,
          retryCount: 0,
        },
        timestamp: new Date(),
      };
    }
  }
}