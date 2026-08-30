"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const admin_service_1 = require("../services/admin.service");
const logger_1 = require("../utils/logger");
class AdminController {
    // ============================================
    // User Management
    // ============================================
    static async getUsers(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { page = 1, limit = 20, search, planId, role, status, dateFrom, dateTo, sortBy = 'createdAt', sortOrder = 'desc', } = req.query;
            const result = await admin_service_1.AdminService.getUsers({
                page: parseInt(page),
                limit: parseInt(limit),
                search: search,
                planId: planId,
                role: role,
                status: status,
                dateFrom: dateFrom,
                dateTo: dateTo,
                sortBy: sortBy,
                sortOrder: sortOrder,
            });
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get users');
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve users',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async getUserById(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { userId } = req.params;
            const user = await admin_service_1.AdminService.getUserById(userId);
            if (!user) {
                res.status(404).json({
                    success: false,
                    error: 'User not found',
                    code: 'NOT_FOUND',
                });
                return;
            }
            res.json({
                success: true,
                data: user,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.params.userId }, 'Failed to get user');
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve user',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async updateUser(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { userId } = req.params;
            const { name, planId, role, isActive, metadata } = req.body;
            const user = await admin_service_1.AdminService.updateUser(userId, {
                name,
                planId,
                role,
                isActive,
                metadata,
            });
            res.json({
                success: true,
                data: user,
                message: 'User updated successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.params.userId }, 'Failed to update user');
            res.status(500).json({
                success: false,
                error: 'Failed to update user',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async suspendUser(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { userId } = req.params;
            const { reason } = req.body;
            await admin_service_1.AdminService.suspendUser(userId, reason);
            res.json({
                success: true,
                message: 'User suspended successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.params.userId }, 'Failed to suspend user');
            res.status(500).json({
                success: false,
                error: 'Failed to suspend user',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async activateUser(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { userId } = req.params;
            await admin_service_1.AdminService.activateUser(userId);
            res.json({
                success: true,
                message: 'User activated successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.params.userId }, 'Failed to activate user');
            res.status(500).json({
                success: false,
                error: 'Failed to activate user',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async deleteUser(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { userId } = req.params;
            await admin_service_1.AdminService.deleteUser(userId);
            res.json({
                success: true,
                message: 'User deleted successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.params.userId }, 'Failed to delete user');
            res.status(500).json({
                success: false,
                error: 'Failed to delete user',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async impersonateUser(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { userId } = req.params;
            const token = await admin_service_1.AdminService.impersonateUser(userId);
            res.json({
                success: true,
                data: { token },
                message: 'Impersonation token generated',
            });
        }
        catch (error) {
            logger_1.logger.error({ error, userId: req.params.userId }, 'Failed to impersonate user');
            res.status(500).json({
                success: false,
                error: 'Failed to impersonate user',
                code: 'ADMIN_ERROR',
            });
        }
    }
    // ============================================
    // Platform Metrics
    // ============================================
    static async getPlatformMetrics(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const metrics = await admin_service_1.AdminService.getPlatformMetrics();
            res.json({
                success: true,
                data: metrics,
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get platform metrics');
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve platform metrics',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async getRevenueMetrics(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { period = 'month' } = req.query;
            const metrics = await admin_service_1.AdminService.getRevenueMetrics(period);
            res.json({
                success: true,
                data: metrics,
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get revenue metrics');
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve revenue metrics',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async getUsageMetrics(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { period = 'month' } = req.query;
            const metrics = await admin_service_1.AdminService.getUsageMetrics(period);
            res.json({
                success: true,
                data: metrics,
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get usage metrics');
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve usage metrics',
                code: 'ADMIN_ERROR',
            });
        }
    }
    // ============================================
    // Audit Logs
    // ============================================
    static async getAuditLogs(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { page = 1, limit = 50, userId, action, entityType, dateFrom, dateTo, } = req.query;
            const result = await admin_service_1.AdminService.getAuditLogs({
                page: parseInt(page),
                limit: parseInt(limit),
                userId: userId,
                action: action,
                entityType: entityType,
                dateFrom: dateFrom,
                dateTo: dateTo,
            });
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get audit logs');
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve audit logs',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async exportAuditLogs(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { dateFrom, dateTo, format = 'csv' } = req.query;
            const blob = await admin_service_1.AdminService.exportAuditLogs(dateFrom, dateTo, format);
            const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
            res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.send(blob);
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to export audit logs');
            res.status(500).json({
                success: false,
                error: 'Failed to export audit logs',
                code: 'ADMIN_ERROR',
            });
        }
    }
    // ============================================
    // Support Tickets
    // ============================================
    static async getTickets(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { page = 1, limit = 20, status, priority, assignedTo, } = req.query;
            const result = await admin_service_1.AdminService.getTickets({
                page: parseInt(page),
                limit: parseInt(limit),
                status: status,
                priority: priority,
                assignedTo: assignedTo,
            });
            res.json({
                success: true,
                data: result,
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get tickets');
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve tickets',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async getTicketById(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { ticketId } = req.params;
            const ticket = await admin_service_1.AdminService.getTicketById(ticketId);
            if (!ticket) {
                res.status(404).json({
                    success: false,
                    error: 'Ticket not found',
                    code: 'NOT_FOUND',
                });
                return;
            }
            res.json({
                success: true,
                data: ticket,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, ticketId: req.params.ticketId }, 'Failed to get ticket');
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve ticket',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async updateTicketStatus(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { ticketId } = req.params;
            const { status } = req.body;
            const ticket = await admin_service_1.AdminService.updateTicketStatus(ticketId, status);
            res.json({
                success: true,
                data: ticket,
                message: 'Ticket status updated',
            });
        }
        catch (error) {
            logger_1.logger.error({ error, ticketId: req.params.ticketId }, 'Failed to update ticket status');
            res.status(500).json({
                success: false,
                error: 'Failed to update ticket status',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async assignTicket(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { ticketId } = req.params;
            const { adminId } = req.body;
            const ticket = await admin_service_1.AdminService.assignTicket(ticketId, adminId);
            res.json({
                success: true,
                data: ticket,
                message: 'Ticket assigned successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error, ticketId: req.params.ticketId }, 'Failed to assign ticket');
            res.status(500).json({
                success: false,
                error: 'Failed to assign ticket',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async addTicketMessage(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { ticketId } = req.params;
            const { message, isAdmin = true } = req.body;
            const ticketMessage = await admin_service_1.AdminService.addTicketMessage(ticketId, message, isAdmin);
            res.json({
                success: true,
                data: ticketMessage,
                message: 'Message added successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error, ticketId: req.params.ticketId }, 'Failed to add ticket message');
            res.status(500).json({
                success: false,
                error: 'Failed to add message',
                code: 'ADMIN_ERROR',
            });
        }
    }
    // ============================================
    // Announcements
    // ============================================
    static async getAnnouncements(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { activeOnly = 'false' } = req.query;
            const announcements = await admin_service_1.AdminService.getAnnouncements(activeOnly === 'true');
            res.json({
                success: true,
                data: announcements,
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get announcements');
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve announcements',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async createAnnouncement(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { title, content, type, isActive, startDate, endDate } = req.body;
            const announcement = await admin_service_1.AdminService.createAnnouncement({
                title,
                content,
                type,
                isActive,
                startDate: startDate ? new Date(startDate) : new Date(),
                endDate: endDate ? new Date(endDate) : null,
                createdBy: req.user.id,
            });
            res.json({
                success: true,
                data: announcement,
                message: 'Announcement created successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to create announcement');
            res.status(500).json({
                success: false,
                error: 'Failed to create announcement',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async updateAnnouncement(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { id } = req.params;
            const { title, content, type, isActive, startDate, endDate } = req.body;
            const announcement = await admin_service_1.AdminService.updateAnnouncement(id, {
                title,
                content,
                type,
                isActive,
                startDate: startDate ? new Date(startDate) : undefined,
                endDate: endDate ? new Date(endDate) : null,
            });
            res.json({
                success: true,
                data: announcement,
                message: 'Announcement updated successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error, id: req.params.id }, 'Failed to update announcement');
            res.status(500).json({
                success: false,
                error: 'Failed to update announcement',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async deleteAnnouncement(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { id } = req.params;
            await admin_service_1.AdminService.deleteAnnouncement(id);
            res.json({
                success: true,
                message: 'Announcement deleted successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error, id: req.params.id }, 'Failed to delete announcement');
            res.status(500).json({
                success: false,
                error: 'Failed to delete announcement',
                code: 'ADMIN_ERROR',
            });
        }
    }
    // ============================================
    // System Settings
    // ============================================
    static async getSystemSettings(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const settings = await admin_service_1.AdminService.getSystemSettings();
            res.json({
                success: true,
                data: settings,
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get system settings');
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve system settings',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async updateSystemSettings(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const settings = req.body;
            const updated = await admin_service_1.AdminService.updateSystemSettings(settings);
            res.json({
                success: true,
                data: updated,
                message: 'System settings updated successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to update system settings');
            res.status(500).json({
                success: false,
                error: 'Failed to update system settings',
                code: 'ADMIN_ERROR',
            });
        }
    }
    // ============================================
    // System Health
    // ============================================
    static async getSystemHealth(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const health = await admin_service_1.AdminService.getSystemHealth();
            res.json({
                success: true,
                data: health,
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get system health');
            res.status(500).json({
                success: false,
                error: 'Failed to retrieve system health',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async clearCache(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            await admin_service_1.AdminService.clearCache();
            res.json({
                success: true,
                message: 'Cache cleared successfully',
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to clear cache');
            res.status(500).json({
                success: false,
                error: 'Failed to clear cache',
                code: 'ADMIN_ERROR',
            });
        }
    }
    static async toggleMaintenance(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { enabled, message } = req.body;
            await admin_service_1.AdminService.toggleMaintenance(enabled, message);
            res.json({
                success: true,
                message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
            });
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to toggle maintenance mode');
            res.status(500).json({
                success: false,
                error: 'Failed to toggle maintenance mode',
                code: 'ADMIN_ERROR',
            });
        }
    }
    // ============================================
    // Export
    // ============================================
    static async exportUsers(req, res) {
        try {
            if (req.user?.role !== 'ADMIN') {
                res.status(403).json({
                    success: false,
                    error: 'Admin access required',
                    code: 'FORBIDDEN',
                });
                return;
            }
            const { search, planId, role, status } = req.query;
            const csv = await admin_service_1.AdminService.exportUsers({
                search: search,
                planId: planId,
                role: role,
                status: status,
            });
            const filename = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
            res.send(csv);
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to export users');
            res.status(500).json({
                success: false,
                error: 'Failed to export users',
                code: 'ADMIN_ERROR',
            });
        }
    }
}
exports.AdminController = AdminController;
//# sourceMappingURL=admin.controller.js.map