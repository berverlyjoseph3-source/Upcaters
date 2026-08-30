// enterprise-ai-agent-platform/apps/api/src/validators/admin.validator.ts
import { z } from 'zod';

/**
 * User list query validator
 */
export const UserListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  planId: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  role: z.enum(['USER', 'ADMIN', 'SUPPORT']).optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'pending']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  sortBy: z.enum(['createdAt', 'lastLoginAt', 'email', 'name']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type UserListQueryInput = z.infer < typeof UserListQuerySchema > ;

/**
 * Update user request validator
 */
export const UpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  planId: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  role: z.enum(['USER', 'ADMIN', 'SUPPORT']).optional(),
  isActive: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

export type UpdateUserInput = z.infer < typeof UpdateUserSchema > ;

/**
 * Suspend user request validator
 */
export const SuspendUserSchema = z.object({
  reason: z.string().min(1).max(500).optional(),
});

export type SuspendUserInput = z.infer < typeof SuspendUserSchema > ;

/**
 * Audit logs query validator
 */
export const AuditLogsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  userId: z.string().uuid().optional(),
  action: z.string().optional(),
  entityType: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
});

export type AuditLogsQueryInput = z.infer < typeof AuditLogsQuerySchema > ;

/**
 * Export audit logs query validator
 */
export const ExportAuditLogsSchema = z.object({
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  format: z.enum(['csv', 'json']).default('csv'),
});

export type ExportAuditLogsInput = z.infer < typeof ExportAuditLogsSchema > ;

/**
 * Tickets list query validator
 */
export const TicketsListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  assignedTo: z.string().uuid().optional(),
});

export type TicketsListQueryInput = z.infer < typeof TicketsListQuerySchema > ;

/**
 * Update ticket status request validator
 */
export const UpdateTicketStatusSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']),
});

export type UpdateTicketStatusInput = z.infer < typeof UpdateTicketStatusSchema > ;

/**
 * Assign ticket request validator
 */
export const AssignTicketSchema = z.object({
  adminId: z.string().uuid(),
});

export type AssignTicketInput = z.infer < typeof AssignTicketSchema > ;

/**
 * Add ticket message request validator
 */
export const AddTicketMessageSchema = z.object({
  message: z.string().min(1).max(5000),
  isAdmin: z.boolean().default(true),
});

export type AddTicketMessageInput = z.infer < typeof AddTicketMessageSchema > ;

/**
 * Create announcement request validator
 */
export const CreateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(5000),
  type: z.enum(['info', 'warning', 'success', 'error']),
  isActive: z.boolean().default(true),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().nullable().optional(),
});

export type CreateAnnouncementInput = z.infer < typeof CreateAnnouncementSchema > ;

/**
 * Update announcement request validator
 */
export const UpdateAnnouncementSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().min(1).max(5000).optional(),
  type: z.enum(['info', 'warning', 'success', 'error']).optional(),
  isActive: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional(),
});

export type UpdateAnnouncementInput = z.infer < typeof UpdateAnnouncementSchema > ;

/**
 * Update system settings request validator
 */
export const UpdateSystemSettingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().nullable().optional(),
  registrationEnabled: z.boolean().optional(),
  emailVerificationRequired: z.boolean().optional(),
  defaultPlan: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  trialDays: z.number().int().min(0).max(30).optional(),
  supportEmail: z.string().email().optional(),
  supportPhone: z.string().optional(),
  companyName: z.string().optional(),
  companyLogo: z.string().url().nullable().optional(),
  socialLinks: z.object({
    twitter: z.string().url().optional(),
    linkedin: z.string().url().optional(),
    github: z.string().url().optional(),
  }).optional(),
  security: z.object({
    sessionTimeout: z.number().int().min(5).max(480).optional(),
    maxLoginAttempts: z.number().int().min(3).max(20).optional(),
    passwordExpiryDays: z.number().int().nullable().optional(),
    twoFactorRequired: z.boolean().optional(),
  }).optional(),
});

export type UpdateSystemSettingsInput = z.infer < typeof UpdateSystemSettingsSchema > ;

/**
 * Toggle maintenance request validator
 */
export const ToggleMaintenanceSchema = z.object({
  enabled: z.boolean(),
  message: z.string().nullable().optional(),
});

export type ToggleMaintenanceInput = z.infer < typeof ToggleMaintenanceSchema > ;

/**
 * Export users query validator
 */
export const ExportUsersQuerySchema = z.object({
  search: z.string().optional(),
  planId: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
  role: z.enum(['USER', 'ADMIN', 'SUPPORT']).optional(),
  status: z.enum(['active', 'inactive', 'suspended', 'pending']).optional(),
});

export type ExportUsersQueryInput = z.infer < typeof ExportUsersQuerySchema > ;