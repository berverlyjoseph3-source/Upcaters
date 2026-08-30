"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
// apps/api/src/db/prisma.ts
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
const prisma = new client_1.PrismaClient({
    log: process.env.NODE_ENV === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
    errorFormat: 'pretty',
});
exports.prisma = prisma;
// Handle connection events
prisma.$on('query', (e) => {
    if (process.env.NODE_ENV === 'development') {
        logger_1.logger.debug({
            msg: 'Database Query',
            query: e.query,
            params: e.params,
            duration: `${e.duration}ms`,
        });
    }
});
prisma.$on('error', (e) => {
    logger_1.logger.error({
        msg: 'Database Error',
        error: e.message,
        target: e.target,
    });
});
// Graceful shutdown
process.on('beforeExit', async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=prisma.js.map