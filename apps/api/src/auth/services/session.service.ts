// enterprise-ai-agent-platform/apps/api/src/auth/services/session.service.ts
import { prisma } from '../../db/client';
import { logger } from '../../utils/logger';
import { authConfig } from '../../config/auth.config';
import crypto from 'crypto';
import type { SessionInfo } from '../dto/auth.dto';

// ============================================
// Session Configuration
// ============================================

interface SessionConfig {
  maxConcurrentSessions: number;
  sessionTimeoutMinutes: number;
  extendOnActivity: boolean;
  maxSessionLifetimeHours: number;
  suspiciousActivityThreshold: number;
}

interface DeviceFingerprint {
  ip: string;
  userAgent: string;
  acceptLanguage?: string;
  screenResolution?: string;
  timezone?: string;
  platform?: string;
  browserName?: string;
  browserVersion?: string;
  osName?: string;
  osVersion?: string;
  deviceType: 'mobile' | 'tablet' | 'desktop' | 'bot' | 'unknown';
  isTrusted: boolean;
}

interface LocationInfo {
  city?: string;
  region?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  isp?: string;
  isAnonymous?: boolean;
  isProxy?: boolean;
}

interface SessionActivity {
  sessionId: string;
  userId: string;
  action: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface SessionAlert {
  sessionId: string;
  userId: string;
  type: 'new_device' | 'new_location' | 'concurrent_limit' | 'suspicious_activity' | 'session_hijacking';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: string;
  timestamp: Date;
  ipAddress?: string;
  location?: string;
}

const SESSION_CONFIG: SessionConfig = {
  maxConcurrentSessions: 5,
  sessionTimeoutMinutes: 30,
  extendOnActivity: true,
  maxSessionLifetimeHours: 168, // 7 days
  suspiciousActivityThreshold: 3,
};

export class SessionService {
  /**
   * Parse user agent to determine device type and details
   */
  static parseUserAgent(userAgent: string | null): DeviceFingerprint {
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
    let deviceType: DeviceFingerprint['deviceType'] = 'desktop';
    if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini|windows phone/.test(ua)) {
      deviceType = 'mobile';
    } else if (/ipad|android(?!.*mobile)|tablet|kindle|silk/.test(ua)) {
      deviceType = 'tablet';
    }

    // Detect OS
    let osName: string | undefined;
    let osVersion: string | undefined;
    if (/windows nt (\d+\.\d+)/.test(ua)) {
      osName = 'Windows';
      osVersion = ua.match(/windows nt (\d+\.\d+)/)?.[1];
    } else if (/mac os x (\d+[._]\d+)/.test(ua)) {
      osName = 'macOS';
      osVersion = ua.match(/mac os x (\d+[._]\d+)/)?.[1]?.replace('_', '.');
    } else if (/linux/.test(ua)) {
      osName = 'Linux';
    } else if (/iphone|ipad|ipod/.test(ua)) {
      osName = 'iOS';
      osVersion = ua.match(/os (\d+[._]\d+)/)?.[1]?.replace('_', '.');
    } else if (/android/.test(ua)) {
      osName = 'Android';
      osVersion = ua.match(/android (\d+\.\d+)/)?.[1];
    }

    // Detect browser
    let browserName: string | undefined;
    let browserVersion: string | undefined;
    if (/edg\/(\d+\.\d+)/.test(ua)) {
      browserName = 'Edge';
      browserVersion = ua.match(/edg\/(\d+\.\d+)/)?.[1];
    } else if (/chrome\/(\d+\.\d+)/.test(ua) && !/edg/.test(ua)) {
      browserName = 'Chrome';
      browserVersion = ua.match(/chrome\/(\d+\.\d+)/)?.[1];
    } else if (/firefox\/(\d+\.\d+)/.test(ua)) {
      browserName = 'Firefox';
      browserVersion = ua.match(/firefox\/(\d+\.\d+)/)?.[1];
    } else if (/safari\/(\d+\.\d+)/.test(ua) && !/chrome/.test(ua)) {
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
  static createDeviceFingerprint(device: DeviceFingerprint, ip: string): string {
    const data = `${ip}|${device.osName}|${device.browserName}|${device.deviceType}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Check if a device is trusted for a user
   */
  static async isDeviceTrusted(userId: string, deviceFingerprint: string): Promise<boolean> {
    try {
      const trustedDevices = await prisma.$queryRaw<Array<{ count: string }>>`
        SELECT COUNT(*) as count FROM trusted_devices 
        WHERE user_id = ${userId} AND device_hash = ${deviceFingerprint}
          AND is_trusted = true AND expires_at > NOW()
      `;
      
      return parseInt(trustedDevices[0]?.count || '0') > 0;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to check trusted device');
      return false;
    }
  }

  /**
   * Trust a device for future logins
   */
  static async trustDevice(
    userId: string, 
    deviceFingerprint: string, 
    deviceInfo: DeviceFingerprint,
    ipAddress: string,
    trustDurationDays: number = 30
  ): Promise<void> {
    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + trustDurationDays);

      await prisma.$executeRaw`
        INSERT INTO trusted_devices (
          id, user_id, device_hash, device_info, ip_address, expires_at, is_trusted, created_at
        ) VALUES (
          ${crypto.randomBytes(16).toString('hex')},
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

      logger.info({ userId, deviceFingerprint }, 'Device trusted');
    } catch (error) {
      logger.error({ error, userId }, 'Failed to trust device');
    }
  }

  /**
   * Revoke trust for a device
   */
  static async revokeDeviceTrust(userId: string, deviceFingerprint: string): Promise<void> {
    try {
      await prisma.$executeRaw`
        UPDATE trusted_devices SET is_trusted = false 
        WHERE user_id = ${userId} AND device_hash = ${deviceFingerprint}
      `;
      
      logger.info({ userId, deviceFingerprint }, 'Device trust revoked');
    } catch (error) {
      logger.error({ error, userId }, 'Failed to revoke device trust');
    }
  }

  /**
   * Get all trusted devices for a user
   */
  static async getTrustedDevices(userId: string): Promise<Array<{
    deviceHash: string;
    deviceInfo: DeviceFingerprint;
    ipAddress: string;
    lastUsedAt: Date;
    expiresAt: Date;
    isTrusted: boolean;
  }>> {
    try {
      const devices = await prisma.$queryRaw<Array<{
        device_hash: string;
        device_info: any;
        ip_address: string;
        last_used_at: Date;
        expires_at: Date;
        is_trusted: boolean;
      }>>`
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
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get trusted devices');
      return [];
    }
  }

  /**
   * Detect suspicious session activity
   */
  static async detectSuspiciousActivity(
    userId: string,
    currentSession: SessionInfo,
    newIpAddress: string,
    newUserAgent: string
  ): Promise<SessionAlert | null> {
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
      const concurrentFromDifferentLocations = recentSessions.filter(
        s => s.id !== currentSession.id && s.ipAddress !== newIpAddress
      );

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
      const knownDeviceTypes = new Set(recentSessions.map(s => 
        this.parseUserAgent(s.userAgent).deviceType
      ));

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
    } catch (error) {
      logger.error({ error, userId }, 'Failed to detect suspicious activity');
      return null;
    }
  }

  /**
   * Detect location anomalies from recent activity
   */
  private static detectLocationAnomalies(recentActivity: SessionActivity[], currentIp: string): string | null {
    if (recentActivity.length < 2) return null;

    const uniqueIps = [...new Set(recentActivity.map(a => a.ipAddress))];
    
    if (uniqueIps.length >= 3 && !uniqueIps.includes(currentIp)) {
      return `Multiple IP changes detected (${uniqueIps.length} different IPs)`;
    }

    return null;
  }

  /**
   * Get recent session activity
   */
  private static async getRecentActivity(userId: string, limit: number = 10): Promise<SessionActivity[]> {
    try {
      const activity = await prisma.$queryRaw<SessionActivity[]>`
        SELECT session_id, user_id, action, ip_address, user_agent, timestamp, metadata
        FROM session_activity
        WHERE user_id = ${userId}
        ORDER BY timestamp DESC
        LIMIT ${limit}
      `;

      return activity || [];
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get recent activity');
      return [];
    }
  }

  /**
   * Log session activity
   */
  static async logSessionActivity(
    sessionId: string,
    userId: string,
    action: string,
    ipAddress: string,
    userAgent: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await prisma.$executeRaw`
        INSERT INTO session_activity (
          id, session_id, user_id, action, ip_address, user_agent, timestamp, metadata
        ) VALUES (
          ${crypto.randomBytes(16).toString('hex')},
          ${sessionId},
          ${userId},
          ${action},
          ${ipAddress},
          ${userAgent},
          NOW(),
          ${metadata ? JSON.stringify(metadata) : null}
        )
      `;
    } catch (error) {
      logger.error({ error, userId, sessionId }, 'Failed to log session activity');
    }
  }

  /**
   * Create a new session with device tracking
   */
  static async createSession(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
    deviceFingerprint?: DeviceFingerprint
  ): Promise<SessionInfo> {
    try {
      // Enforce concurrent session limit
      const activeSessions = await prisma.session.count({
        where: {
          userId,
          isRevoked: false,
          expiresAt: { gt: new Date() },
        },
      });

      if (activeSessions >= SESSION_CONFIG.maxConcurrentSessions) {
        logger.warn({ userId, activeSessions }, 'Max concurrent sessions reached');

        // Revoke oldest session
        const oldestSession = await prisma.session.findFirst({
          where: { userId, isRevoked: false },
          orderBy: { createdAt: 'asc' },
        });

        if (oldestSession) {
          await prisma.session.update({
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

      const session = await prisma.session.create({
        data: {
          userId,
          refreshToken: crypto.createHash('sha256').update(refreshToken).digest('hex'),
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
        const alert = await this.detectSuspiciousActivity(
          userId,
          { id: session.id, userId, createdAt: session.createdAt } as SessionInfo,
          ipAddress || '',
          userAgent || ''
        );

        if (alert) {
          await this.sendSecurityAlert(userId, alert);
        }
      }

      logger.info({ userId, sessionId: session.id, isTrusted, deviceType: device.deviceType }, 'Session created');

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
    } catch (error) {
      logger.error({ error, userId }, 'Failed to create session');
      throw error;
    }
  }

  /**
   * Send security alert for suspicious activity
   */
  private static async sendSecurityAlert(userId: string, alert: SessionAlert): Promise<void> {
    try {
      // Store alert
      await prisma.$executeRaw`
        INSERT INTO session_alerts (
          id, user_id, session_id, type, severity, details, ip_address, timestamp
        ) VALUES (
          ${crypto.randomBytes(16).toString('hex')},
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
      logger.warn({ userId, alert }, 'Security alert triggered');

      // In production, send email/Slack notification
      // await EmailService.sendSecurityAlert(userId, alert);
    } catch (error) {
      logger.error({ error, userId }, 'Failed to send security alert');
    }
  }

  /**
   * Update session activity (extends session if configured)
   */
  static async updateActivity(sessionId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    try {
      const updateData: any = { lastActivityAt: new Date() };
      
      if (SESSION_CONFIG.extendOnActivity) {
        updateData.expiresAt = new Date(Date.now() + SESSION_CONFIG.sessionTimeoutMinutes * 60 * 1000);
      }
      
      if (ipAddress) updateData.ipAddress = ipAddress;
      if (userAgent) updateData.userAgent = userAgent;

      await prisma.session.update({
        where: { id: sessionId },
        data: updateData,
      });
    } catch (error) {
      logger.error({ error, sessionId }, 'Failed to update session activity');
    }
  }

  /**
   * Get all active sessions for a user
   */
  static async getUserSessions(userId: string, currentRefreshToken?: string): Promise<SessionInfo[]> {
    try {
      const sessions = await prisma.session.findMany({
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
    } catch (error) {
      logger.error({ error, userId }, 'Failed to get user sessions');
      return [];
    }
  }

  /**
   * Revoke a specific session
   */
  static async revokeSession(sessionId: string, userId: string, reason: string = 'manual'): Promise<boolean> {
    try {
      const result = await prisma.session.updateMany({
        where: { id: sessionId, userId },
        data: {
          isRevoked: true,
          metadata: { revokedReason: reason, revokedAt: new Date().toISOString() },
        },
      });

      if (result.count > 0) {
        logger.info({ userId, sessionId, reason }, 'Session revoked');
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error({ error, userId, sessionId }, 'Failed to revoke session');
      return false;
    }
  }

  /**
   * Revoke all sessions except current
   */
  static async revokeAllSessionsExcept(userId: string, currentSessionId: string): Promise<number> {
    try {
      const result = await prisma.session.updateMany({
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

      logger.info({ userId, revokedCount: result.count }, 'All other sessions revoked');
      return result.count;
    } catch (error) {
      logger.error({ error, userId }, 'Failed to revoke other sessions');
      return 0;
    }
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await prisma.session.deleteMany({
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
        logger.info({ deletedCount: result.count }, 'Expired sessions cleaned up');
      }

      return result.count;
    } catch (error) {
      logger.error({ error }, 'Failed to cleanup expired sessions');
      return 0;
    }
  }

  /**
   * Clean up expired trusted devices
   */
  static async cleanupExpiredTrustedDevices(): Promise<number> {
    try {
      const result = await prisma.$executeRaw`
        DELETE FROM trusted_devices WHERE expires_at < NOW()
      `;

      if (result > 0) {
        logger.info({ deletedCount: result }, 'Expired trusted devices cleaned up');
      }

      return result;
    } catch (error) {
      logger.error({ error }, 'Failed to cleanup expired trusted devices');
      return 0;
    }
  }
}