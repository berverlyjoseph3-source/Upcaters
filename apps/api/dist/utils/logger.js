"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.stream = exports.logger = void 0;
// enterprise-ai-agent-platform/apps/api/src/utils/logger.ts
const winston_1 = __importDefault(require("winston"));
const { combine, timestamp, printf, colorize, json } = winston_1.default.format;
const myFormat = printf(({ level, message, timestamp, ...metadata }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
        msg += ` ${JSON.stringify(metadata)}`;
    }
    return msg;
});
const winstonLogger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: combine(timestamp(), process.env.NODE_ENV === 'production' ? json() : combine(colorize(), myFormat)),
    transports: [
        new winston_1.default.transports.Console(),
        new winston_1.default.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston_1.default.transports.File({ filename: 'logs/combined.log' }),
    ],
    exceptionHandlers: [
        new winston_1.default.transports.File({ filename: 'logs/exceptions.log' }),
    ],
});
function normalize(args) {
    if (typeof args[0] === 'string') {
        return [args[0], args[1]];
    }
    // object-first (Pino-style) call
    return [args[1] ?? '', args[0]];
}
function makeLevelFn(level) {
    return (...args) => {
        const [message, meta] = normalize(args);
        return meta ? winstonLogger.log(level, message, meta) : winstonLogger.log(level, message);
    };
}
exports.logger = {
    error: makeLevelFn('error'),
    warn: makeLevelFn('warn'),
    info: makeLevelFn('info'),
    debug: makeLevelFn('debug'),
};
// Create a stream object for Morgan HTTP logging
exports.stream = {
    write: (message) => {
        exports.logger.info(message.trim());
    },
};
//# sourceMappingURL=logger.js.map