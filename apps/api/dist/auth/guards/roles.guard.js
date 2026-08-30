"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemPermission = exports.requireSupportOrAdmin = exports.requireAdmin = exports.requireRole = exports.requireAnyPermission = exports.requireAllPermissions = exports.requirePermission = exports.RolesGuard = exports.Permission = void 0;
const logger_1 = require("../../utils/logger");
// ============================================
// Permission Hierarchy & Definitions
// ============================================
var Permission;
(function (Permission) {
    // User Management
    Permission["USER_READ"] = "user:read";
    Permission["USER_READ_SELF"] = "user:read:self";
    Permission["USER_WRITE"] = "user:write";
    Permission["USER_WRITE_SELF"] = "user:write:self";
    Permission["USER_DELETE"] = "user:delete";
    Permission["USER_IMPERSONATE"] = "user:impersonate";
    Permission["USER_EXPORT"] = "user:export";
    // Agent Access
    Permission["AGENT_EMAIL_READ"] = "agent:email:read";
    Permission["AGENT_EMAIL_SEND"] = "agent:email:send";
    Permission["AGENT_EMAIL_DELETE"] = "agent:email:delete";
    Permission["AGENT_EMAIL_ADMIN"] = "agent:email:admin";
    Permission["AGENT_DRIVE_READ"] = "agent:drive:read";
    Permission["AGENT_DRIVE_WRITE"] = "agent:drive:write";
    Permission["AGENT_DRIVE_DELETE"] = "agent:drive:delete";
    Permission["AGENT_DRIVE_SHARE"] = "agent:drive:share";
    Permission["AGENT_DRIVE_ADMIN"] = "agent:drive:admin";
    Permission["AGENT_CONTENT_TEXT"] = "agent:content:text";
    Permission["AGENT_CONTENT_IMAGE"] = "agent:content:image";
    Permission["AGENT_CONTENT_VIDEO"] = "agent:content:video";
    Permission["AGENT_CONTENT_ADMIN"] = "agent:content:admin";
    Permission["AGENT_SOCIAL_POST"] = "agent:social:post";
    Permission["AGENT_SOCIAL_SCHEDULE"] = "agent:social:schedule";
    Permission["AGENT_SOCIAL_ANALYTICS"] = "agent:social:analytics";
    Permission["AGENT_SOCIAL_ADMIN"] = "agent:social:admin";
    Permission["AGENT_CALENDAR_READ"] = "agent:calendar:read";
    Permission["AGENT_CALENDAR_WRITE"] = "agent:calendar:write";
    Permission["AGENT_CALENDAR_ADMIN"] = "agent:calendar:admin";
    Permission["AGENT_WEB_SEARCH"] = "agent:web:search";
    Permission["AGENT_WEB_RESEARCH"] = "agent:web:research";
    Permission["AGENT_WEB_ADMIN"] = "agent:web:admin";
    Permission["AGENT_TASK_READ"] = "agent:task:read";
    Permission["AGENT_TASK_WRITE"] = "agent:task:write";
    Permission["AGENT_TASK_ADMIN"] = "agent:task:admin";
    // Billing
    Permission["BILLING_READ"] = "billing:read";
    Permission["BILLING_READ_SELF"] = "billing:read:self";
    Permission["BILLING_WRITE"] = "billing:write";
    Permission["BILLING_ADMIN"] = "billing:admin";
    Permission["BILLING_EXPORT"] = "billing:export";
    // Analytics
    Permission["ANALYTICS_READ"] = "analytics:read";
    Permission["ANALYTICS_READ_SELF"] = "analytics:read:self";
    Permission["ANALYTICS_EXPORT"] = "analytics:export";
    Permission["ANALYTICS_ADMIN"] = "analytics:admin";
    // Admin
    Permission["ADMIN_READ"] = "admin:read";
    Permission["ADMIN_WRITE"] = "admin:write";
    Permission["ADMIN_USERS"] = "admin:users";
    Permission["ADMIN_REVENUE"] = "admin:revenue";
    Permission["ADMIN_SYSTEM"] = "admin:system";
    Permission["ADMIN_AUDIT"] = "admin:audit";
    Permission["ADMIN_SETTINGS"] = "admin:settings";
    // API
    Permission["API_ACCESS"] = "api:access";
    Permission["API_KEY_READ"] = "api:key:read";
    Permission["API_KEY_WRITE"] = "api:key:write";
    Permission["API_KEY_ADMIN"] = "api:key:admin";
    Permission["API_KEY_MANAGE"] = "api:key:manage";
    // System
    Permission["SYSTEM_HEALTH"] = "system:health";
    Permission["SYSTEM_METRICS"] = "system:metrics";
    Permission["SYSTEM_LOGS"] = "system:logs";
    Permission["SYSTEM_CONFIG"] = "system:config";
})(Permission || (exports.SystemPermission = exports.Permission = Permission = {}));
const ROLE_DEFINITIONS = {
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
const PLAN_PERMISSIONS = [
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
        additionalPermissions: Object.values(Permission).filter(p => !p.includes(':admin') && !p.includes('system:')),
        revokedPermissions: [],
    },
];
// ============================================
// Roles Guard Class
// ============================================
class RolesGuard {
    /**
     * Get all permissions for a role (including inherited)
     */
    static getRolePermissions(role) {
        const roleDef = ROLE_DEFINITIONS[role];
        if (!roleDef)
            return [];
        const permissions = new Set(roleDef.permissions);
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
    static getUserPermissions(role, planId) {
        const rolePermissions = this.getRolePermissions(role);
        const permissions = new Set(rolePermissions);
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
    static hasPermission(userPermissions, requiredPermission) {
        // Wildcard check
        if (userPermissions.includes(requiredPermission))
            return true;
        // Check parent permission (e.g., "user:*" grants "user:read")
        const [resource, action] = requiredPermission.split(':');
        for (const perm of userPermissions) {
            const [permResource, permAction] = perm.split(':');
            // Same resource with wildcard action
            if (permResource === resource && permAction === '*')
                return true;
            // Wildcard resource
            if (permResource === '*' && permAction === '*')
                return true;
            // Specific wildcard match (e.g., "user:*:read" for "user:profile:read")
            if (requiredPermission.startsWith(perm.replace(/\*/g, '')))
                return true;
        }
        return false;
    }
    /**
     * Check if user has all required permissions
     */
    static hasAllPermissions(userPermissions, requiredPermissions) {
        const missing = [];
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
    static hasAnyPermission(userPermissions, requiredPermissions) {
        const matched = [];
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
    static requirePermission(permission) {
        return (req, res, next) => {
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
                logger_1.logger.warn({
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
    static requireAllPermissions(permissions) {
        return (req, res, next) => {
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
                logger_1.logger.warn({
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
    static requireAnyPermission(permissions) {
        return (req, res, next) => {
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
    static requireRole(roles) {
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        return (req, res, next) => {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED',
                });
                return;
            }
            if (!allowedRoles.includes(req.user.role)) {
                logger_1.logger.warn({
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
    static requireOwnershipOrAdmin(resourceOwnerIdExtractor) {
        return (req, res, next) => {
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
    static getAllPermissions() {
        return Object.values(Permission);
    }
    /**
     * Get all role definitions
     */
    static getAllRoles() {
        return { ...ROLE_DEFINITIONS };
    }
    /**
     * Get permissions grouped by category
     */
    static getPermissionsByCategory() {
        const categories = {};
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
exports.RolesGuard = RolesGuard;
// Export middleware wrappers
const requirePermission = (permission) => RolesGuard.requirePermission(permission);
exports.requirePermission = requirePermission;
const requireAllPermissions = (permissions) => RolesGuard.requireAllPermissions(permissions);
exports.requireAllPermissions = requireAllPermissions;
const requireAnyPermission = (permissions) => RolesGuard.requireAnyPermission(permissions);
exports.requireAnyPermission = requireAnyPermission;
const requireRole = (roles) => RolesGuard.requireRole(roles);
exports.requireRole = requireRole;
exports.requireAdmin = RolesGuard.requireAdmin();
exports.requireSupportOrAdmin = RolesGuard.requireSupportOrAdmin();
//# sourceMappingURL=roles.guard.js.map