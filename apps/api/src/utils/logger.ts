// enterprise-ai-agent-platform/apps/api/src/utils/logger.ts
import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

const myFormat = printf(({ level, message, timestamp, ...metadata }) => {
  let msg = `${timestamp} [${level}]: ${message}`;
  if (Object.keys(metadata).length > 0) {
    msg += ` ${JSON.stringify(metadata)}`;
  }
  return msg;
});

const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    process.env.NODE_ENV === 'production' ? json() : combine(colorize(), myFormat)
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'logs/exceptions.log' }),
  ],
});

/**
 * The rest of the codebase calls the logger Pino-style, i.e.
 * `logger.error({ error, userId }, 'Something failed')` — metadata object
 * first, message second. Raw Winston only supports `(message, ...meta)` or
 * a single combined object. Rather than rewrite the ~1000 call sites across
 * the codebase that already use the Pino-style convention, this thin
 * adapter normalizes calls into the shape Winston actually expects.
 *
 * Supports all of:
 *   logger.error('message')
 *   logger.error('message', { meta })
 *   logger.error({ meta }, 'message')
 */
type LogArgs = [meta: Record<string, unknown>, message: string] | [message: string, meta?: Record<string, unknown>] | [message: string];

function normalize(args: LogArgs): [string, Record<string, unknown> | undefined] {
  if (typeof args[0] === 'string') {
    return [args[0], args[1] as Record<string, unknown> | undefined];
  }
  // object-first (Pino-style) call
  return [(args[1] as string) ?? '', args[0] as Record<string, unknown>];
}

function makeLevelFn(level: 'error' | 'warn' | 'info' | 'debug') {
  return (...args: LogArgs) => {
    const [message, meta] = normalize(args);
    return meta ? winstonLogger.log(level, message, meta) : winstonLogger.log(level, message);
  };
}

export const logger = {
  error: makeLevelFn('error'),
  warn: makeLevelFn('warn'),
  info: makeLevelFn('info'),
  debug: makeLevelFn('debug'),
};

// Create a stream object for Morgan HTTP logging
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};