"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
exports.getPrismaClient = getPrismaClient;
exports.withTransaction = withTransaction;
exports.batchOperation = batchOperation;
// enterprise-ai-agent-platform/apps/api/src/db/client.ts
const client_1 = require("@prisma/client");
const logger_1 = require("../utils/logger");
// Singleton pattern for Prisma Client
let prismaClient = null;
function getPrismaClient() {
    if (!prismaClient) {
        prismaClient = new client_1.PrismaClient({
            log: process.env.NODE_ENV === 'development'
                ? [
                    { emit: 'event', level: 'query' },
                    { emit: 'stdout', level: 'info' },
                    { emit: 'stdout', level: 'warn' },
                    { emit: 'stdout', level: 'error' },
                ]
                : [{ emit: 'stdout', level: 'error' }],
        });
        // Log queries in development
        if (process.env.NODE_ENV === 'development') {
            prismaClient.$on('query', (e) => {
                logger_1.logger.debug({
                    msg: 'Database Query',
                    query: e.query,
                    params: e.params,
                    duration: `${e.duration}ms`,
                });
            });
        }
        // Handle connection errors
        prismaClient.$on('error', (e) => {
            logger_1.logger.error({
                msg: 'Prisma Client Error',
                error: e.message,
                target: e.target,
            });
        });
    }
    return prismaClient;
}
// Export a singleton instance
exports.prisma = getPrismaClient();
// Transaction helper for multi-table operations
async function withTransaction(callback) {
    return exports.prisma.$transaction(async (tx) => {
        return callback(tx);
    });
}
// Batch operation helper
async function batchOperation(items, operation, batchSize = 100) {
    const results = [];
    for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(operation));
        results.push(...batchResults);
    }
    return results;
}
//# sourceMappingURL=client.js.map