"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePlan = exports.requireRole = exports.optionalAuth = exports.requireAuth = exports.JwtAuthGuard = void 0;
const jwt_strategy_1 = require("../strategies/jwt.strategy");
const logger_1 = require("../../../src/utils/logger");
class JwtAuthGuard {
    /**
     * Middleware to protect routes with JWT authentication
     */
    static async protect(req, res, next) {
        try {
            const result = await jwt_strategy_1.JwtStrategy.authenticate(req);
            if (!result.valid) {
                res.status(401).json({
                    success: false,
                    error: result.error || 'Unauthorized',
                    code: 'UNAUTHORIZED',
                });
                return;
            }
            // Attach user to request object
            req.user = result.user;
            next();
        }
        catch (error) {
            logger_1.logger.error({ error }, 'JWT auth guard error');
            res.status(500).json({
                success: false,
                error: 'Authentication failed',
                code: 'AUTH_ERROR',
            });
        }
    }
    /**
     * Optional authentication - doesn't fail if no token, just doesn't attach user
     */
    static async optional(req, res, next) {
        try {
            const result = await jwt_strategy_1.JwtStrategy.authenticate(req);
            if (result.valid && result.user) {
                req.user = result.user;
            }
            next();
        }
        catch (error) {
            // Don't fail on error, just continue without user
            next();
        }
    }
    /**
     * Middleware to check if user has required role
     */
    static hasRole(roles) {
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
                }, 'Insufficient permissions');
                res.status(403).json({
                    success: false,
                    error: 'Insufficient permissions',
                    code: 'FORBIDDEN',
                    requiredRoles: allowedRoles,
                });
                return;
            }
            next();
        };
    }
    /**
     * Middleware to check if user has required plan
     */
    static hasPlan(plans) {
        const allowedPlans = Array.isArray(plans) ? plans : [plans];
        return (req, res, next) => {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED',
                });
                return;
            }
            if (!allowedPlans.includes(req.user.planId)) {
                res.status(402).json({
                    success: false,
                    error: 'Plan upgrade required',
                    code: 'PLAN_LIMIT_EXCEEDED',
                    currentPlan: req.user.planId,
                    requiredPlans: allowedPlans,
                    upgradeUrl: 'https://yourplatform.com/billing/upgrade',
                });
                return;
            }
            next();
        };
    }
    /**
     * Middleware to check if user owns the resource or is admin
     */
    static ownsResource(getResourceUserId) {
        return (req, res, next) => {
            if (!req.user) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    code: 'UNAUTHORIZED',
                });
                return;
            }
            const resourceUserId = getResourceUserId(req);
            // Allow if user is admin or owns the resource
            if (req.user.role === 'ADMIN' || req.user.id === resourceUserId) {
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
     * Extract user ID from request (for use in other guards)
     */
    static getUserId(req) {
        return req.user?.id;
    }
    /**
     * Extract user role from request
     */
    static getUserRole(req) {
        return req.user?.role;
    }
    /**
     * Extract user plan from request
     */
    static getUserPlan(req) {
        return req.user?.planId;
    }
    /**
     * Check if request has authenticated user
     */
    static isAuthenticated(req) {
        return !!req.user;
    }
    /**
     * Check if authenticated user is admin
     */
    static isAdmin(req) {
        return req.user?.role === 'ADMIN';
    }
}
exports.JwtAuthGuard = JwtAuthGuard;
// Express middleware wrapper for easy use in routes
exports.requireAuth = JwtAuthGuard.protect;
exports.optionalAuth = JwtAuthGuard.optional;
const requireRole = (roles) => JwtAuthGuard.hasRole(roles);
exports.requireRole = requireRole;
const requirePlan = (plans) => JwtAuthGuard.hasPlan(plans);
exports.requirePlan = requirePlan;
//# sourceMappingURL=jwt-auth.guard.js.map