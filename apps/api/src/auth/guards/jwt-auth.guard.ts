// enterprise-ai-agent-platform/apps/api/src/auth/guards/jwt-auth.guard.ts
import { Request, Response, NextFunction } from 'express';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { logger } from '../../../src/utils/logger';

export interface AuthenticatedRequest extends Request {
  user ? : {
    id: string;
    email: string;
    role: string;
    planId: string;
  };
}

export class JwtAuthGuard {
  /**
   * Middleware to protect routes with JWT authentication
   */
  static async protect(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise < void > {
    try {
      const result = await JwtStrategy.authenticate(req);
      
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
    } catch (error) {
      logger.error({ error }, 'JWT auth guard error');
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
  static async optional(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise < void > {
    try {
      const result = await JwtStrategy.authenticate(req);
      
      if (result.valid && result.user) {
        req.user = result.user;
      }
      
      next();
    } catch (error) {
      // Don't fail on error, just continue without user
      next();
    }
  }
  
  /**
   * Middleware to check if user has required role
   */
  static hasRole(roles: string | string[]) {
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
  static hasPlan(plans: string | string[]) {
    const allowedPlans = Array.isArray(plans) ? plans : [plans];
    
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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
  static ownsResource(getResourceUserId: (req: Request) => string | undefined) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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
  static getUserId(req: AuthenticatedRequest): string | undefined {
    return req.user?.id;
  }
  
  /**
   * Extract user role from request
   */
  static getUserRole(req: AuthenticatedRequest): string | undefined {
    return req.user?.role;
  }
  
  /**
   * Extract user plan from request
   */
  static getUserPlan(req: AuthenticatedRequest): string | undefined {
    return req.user?.planId;
  }
  
  /**
   * Check if request has authenticated user
   */
  static isAuthenticated(req: AuthenticatedRequest): boolean {
    return !!req.user;
  }
  
  /**
   * Check if authenticated user is admin
   */
  static isAdmin(req: AuthenticatedRequest): boolean {
    return req.user?.role === 'ADMIN';
  }
}

// Express middleware wrapper for easy use in routes
export const requireAuth = JwtAuthGuard.protect;
export const optionalAuth = JwtAuthGuard.optional;
export const requireRole = (roles: string | string[]) => JwtAuthGuard.hasRole(roles);
export const requirePlan = (plans: string | string[]) => JwtAuthGuard.hasPlan(plans);