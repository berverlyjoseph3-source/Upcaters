"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportUsersQuerySchema = exports.ToggleMaintenanceSchema = exports.UpdateSystemSettingsSchema = exports.UpdateAnnouncementSchema = exports.CreateAnnouncementSchema = exports.AddTicketMessageSchema = exports.AssignTicketSchema = exports.UpdateTicketStatusSchema = exports.TicketsListQuerySchema = exports.ExportAuditLogsSchema = exports.AuditLogsQuerySchema = exports.SuspendUserSchema = exports.UpdateUserSchema = exports.UserListQuerySchema = void 0;
// enterprise-ai-agent-platform/apps/api/src/validators/admin.validator.ts
const zod_1 = require("zod");
/**
 * User list query validator
 */
exports.UserListQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    search: zod_1.z.string().optional(),
    planId: zod_1.z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
    role: zod_1.z.enum(['USER', 'ADMIN', 'SUPPORT']).optional(),
    status: zod_1.z.enum(['active', 'inactive', 'suspended', 'pending']).optional(),
    dateFrom: zod_1.z.string().datetime().optional(),
    dateTo: zod_1.z.string().datetime().optional(),
    sortBy: zod_1.z.enum(['createdAt', 'lastLoginAt', 'email', 'name']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
/**
 * Update user request validator
 */
exports.UpdateUserSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(100).optional(),
    planId: zod_1.z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
    role: zod_1.z.enum(['USER', 'ADMIN', 'SUPPORT']).optional(),
    isActive: zod_1.z.boolean().optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
/**
 * Suspend user request validator
 */
exports.SuspendUserSchema = zod_1.z.object({
    reason: zod_1.z.string().min(1).max(500).optional(),
});
/**
 * Audit logs query validator
 */
exports.AuditLogsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
    userId: zod_1.z.string().uuid().optional(),
    action: zod_1.z.string().optional(),
    entityType: zod_1.z.string().optional(),
    dateFrom: zod_1.z.string().datetime().optional(),
    dateTo: zod_1.z.string().datetime().optional(),
});
/**
 * Export audit logs query validator
 */
exports.ExportAuditLogsSchema = zod_1.z.object({
    dateFrom: zod_1.z.string().datetime().optional(),
    dateTo: zod_1.z.string().datetime().optional(),
    format: zod_1.z.enum(['csv', 'json']).default('csv'),
});
/**
 * Tickets list query validator
 */
exports.TicketsListQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    status: zod_1.z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
    priority: zod_1.z.enum(['low', 'medium', 'high', 'urgent']).optional(),
    assignedTo: zod_1.z.string().uuid().optional(),
});
/**
 * Update ticket status request validator
 */
exports.UpdateTicketStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(['open', 'in_progress', 'resolved', 'closed']),
});
/**
 * Assign ticket request validator
 */
exports.AssignTicketSchema = zod_1.z.object({
    adminId: zod_1.z.string().uuid(),
});
/**
 * Add ticket message request validator
 */
exports.AddTicketMessageSchema = zod_1.z.object({
    message: zod_1.z.string().min(1).max(5000),
    isAdmin: zod_1.z.boolean().default(true),
});
/**
 * Create announcement request validator
 */
exports.CreateAnnouncementSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200),
    content: zod_1.z.string().min(1).max(5000),
    type: zod_1.z.enum(['info', 'warning', 'success', 'error']),
    isActive: zod_1.z.boolean().default(true),
    startDate: zod_1.z.string().datetime(),
    endDate: zod_1.z.string().datetime().nullable().optional(),
});
/**
 * Update announcement request validator
 */
exports.UpdateAnnouncementSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(200).optional(),
    content: zod_1.z.string().min(1).max(5000).optional(),
    type: zod_1.z.enum(['info', 'warning', 'success', 'error']).optional(),
    isActive: zod_1.z.boolean().optional(),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().nullable().optional(),
});
/**
 * Update system settings request validator
 */
exports.UpdateSystemSettingsSchema = zod_1.z.object({
    maintenanceMode: zod_1.z.boolean().optional(),
    maintenanceMessage: zod_1.z.string().nullable().optional(),
    registrationEnabled: zod_1.z.boolean().optional(),
    emailVerificationRequired: zod_1.z.boolean().optional(),
    defaultPlan: zod_1.z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
    trialDays: zod_1.z.number().int().min(0).max(30).optional(),
    supportEmail: zod_1.z.string().email().optional(),
    supportPhone: zod_1.z.string().optional(),
    companyName: zod_1.z.string().optional(),
    companyLogo: zod_1.z.string().url().nullable().optional(),
    socialLinks: zod_1.z.object({
        twitter: zod_1.z.string().url().optional(),
        linkedin: zod_1.z.string().url().optional(),
        github: zod_1.z.string().url().optional(),
    }).optional(),
    security: zod_1.z.object({
        sessionTimeout: zod_1.z.number().int().min(5).max(480).optional(),
        maxLoginAttempts: zod_1.z.number().int().min(3).max(20).optional(),
        passwordExpiryDays: zod_1.z.number().int().nullable().optional(),
        twoFactorRequired: zod_1.z.boolean().optional(),
    }).optional(),
});
/**
 * Toggle maintenance request validator
 */
exports.ToggleMaintenanceSchema = zod_1.z.object({
    enabled: zod_1.z.boolean(),
    message: zod_1.z.string().nullable().optional(),
});
/**
 * Export users query validator
 */
exports.ExportUsersQuerySchema = zod_1.z.object({
    search: zod_1.z.string().optional(),
    planId: zod_1.z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
    role: zod_1.z.enum(['USER', 'ADMIN', 'SUPPORT']).optional(),
    status: zod_1.z.enum(['active', 'inactive', 'suspended', 'pending']).optional(),
});
//# sourceMappingURL=admin.validator.js.map