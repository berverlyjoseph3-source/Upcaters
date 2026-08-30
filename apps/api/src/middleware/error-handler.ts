// enterprise-ai-agent-platform/apps/api/src/middleware/error-handler.ts
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { PlanLimitExceededError } from '../services/usage-metering.service';

export interface ErrorWithStatus extends Error {
  status ? : number;
  code ? : string;
}

export function errorHandler(
  err: ErrorWithStatus,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Log error
  logger.error({
    message: err.message,
    stack: err.stack,
    status: err.status,
    code: err.code,
    path: req.path,
    method: req.method,
    ip: req.ip,
    userId: (req as any).user?.id,
  }, 'Request error');
  
  // Handle PlanLimitExceededError
  if (err instanceof PlanLimitExceededError) {
    res.status(429).json({
      success: false,
      error: 'USAGE_LIMIT_REACHED',
      category: err.category,
      used: err.used,
      limit: err.limit,
      resetDate: err.resetDate,
      upgradeUrl: `${process.env.APP_URL}/billing/upgrade`,
    });
    return;
  }
  
  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      success: false,
      error: 'Invalid token',
      code: 'INVALID_TOKEN',
    });
    return;
  }
  
  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      error: 'Token expired',
      code: 'TOKEN_EXPIRED',
    });
    return;
  }
  
  // Handle validation errors
  if (err.name === 'ValidationError' || err.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: err.message,
    });
    return;
  }
  
  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    res.status(400).json({
      success: false,
      error: 'Database error',
      code: 'DATABASE_ERROR',
    });
    return;
  }
  
  // Default error response
  const status = err.status || 500;
  const message = status === 500 ? 'Internal server error' : err.message;
  
  res.status(status).json({
    success: false,
    error: message,
    code: err.code || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}