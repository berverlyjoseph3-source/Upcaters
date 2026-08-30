"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionService = void 0;
// enterprise-ai-agent-platform/apps/api/src/auth/services/session.service.ts
const client_1 = require("../../db/client");
const logger_1 = require("../../utils/logger");
const crypto_1 = __importDefault(require("crypto"));
const SESSION_CONFIG = {
    maxConcurrentSessions: 5,
    sessionTimeoutMinutes: 30,
    extendOnActivity: true,
    maxSessionLifetimeHours: 168, // 7 days
    suspiciousActivityThreshold: 3,
};
class SessionService {
    /**
     * Parse user agent to determine device type and details
     */
    static parseUserAgent(userAgent) {
        if (!userAgent) {
            return {
                ip: '',
                userAgent: '',
                deviceType: 'unknown',
                isTrusted: false,
            };
        }
        const ua = userAgent.toLowerCase();
        // Detect bot
        if (/bot|crawler|spider|scraper|curl|wget|python|java/.test(ua)) {
            return {
                ip: '',
                userAgent: userAgent,
                deviceType: 'bot',
                isTrusted: false,
                browserName: 'bot',
            };
        }
        // Detect device type
        let deviceType = 'desktop';
        if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|windows phone/.test(ua)) {
            deviceType = 'mobile';
        }
        else if (/ipad|android(?!.*mobile)|tablet|kindle|silk/.test(ua)) {
            deviceType = 'tablet';
        }
        // Detect OS
        let osName;
        let osVersion;
        if (/windows nt (\d+\.\d+)/.test(ua)) {
            osName = 'Windows';
            osVersion = ua.match(/windows nt (\d+\.\d+)/)?.[1];
        }
        else if (/mac os x (\d+[._]\d+)/.test(ua)) {
            osName = 'macOS';
            osVersion = ua.match(/mac os x (\d+[._]\d+)/)?.[1]?.replace('_', '.');
        }
        else if (/linux/.test(ua)) {
            osName = 'Linux';
        }
        else if (/iphone|ipad|ipod/.test(ua)) {
            osName = 'iOS';
            osVersion = ua.match(/os (\d+[._]\d+)/)?.[1]?.replace('_', '.');
        }
        else if (/android/.test(ua)) {
            osName = 'Android';
            osVersion = ua.match(/android (\d+\.\d+)/)?.[1];
        }
        // Detect browser
        let browserName;
        let browserVersion;
        if (/edg\/(\d+\.\d+)/.test(ua)) {
            browserName = 'Edge';
            browserVersion = ua.match(/edg\/(\d+\.\d+)/)?.[1];
        }
        else if (/chrome\/(\d+\.\d+)/.test(ua) && !/edg/.test(ua)) {
            browserName = 'Chrome';
            browserVersion = ua.match(/chrome\/(\d+\.\d+)/)?.[1];
        }
        else if (/firefox\/(\d+\.\d+)/.test(ua)) {
            browserName = 'Firefox';
            browserVersion = ua.match(/firefox\/(\d+\.\d+)/)?.[1];
        }
        else if (/safari\/(\d+\.\d+)/.test(ua) && !/chrome/.test(ua)) {
            browserName = 'Safari';
            browserVersion = ua.match(/safari\/(\d+\.\d+)/)?.[1];
        }
        return {
            ip: '',
            userAgent: userAgent,
            deviceType,
            osName,
            osVersion,
            browserName,
            browserVersion,
            isTrusted: false,
        };
    }
    /**
     * Create a device fingerprint hash for comparison
     */
    static createDeviceFingerprint(device, ip) {
        const data = `${ip}|${device.osName}|${device.browserName}|${device.deviceType}`;
        return crypto_1.default.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }
    /**
     * Check if a device is trusted for a user
     */
    static async isDeviceTrusted(userId, deviceFingerprint) {
        try {
            const trustedDevices = await client_1.prisma.$queryRaw `
        SELECT COUNT(*) as count FROM trusted_devices 
        WHERE user_id = ${userId} AND device_hash = ${deviceFingerprint}
          AND is_trusted = true AND expires_at > NOW()
      `;
            return parseInt(trustedDevices[0]?.count || '0') > 0;
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to check trusted device');
            return false;
        }
    }
    /**
     * Trust a device for future logins
     */
    static async trustDevice(userId, deviceFingerprint, deviceInfo, ipAddress, trustDurationDays = 30) {
        try {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + trustDurationDays);
            await client_1.prisma.$executeRaw `
        INSERT INTO trusted_devices (
          id, user_id, device_hash, device_info, ip_address, expires_at, is_trusted, created_at
        ) VALUES (
          ${crypto_1.default.randomBytes(16).toString('hex')},
          ${userId},
          ${deviceFingerprint},
          ${JSON.stringify(deviceInfo)},
          ${ipAddress},
          ${expiresAt},
          true,
          NOW()
        )
        ON CONFLICT (user_id, device_hash) 
        DO UPDATE SET expires_at = ${expiresAt}, last_used_at = NOW()
      `;
            logger_1.logger.info({ userId, deviceFingerprint }, 'Device trusted');
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to trust device');
        }
    }
    /**
     * Revoke trust for a device
     */
    static async revokeDeviceTrust(userId, deviceFingerprint) {
        try {
            await client_1.prisma.$executeRaw `
        UPDATE trusted_devices SET is_trusted = false 
        WHERE user_id = ${userId} AND device_hash = ${deviceFingerprint}
      `;
            logger_1.logger.info({ userId, deviceFingerprint }, 'Device trust revoked');
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to revoke device trust');
        }
    }
    /**
     * Get all trusted devices for a user
     */
    static async getTrustedDevices(userId) {
        try {
            const devices = await client_1.prisma.$queryRaw `
        SELECT device_hash, device_info, ip_address, last_used_at, expires_at, is_trusted
        FROM trusted_devices
        WHERE user_id = ${userId} AND is_trusted = true AND expires_at > NOW()
        ORDER BY last_used_at DESC
      `;
            return devices.map(d => ({
                deviceHash: d.device_hash,
                deviceInfo: typeof d.device_info === 'string' ? JSON.parse(d.device_info) : d.device_info,
                ipAddress: d.ip_address,
                lastUsedAt: d.last_used_at,
                expiresAt: d.expires_at,
                isTrusted: d.is_trusted,
            }));
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get trusted devices');
            return [];
        }
    }
    /**
     * Detect suspicious session activity
     */
    static async detectSuspiciousActivity(userId, currentSession, newIpAddress, newUserAgent) {
        try {
            // Get recent sessions for comparison
            const recentSessions = await this.getUserSessions(userId);
            const recentActivity = await this.getRecentActivity(userId, 10);
            // Check for rapid location changes
            const locationChanges = this.detectLocationAnomalies(recentActivity, newIpAddress);
            if (locationChanges) {
                return {
                    sessionId: currentSession.id,
                    userId,
                    type: 'suspicious_activity',
                    severity: 'high',
                    details: `Rapid location change detected: ${locationChanges}`,
                    timestamp: new Date(),
                    ipAddress: newIpAddress,
                };
            }
            // Check for concurrent sessions from different locations
            const concurrentFromDifferentLocations = recentSessions.filter(s => s.id !== currentSession.id && s.ipAddress !== newIpAddress);
            if (concurrentFromDifferentLocations.length >= SESSION_CONFIG.suspiciousActivityThreshold) {
                return {
                    sessionId: currentSession.id,
                    userId,
                    type: 'suspicious_activity',
                    severity: 'critical',
                    details: `${concurrentFromDifferentLocations.length} concurrent sessions from different locations`,
                    timestamp: new Date(),
                    ipAddress: newIpAddress,
                };
            }
            // Check for new device type
            const currentDevice = this.parseUserAgent(newUserAgent);
            const knownDeviceTypes = new Set(recentSessions.map(s => this.parseUserAgent(s.userAgent).deviceType));
            if (!knownDeviceTypes.has(currentDevice.deviceType) && recentSessions.length > 0) {
                return {
                    sessionId: currentSession.id,
                    userId,
                    type: 'new_device',
                    severity: 'medium',
                    details: `New device type detected: ${currentDevice.deviceType}`,
                    timestamp: new Date(),
                    ipAddress: newIpAddress,
                };
            }
            // Check for new location
            const knownIps = new Set(recentSessions.map(s => s.ipAddress));
            if (!knownIps.has(newIpAddress) && recentSessions.length > 0) {
                return {
                    sessionId: currentSession.id,
                    userId,
                    type: 'new_location',
                    severity: 'low',
                    details: 'New login location detected',
                    timestamp: new Date(),
                    ipAddress: newIpAddress,
                };
            }
            return null;
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to detect suspicious activity');
            return null;
        }
    }
    /**
     * Detect location anomalies from recent activity
     */
    static detectLocationAnomalies(recentActivity, currentIp) {
        if (recentActivity.length < 2)
            return null;
        const uniqueIps = [...new Set(recentActivity.map(a => a.ipAddress))];
        if (uniqueIps.length >= 3 && !uniqueIps.includes(currentIp)) {
            return `Multiple IP changes detected (${uniqueIps.length} different IPs)`;
        }
        return null;
    }
    /**
     * Get recent session activity
     */
    static async getRecentActivity(userId, limit = 10) {
        try {
            const activity = await client_1.prisma.$queryRaw `
        SELECT session_id, user_id, action, ip_address, user_agent, timestamp, metadata
        FROM session_activity
        WHERE user_id = ${userId}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;
            return activity || [];
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get recent activity');
            return [];
        }
    }
    /**
     * Log session activity
     */
    static async logSessionActivity(sessionId, userId, action, ipAddress, userAgent, metadata) {
        try {
            await client_1.prisma.$executeRaw `
        INSERT INTO session_activity (
          id, session_id, user_id, action, ip_address, user_agent, timestamp, metadata
        ) VALUES (
          ${crypto_1.default.randomBytes(16).toString('hex')},
          ${sessionId},
          ${userId},
          ${action},
          ${ipAddress},
          ${userAgent},
          NOW(),
          ${metadata ? JSON.stringify(metadata) : null}
        )
      `;
        }
        catch (error) {
            logger_1.logger.error({ error, userId, sessionId }, 'Failed to log session activity');
        }
    }
    /**
     * Create a new session with device tracking
     */
    static async createSession(userId, refreshToken, ipAddress, userAgent, deviceFingerprint) {
        try {
            // Enforce concurrent session limit
            const activeSessions = await client_1.prisma.session.count({
                where: {
                    userId,
                    isRevoked: false,
                    expiresAt: { gt: new Date() },
                },
            });
            if (activeSessions >= SESSION_CONFIG.maxConcurrentSessions) {
                logger_1.logger.warn({ userId, activeSessions }, 'Max concurrent sessions reached');
                // Revoke oldest session
                const oldestSession = await client_1.prisma.session.findFirst({
                    where: { userId, isRevoked: false },
                    orderBy: { createdAt: 'asc' },
                });
                if (oldestSession) {
                    await client_1.prisma.session.update({
                        where: { id: oldestSession.id },
                        data: {
                            isRevoked: true,
                            metadata: { revokedReason: 'concurrent_limit', revokedAt: new Date().toISOString() },
                        },
                    });
                }
            }
            // Create session
            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + SESSION_CONFIG.sessionTimeoutMinutes);
            const device = deviceFingerprint || this.parseUserAgent(userAgent ?? null);
            const deviceHash = this.createDeviceFingerprint(device, ipAddress || '');
            const isTrusted = await this.isDeviceTrusted(userId, deviceHash);
            const session = await client_1.prisma.session.create({
                data: {
                    userId,
                    refreshToken: crypto_1.default.createHash('sha256').update(refreshToken).digest('hex'),
                    ipAddress,
                    userAgent,
                    expiresAt,
                    lastActivityAt: new Date(),
                    location: 'unknown',
                    deviceType: device.deviceType,
                    metadata: {
                        deviceFingerprint: deviceHash,
                        deviceInfo: device,
                        isTrusted,
                        createdAt: new Date().toISOString(),
                    },
                },
            });
            // Detect suspicious activity
            if (!isTrusted) {
                const alert = await this.detectSuspiciousActivity(userId, { id: session.id, userId, createdAt: session.createdAt }, ipAddress || '', userAgent || '');
                if (alert) {
                    await this.sendSecurityAlert(userId, alert);
                }
            }
            logger_1.logger.info({ userId, sessionId: session.id, isTrusted, deviceType: device.deviceType }, 'Session created');
            return {
                id: session.id,
                userId: session.userId,
                createdAt: session.createdAt,
                expiresAt: session.expiresAt,
                lastActivityAt: session.lastActivityAt,
                ipAddress: session.ipAddress,
                userAgent: session.userAgent,
                location: session.location,
                deviceType: session.deviceType,
                isCurrent: true,
            };
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to create session');
            throw error;
        }
    }
    /**
     * Send security alert for suspicious activity
     */
    static async sendSecurityAlert(userId, alert) {
        try {
            // Store alert
            await client_1.prisma.$executeRaw `
        INSERT INTO session_alerts (
          id, user_id, session_id, type, severity, details, ip_address, timestamp
        ) VALUES (
          ${crypto_1.default.randomBytes(16).toString('hex')},
          ${alert.userId},
          ${alert.sessionId},
          ${alert.type},
          ${alert.severity},
          ${alert.details},
          ${alert.ipAddress},
          NOW()
        )
      `;
            // Log for monitoring
            logger_1.logger.warn({ userId, alert }, 'Security alert triggered');
            // In production, send email/Slack notification
            // await EmailService.sendSecurityAlert(userId, alert);
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to send security alert');
        }
    }
    /**
     * Update session activity (extends session if configured)
     */
    static async updateActivity(sessionId, ipAddress, userAgent) {
        try {
            const updateData = { lastActivityAt: new Date() };
            if (SESSION_CONFIG.extendOnActivity) {
                updateData.expiresAt = new Date(Date.now() + SESSION_CONFIG.sessionTimeoutMinutes * 60 * 1000);
            }
            if (ipAddress)
                updateData.ipAddress = ipAddress;
            if (userAgent)
                updateData.userAgent = userAgent;
            await client_1.prisma.session.update({
                where: { id: sessionId },
                data: updateData,
            });
        }
        catch (error) {
            logger_1.logger.error({ error, sessionId }, 'Failed to update session activity');
        }
    }
    /**
     * Get all active sessions for a user
     */
    static async getUserSessions(userId, currentRefreshToken) {
        try {
            const sessions = await client_1.prisma.session.findMany({
                where: {
                    userId,
                    isRevoked: false,
                    expiresAt: { gt: new Date() },
                },
                orderBy: { lastActivityAt: 'desc' },
            });
            return sessions.map(session => ({
                id: session.id,
                userId: session.userId,
                createdAt: session.createdAt,
                expiresAt: session.expiresAt,
                lastActivityAt: session.lastActivityAt,
                ipAddress: session.ipAddress,
                userAgent: session.userAgent,
                location: session.location,
                deviceType: session.deviceType,
                isCurrent: false, // Will be set by caller
            }));
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to get user sessions');
            return [];
        }
    }
    /**
     * Revoke a specific session
     */
    static async revokeSession(sessionId, userId, reason = 'manual') {
        try {
            const result = await client_1.prisma.session.updateMany({
                where: { id: sessionId, userId },
                data: {
                    isRevoked: true,
                    metadata: { revokedReason: reason, revokedAt: new Date().toISOString() },
                },
            });
            if (result.count > 0) {
                logger_1.logger.info({ userId, sessionId, reason }, 'Session revoked');
                return true;
            }
            return false;
        }
        catch (error) {
            logger_1.logger.error({ error, userId, sessionId }, 'Failed to revoke session');
            return false;
        }
    }
    /**
     * Revoke all sessions except current
     */
    static async revokeAllSessionsExcept(userId, currentSessionId) {
        try {
            const result = await client_1.prisma.session.updateMany({
                where: {
                    userId,
                    id: { not: currentSessionId },
                    isRevoked: false,
                },
                data: {
                    isRevoked: true,
                    metadata: { revokedReason: 'logout_all', revokedAt: new Date().toISOString() },
                },
            });
            logger_1.logger.info({ userId, revokedCount: result.count }, 'All other sessions revoked');
            return result.count;
        }
        catch (error) {
            logger_1.logger.error({ error, userId }, 'Failed to revoke other sessions');
            return 0;
        }
    }
    /**
     * Clean up expired sessions
     */
    static async cleanupExpiredSessions() {
        try {
            const result = await client_1.prisma.session.deleteMany({
                where: {
                    OR: [
                        { expiresAt: { lt: new Date() } },
                        {
                            createdAt: {
                                lt: new Date(Date.now() - SESSION_CONFIG.maxSessionLifetimeHours * 60 * 60 * 1000),
                            },
                        },
                    ],
                },
            });
            if (result.count > 0) {
                logger_1.logger.info({ deletedCount: result.count }, 'Expired sessions cleaned up');
            }
            return result.count;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to cleanup expired sessions');
            return 0;
        }
    }
    /**
     * Clean up expired trusted devices
     */
    static async cleanupExpiredTrustedDevices() {
        try {
            const result = await client_1.prisma.$executeRaw `
        DELETE FROM trusted_devices WHERE expires_at < NOW()
      `;
            if (result > 0) {
                logger_1.logger.info({ deletedCount: result }, 'Expired trusted devices cleaned up');
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to cleanup expired trusted devices');
            return 0;
        }
    }
}
exports.SessionService = SessionService;
//# sourceMappingURL=session.service.js.map