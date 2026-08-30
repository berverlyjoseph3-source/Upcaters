// enterprise-ai-agent-platform/apps/api/src/controllers/admin.controller.ts
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/plan-gate.middleware';
import { AdminService } from '../services/admin.service';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

export class AdminController {
  // ============================================
  // User Management
  // ============================================

  static async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      const {
        page = 1,
        limit = 20,
        search,
        planId,
        role,
        status,
        dateFrom,
        dateTo,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = req.query;

      const result = await AdminService.getUsers({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        search: search as string,
        planId: planId as string,
        role: role as any,
        status: status as any,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get users');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve users',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async getUserById(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const user = await AdminService.getUserById(userId);

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
    } catch (error) {
      logger.error({ error, userId: req.params.userId }, 'Failed to get user');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async updateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const user = await AdminService.updateUser(userId, {
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
    } catch (error) {
      logger.error({ error, userId: req.params.userId }, 'Failed to update user');
      res.status(500).json({
        success: false,
        error: 'Failed to update user',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async suspendUser(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      await AdminService.suspendUser(userId, reason);

      res.json({
        success: true,
        message: 'User suspended successfully',
      });
    } catch (error) {
      logger.error({ error, userId: req.params.userId }, 'Failed to suspend user');
      res.status(500).json({
        success: false,
        error: 'Failed to suspend user',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async activateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      await AdminService.activateUser(userId);

      res.json({
        success: true,
        message: 'User activated successfully',
      });
    } catch (error) {
      logger.error({ error, userId: req.params.userId }, 'Failed to activate user');
      res.status(500).json({
        success: false,
        error: 'Failed to activate user',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      await AdminService.deleteUser(userId);

      res.json({
        success: true,
        message: 'User deleted successfully',
      });
    } catch (error) {
      logger.error({ error, userId: req.params.userId }, 'Failed to delete user');
      res.status(500).json({
        success: false,
        error: 'Failed to delete user',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async impersonateUser(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const token = await AdminService.impersonateUser(userId);

      res.json({
        success: true,
        data: { token },
        message: 'Impersonation token generated',
      });
    } catch (error) {
      logger.error({ error, userId: req.params.userId }, 'Failed to impersonate user');
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

  static async getPlatformMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      const metrics = await AdminService.getPlatformMetrics();

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get platform metrics');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve platform metrics',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async getRevenueMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const metrics = await AdminService.getRevenueMetrics(period as string);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get revenue metrics');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve revenue metrics',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async getUsageMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const metrics = await AdminService.getUsageMetrics(period as string);

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get usage metrics');
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

  static async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      const {
        page = 1,
        limit = 50,
        userId,
        action,
        entityType,
        dateFrom,
        dateTo,
      } = req.query;

      const result = await AdminService.getAuditLogs({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        userId: userId as string,
        action: action as string,
        entityType: entityType as string,
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get audit logs');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit logs',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async exportAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const blob = await AdminService.exportAuditLogs(
        dateFrom as string,
        dateTo as string,
        format as 'csv' | 'json'
      );

      const filename = `audit_logs_${new Date().toISOString().split('T')[0]}.${format}`;
      res.setHeader('Content-Type', format === 'csv' ? 'text/csv' : 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(blob);
    } catch (error) {
      logger.error({ error }, 'Failed to export audit logs');
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

  static async getTickets(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      const {
        page = 1,
        limit = 20,
        status,
        priority,
        assignedTo,
      } = req.query;

      const result = await AdminService.getTickets({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        status: status as any,
        priority: priority as any,
        assignedTo: assignedTo as string,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get tickets');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve tickets',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async getTicketById(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const ticket = await AdminService.getTicketById(ticketId);

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
    } catch (error) {
      logger.error({ error, ticketId: req.params.ticketId }, 'Failed to get ticket');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve ticket',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async updateTicketStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const ticket = await AdminService.updateTicketStatus(ticketId, status);

      res.json({
        success: true,
        data: ticket,
        message: 'Ticket status updated',
      });
    } catch (error) {
      logger.error({ error, ticketId: req.params.ticketId }, 'Failed to update ticket status');
      res.status(500).json({
        success: false,
        error: 'Failed to update ticket status',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async assignTicket(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const ticket = await AdminService.assignTicket(ticketId, adminId);

      res.json({
        success: true,
        data: ticket,
        message: 'Ticket assigned successfully',
      });
    } catch (error) {
      logger.error({ error, ticketId: req.params.ticketId }, 'Failed to assign ticket');
      res.status(500).json({
        success: false,
        error: 'Failed to assign ticket',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async addTicketMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const ticketMessage = await AdminService.addTicketMessage(ticketId, message, isAdmin);

      res.json({
        success: true,
        data: ticketMessage,
        message: 'Message added successfully',
      });
    } catch (error) {
      logger.error({ error, ticketId: req.params.ticketId }, 'Failed to add ticket message');
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

  static async getAnnouncements(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const announcements = await AdminService.getAnnouncements(activeOnly === 'true');

      res.json({
        success: true,
        data: announcements,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get announcements');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve announcements',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async createAnnouncement(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const announcement = await AdminService.createAnnouncement({
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
    } catch (error) {
      logger.error({ error }, 'Failed to create announcement');
      res.status(500).json({
        success: false,
        error: 'Failed to create announcement',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async updateAnnouncement(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      const announcement = await AdminService.updateAnnouncement(id, {
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
    } catch (error) {
      logger.error({ error, id: req.params.id }, 'Failed to update announcement');
      res.status(500).json({
        success: false,
        error: 'Failed to update announcement',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async deleteAnnouncement(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      await AdminService.deleteAnnouncement(id);

      res.json({
        success: true,
        message: 'Announcement deleted successfully',
      });
    } catch (error) {
      logger.error({ error, id: req.params.id }, 'Failed to delete announcement');
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

  static async getSystemSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      const settings = await AdminService.getSystemSettings();

      res.json({
        success: true,
        data: settings,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get system settings');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system settings',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async updateSystemSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const updated = await AdminService.updateSystemSettings(settings);

      res.json({
        success: true,
        data: updated,
        message: 'System settings updated successfully',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to update system settings');
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

  static async getSystemHealth(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      const health = await AdminService.getSystemHealth();

      res.json({
        success: true,
        data: health,
      });
    } catch (error) {
      logger.error({ error }, 'Failed to get system health');
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve system health',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async clearCache(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (req.user?.role !== 'ADMIN') {
        res.status(403).json({
          success: false,
          error: 'Admin access required',
          code: 'FORBIDDEN',
        });
        return;
      }

      await AdminService.clearCache();

      res.json({
        success: true,
        message: 'Cache cleared successfully',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to clear cache');
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
        code: 'ADMIN_ERROR',
      });
    }
  }

  static async toggleMaintenance(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      await AdminService.toggleMaintenance(enabled, message);

      res.json({
        success: true,
        message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
      });
    } catch (error) {
      logger.error({ error }, 'Failed to toggle maintenance mode');
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

  static async exportUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      const csv = await AdminService.exportUsers({
        search: search as string,
        planId: planId as string,
        role: role as any,
        status: status as any,
      });

      const filename = `users_export_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
      res.send(csv);
    } catch (error) {
      logger.error({ error }, 'Failed to export users');
      res.status(500).json({
        success: false,
        error: 'Failed to export users',
        code: 'ADMIN_ERROR',
      });
    }
  }
}