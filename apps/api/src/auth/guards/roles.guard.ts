// enterprise-ai-agent-platform/apps/api/src/auth/guards/roles.guard.ts
import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './jwt-auth.guard';
import { logger } from '../../utils/logger';

// ============================================
// Permission Hierarchy & Definitions
// ============================================

export enum Permission {
  // User Management
  USER_READ = 'user:read',
  USER_READ_SELF = 'user:read:self',
  USER_WRITE = 'user:write',
  USER_WRITE_SELF = 'user:write:self',
  USER_DELETE = 'user:delete',
  USER_IMPERSONATE = 'user:impersonate',
  USER_EXPORT = 'user:export',
  
  // Agent Access
  AGENT_EMAIL_READ = 'agent:email:read',
  AGENT_EMAIL_SEND = 'agent:email:send',
  AGENT_EMAIL_DELETE = 'agent:email:delete',
  AGENT_EMAIL_ADMIN = 'agent:email:admin',
  
  AGENT_DRIVE_READ = 'agent:drive:read',
  AGENT_DRIVE_WRITE = 'agent:drive:write',
  AGENT_DRIVE_DELETE = 'agent:drive:delete',
  AGENT_DRIVE_SHARE = 'agent:drive:share',
  AGENT_DRIVE_ADMIN = 'agent:drive:admin',
  
  AGENT_CONTENT_TEXT = 'agent:content:text',
  AGENT_CONTENT_IMAGE = 'agent:content:image',
  AGENT_CONTENT_VIDEO = 'agent:content:video',
  AGENT_CONTENT_ADMIN = 'agent:content:admin',
  
  AGENT_SOCIAL_POST = 'agent:social:post',
  AGENT_SOCIAL_SCHEDULE = 'agent:social:schedule',
  AGENT_SOCIAL_ANALYTICS = 'agent:social:analytics',
  AGENT_SOCIAL_ADMIN = 'agent:social:admin',
  
  AGENT_CALENDAR_READ = 'agent:calendar:read',
  AGENT_CALENDAR_WRITE = 'agent:calendar:write',
  AGENT_CALENDAR_ADMIN = 'agent:calendar:admin',
  
  AGENT_WEB_SEARCH = 'agent:web:search',
  AGENT_WEB_RESEARCH = 'agent:web:research',
  AGENT_WEB_ADMIN = 'agent:web:admin',
  
  AGENT_TASK_READ = 'agent:task:read',
  AGENT_TASK_WRITE = 'agent:task:write',
  AGENT_TASK_ADMIN = 'agent:task:admin',
  
  // Billing
  BILLING_READ = 'billing:read',
  BILLING_READ_SELF = 'billing:read:self',
  BILLING_WRITE = 'billing:write',
  BILLING_ADMIN = 'billing:admin',
  BILLING_EXPORT = 'billing:export',
  
  // Analytics
  ANALYTICS_READ = 'analytics:read',
  ANALYTICS_READ_SELF = 'analytics:read:self',
  ANALYTICS_EXPORT = 'analytics:export',
  ANALYTICS_ADMIN = 'analytics:admin',
  
  // Admin
  ADMIN_READ = 'admin:read',
  ADMIN_WRITE = 'admin:write',
  ADMIN_USERS = 'admin:users',
  ADMIN_REVENUE = 'admin:revenue',
  ADMIN_SYSTEM = 'admin:system',
  ADMIN_AUDIT = 'admin:audit',
  ADMIN_SETTINGS = 'admin:settings',
  
  // API
  API_ACCESS = 'api:access',
  API_KEY_READ = 'api:key:read',
  API_KEY_WRITE = 'api:key:write',
  API_KEY_ADMIN = 'api:key:admin',
  API_KEY_MANAGE = 'api:key:manage',
  
  // System
  SYSTEM_HEALTH = 'system:health',
  SYSTEM_METRICS = 'system:metrics',
  SYSTEM_LOGS = 'system:logs',
  SYSTEM_CONFIG = 'system:config',
}

// ============================================
// Role Hierarchy
// ============================================

interface RoleDefinition {
  name: string;
  inherits: string[];
  permissions: Permission[];
  restrictions: string[];
}

const ROLE_DEFINITIONS: Record<string, RoleDefinition> = {
  USER: {
    name: 'User',
    inherits: [],
    permissions: [
      Permission.USER_READ_SELF,
      Permission.USER_WRITE_SELF,
      Permission.AGENT_EMAIL_READ,
      Permission.AGENT_EMAIL_SEND,
      Permission.AGENT_CALENDAR_READ,
      Permission.AGENT_CALENDAR_WRITE,
      Permission.AGENT_WEB_SEARCH,
      Permission.AGENT_WEB_RESEARCH,
      Permission.BILLING_READ_SELF,
      Permission.ANALYTICS_READ_SELF,
      Permission.API_ACCESS,
      Permission.API_KEY_READ,
    ],
    restrictions: [
      'Cannot access other users data',
      'Cannot access admin functions',
      'Limited to own resources',
    ],
  },
  SUPPORT: {
    name: 'Support',
    inherits: ['USER'],
    permissions: [
      Permission.USER_READ,
      Permission.AGENT_EMAIL_ADMIN,
      Permission.AGENT_DRIVE_READ,
      Permission.AGENT_CONTENT_TEXT,
      Permission.AGENT_SOCIAL_POST,
      Permission.AGENT_TASK_READ,
      Permission.ANALYTICS_READ,
      Permission.SYSTEM_HEALTH,
    ],
    restrictions: [
      'Cannot modify user data',
      'Cannot access billing admin',
      'Cannot modify system settings',
    ],
  },
  ADMIN: {
    name: 'Admin',
    inherits: ['SUPPORT'],
    permissions: [
      // All permissions
      ...Object.values(Permission),
    ],
    restrictions: [],
  },
};

// ============================================
// Plan-Based Permission Overrides
// ============================================

interface PlanPermissions {
  planId: string;
  additionalPermissions: Permission[];
  revokedPermissions: Permission[];
}

const PLAN_PERMISSIONS: PlanPermissions[] = [
  {
    planId: 'FREE',
    additionalPermissions: [],
    revokedPermissions: [
      Permission.AGENT_DRIVE_READ,
      Permission.AGENT_DRIVE_WRITE,
      Permission.AGENT_CONTENT_IMAGE,
      Permission.AGENT_CONTENT_VIDEO,
      Permission.AGENT_SOCIAL_POST,
      Permission.AGENT_TASK_READ,
      Permission.AGENT_TASK_WRITE,
      Permission.API_KEY_WRITE,
    ],
  },
  {
    planId: 'STARTER',
    additionalPermissions: [
      Permission.AGENT_DRIVE_READ,
      Permission.AGENT_DRIVE_WRITE,
      Permission.AGENT_SOCIAL_POST,
      Permission.AGENT_TASK_READ,
      Permission.AGENT_TASK_WRITE,
    ],
    revokedPermissions: [
      Permission.AGENT_CONTENT_IMAGE,
      Permission.AGENT_CONTENT_VIDEO,
      Permission.AGENT_SOCIAL_ANALYTICS,
    ],
  },
  {
    planId: 'PROFESSIONAL',
    additionalPermissions: [
      Permission.AGENT_DRIVE_READ,
      Permission.AGENT_DRIVE_WRITE,
      Permission.AGENT_DRIVE_SHARE,
      Permission.AGENT_CONTENT_TEXT,
      Permission.AGENT_CONTENT_IMAGE,
      Permission.AGENT_SOCIAL_POST,
      Permission.AGENT_SOCIAL_SCHEDULE,
      Permission.AGENT_SOCIAL_ANALYTICS,
      Permission.AGENT_TASK_READ,
      Permission.AGENT_TASK_WRITE,
      Permission.API_KEY_WRITE,
      Permission.API_KEY_MANAGE,
    ],
    revokedPermissions: [
      Permission.AGENT_CONTENT_VIDEO,
      Permission.SYSTEM_CONFIG,
    ],
  },
  {
    planId: 'ENTERPRISE',
    additionalPermissions: Object.values(Permission).filter(
      p => !p.includes(':admin') && !p.includes('system:')
    ),
    revokedPermissions: [],
  },
];

// ============================================
// Roles Guard Class
// ============================================

export class RolesGuard {
  /**
   * Get all permissions for a role (including inherited)
   */
  static getRolePermissions(role: string): Permission[] {
    const roleDef = ROLE_DEFINITIONS[role];
    if (!roleDef) return [];

    const permissions = new Set<Permission>(roleDef.permissions);

    // Add inherited permissions
    for (const inheritedRole of roleDef.inherits) {
      const inheritedPermissions = this.getRolePermissions(inheritedRole);
      inheritedPermissions.forEach(p => permissions.add(p));
    }

    return Array.from(permissions);
  }

  /**
   * Get all permissions for a user (role + plan overrides)
   */
  static getUserPermissions(role: string, planId: string): Permission[] {
    const rolePermissions = this.getRolePermissions(role);
    const permissions = new Set<Permission>(rolePermissions);

    // Apply plan overrides
    const planOverride = PLAN_PERMISSIONS.find(p => p.planId === planId);
    if (planOverride) {
      // Add plan-specific permissions
      planOverride.additionalPermissions.forEach(p => permissions.add(p));
      
      // Remove plan-revoked permissions
      planOverride.revokedPermissions.forEach(p => permissions.delete(p));
    }

    return Array.from(permissions);
  }

  /**
   * Check if user has specific permission
   */
  static hasPermission(userPermissions: Permission[], requiredPermission: Permission): boolean {
    // Wildcard check
    if (userPermissions.includes(requiredPermission)) return true;

    // Check parent permission (e.g., "user:*" grants "user:read")
    const [resource, action] = requiredPermission.split(':');
    
    for (const perm of userPermissions) {
      const [permResource, permAction] = perm.split(':');
      
      // Same resource with wildcard action
      if (permResource === resource && permAction === '*') return true;
      
      // Wildcard resource
      if (permResource === '*' && permAction === '*') return true;
      
      // Specific wildcard match (e.g., "user:*:read" for "user:profile:read")
      if (requiredPermission.startsWith(perm.replace(/\*/g, ''))) return true;
    }

    return false;
  }

  /**
   * Check if user has all required permissions
   */
  static hasAllPermissions(userPermissions: Permission[], requiredPermissions: Permission[]): {
    hasAll: boolean;
    missing: Permission[];
  } {
    const missing: Permission[] = [];
    
    for (const perm of requiredPermissions) {
      if (!this.hasPermission(userPermissions, perm)) {
        missing.push(perm);
      }
    }

    return { hasAll: missing.length === 0, missing };
  }

  /**
   * Check if user has any of the required permissions
   */
  static hasAnyPermission(userPermissions: Permission[], requiredPermissions: Permission[]): {
    hasAny: boolean;
    matched: Permission[];
  } {
    const matched: Permission[] = [];
    
    for (const perm of requiredPermissions) {
      if (this.hasPermission(userPermissions, perm)) {
        matched.push(perm);
      }
    }

    return { hasAny: matched.length > 0, matched };
  }

  /**
   * Middleware to require specific permission
   */
  static requirePermission(permission: Permission) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const userPermissions = this.getUserPermissions(req.user.role, req.user.planId);
      const hasAccess = this.hasPermission(userPermissions, permission);

      if (!hasAccess) {
        logger.warn({
          userId: req.user.id,
          userRole: req.user.role,
          userPlan: req.user.planId,
          requiredPermission: permission,
          path: req.path,
          method: req.method,
        }, 'Permission denied');

        res.status(403).json({
          success: false,
          error: `Missing required permission: ${permission}`,
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermission: permission,
          userRole: req.user.role,
          userPlan: req.user.planId,
        });
        return;
      }

      next();
    };
  }

  /**
   * Middleware to require all specified permissions
   */
  static requireAllPermissions(permissions: Permission[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const userPermissions = this.getUserPermissions(req.user.role, req.user.planId);
      const { hasAll, missing } = this.hasAllPermissions(userPermissions, permissions);

      if (!hasAll) {
        logger.warn({
          userId: req.user.id,
          userRole: req.user.role,
          missingPermissions: missing,
          path: req.path,
        }, 'All permissions required - denied');

        res.status(403).json({
          success: false,
          error: 'Missing required permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermissions: permissions,
          missingPermissions: missing,
        });
        return;
      }

      next();
    };
  }

  /**
   * Middleware to require any of the specified permissions
   */
  static requireAnyPermission(permissions: Permission[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const userPermissions = this.getUserPermissions(req.user.role, req.user.planId);
      const { hasAny } = this.hasAnyPermission(userPermissions, permissions);

      if (!hasAny) {
        res.status(403).json({
          success: false,
          error: 'Missing required permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermissions: permissions,
        });
        return;
      }

      next();
    };
  }

  /**
   * Middleware to require specific role
   */
  static requireRole(roles: string | string[]) {
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn({
          userId: req.user.id,
          userRole: req.user.role,
          requiredRoles: allowedRoles,
          path: req.path,
        }, 'Role check failed');

        res.status(403).json({
          success: false,
          error: 'Insufficient role permissions',
          code: 'FORBIDDEN',
          requiredRoles: allowedRoles,
          currentRole: req.user.role,
        });
        return;
      }

      next();
    };
  }

  /**
   * Middleware for admin-only routes
   */
  static requireAdmin() {
    return this.requireRole('ADMIN');
  }

  /**
   * Middleware for support or admin routes
   */
  static requireSupportOrAdmin() {
    return this.requireRole(['ADMIN', 'SUPPORT']);
  }

  /**
   * Check resource ownership or admin access
   */
  static requireOwnershipOrAdmin(resourceOwnerIdExtractor: (req: Request) => string | undefined) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED',
        });
        return;
      }

      const resourceOwnerId = resourceOwnerIdExtractor(req);

      // Admin can access any resource
      if (req.user.role === 'ADMIN') {
        next();
        return;
      }

      // Support can read any resource
      if (req.user.role === 'SUPPORT' && req.method === 'GET') {
        next();
        return;
      }

      // User can only access their own resources
      if (resourceOwnerId && req.user.id === resourceOwnerId) {
        next();
        return;
      }

      res.status(403).json({
        success: false,
        error: 'You do not have permission to access this resource',
        code: 'FORBIDDEN',
      });
    };
  }

  /**
   * Get all available permissions for documentation
   */
  static getAllPermissions(): Permission[] {
    return Object.values(Permission);
  }

  /**
   * Get all role definitions
   */
  static getAllRoles(): Record<string, RoleDefinition> {
    return { ...ROLE_DEFINITIONS };
  }

  /**
   * Get permissions grouped by category
   */
  static getPermissionsByCategory(): Record<string, Permission[]> {
    const categories: Record<string, Permission[]> = {};
    
    for (const perm of Object.values(Permission)) {
      const category = perm.split(':')[0];
      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(perm);
    }

    return categories;
  }
}

// Export middleware wrappers
export const requirePermission = (permission: Permission) => RolesGuard.requirePermission(permission);
export const requireAllPermissions = (permissions: Permission[]) => RolesGuard.requireAllPermissions(permissions);
export const requireAnyPermission = (permissions: Permission[]) => RolesGuard.requireAnyPermission(permissions);
export const requireRole = (roles: string | string[]) => RolesGuard.requireRole(roles);
export const requireAdmin = RolesGuard.requireAdmin();
export const requireSupportOrAdmin = RolesGuard.requireSupportOrAdmin();

// Export permission enum for use in routes
export { Permission as SystemPermission };