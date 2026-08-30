"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtStrategy = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const auth_config_1 = require("../../config/auth.config");
const client_1 = require("../../db/client");
const logger_1 = require("../../utils/logger");
const DEFAULT_VALIDATION_OPTIONS = {
    validateAudience: true,
    validateIssuer: true,
    validateExpiration: true,
    validateNotBefore: true,
    validateTokenBinding: true,
    clockTolerance: 30, // 30 seconds tolerance
};
class JwtStrategy {
    /**
     * Extract JWT from Authorization header, cookie, or query
     */
    static extractTokenFromRequest(req) {
        // Method 1: Authorization header (Bearer token)
        const authHeader = req.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.substring(7).trim();
            if (token.length > 0) {
                return token;
            }
        }
        // Method 2: HTTP-only cookie
        if (req.cookies?.access_token) {
            return req.cookies.access_token;
        }
        // Method 3: Query parameter (for WebSocket connections, less secure)
        if (req.query?.token && typeof req.query.token === 'string') {
            logger_1.logger.warn({
                method: 'query',
                ip: req.ip,
                path: req.path
            }, 'JWT provided in query parameter - less secure');
            return req.query.token;
        }
        return null;
    }
    /**
     * Generate token binding hash
     */
    static generateTokenBinding(sessionId, ipAddress, userAgent) {
        return {
            sessionHash: crypto_1.default.createHash('sha256').update(sessionId).digest('hex').substring(0, 16),
            ipHash: crypto_1.default.createHash('sha256').update(ipAddress).digest('hex').substring(0, 16),
            userAgentHash: crypto_1.default.createHash('sha256').update(userAgent).digest('hex').substring(0, 16),
            issuedAt: Math.floor(Date.now() / 1000),
        };
    }
    /**
     * Verify token binding
     */
    static verifyTokenBinding(payload, currentIp, currentUserAgent) {
        if (!payload.tb)
            return true; // No binding present (legacy token)
        const binding = payload.tb;
        const currentIpHash = crypto_1.default.createHash('sha256').update(currentIp).digest('hex').substring(0, 16);
        const currentUaHash = crypto_1.default.createHash('sha256').update(currentUserAgent).digest('hex').substring(0, 16);
        // Check IP binding (allow same /24 subnet for mobile users)
        if (binding.ipHash !== currentIpHash) {
            // For mobile users, IP can change - warn but don't reject
            logger_1.logger.warn({
                expectedIpHash: binding.ipHash,
                actualIpHash: currentIpHash,
            }, 'Token IP binding mismatch');
            // Still allow if user agent matches
            return binding.userAgentHash === currentUaHash;
        }
        // Check user agent binding
        if (binding.userAgentHash !== currentUaHash) {
            logger_1.logger.warn({
                expectedUaHash: binding.userAgentHash,
                actualUaHash: currentUaHash,
            }, 'Token user agent binding mismatch');
            return false;
        }
        return true;
    }
    /**
     * Validate and decode JWT token
     */
    static validateToken(token, options = DEFAULT_VALIDATION_OPTIONS) {
        try {
            // First decode without verification to check structure
            const decoded = jsonwebtoken_1.default.decode(token, { complete: true });
            if (!decoded || !decoded.header) {
                logger_1.logger.warn('Invalid JWT structure');
                return null;
            }
            // Check algorithm
            if (decoded.header.alg !== 'HS256' && decoded.header.alg !== 'HS512') {
                logger_1.logger.warn({ alg: decoded.header.alg }, 'Invalid JWT algorithm');
                return null;
            }
            // Verify token
            const verifyOptions = {
                algorithms: ['HS256', 'HS512'],
                issuer: options.validateIssuer ? auth_config_1.authConfig.jwt.issuer : undefined,
                audience: options.validateAudience ? auth_config_1.authConfig.jwt.audience : undefined,
                clockTolerance: options.clockTolerance,
            };
            const payload = jsonwebtoken_1.default.verify(token, auth_config_1.authConfig.jwt.accessSecret, verifyOptions);
            // Validate token type
            if (payload.type !== 'access') {
                logger_1.logger.warn({ tokenType: payload.type }, 'Invalid token type - expected access token');
                return null;
            }
            // Check if token has been revoked (check session)
            if (payload.sh) {
                // Session hash check - verify session is still active
                const sessionValid = this.verifySessionHash(payload.sh, payload.sub);
                if (!sessionValid) {
                    logger_1.logger.warn({ userId: payload.sub }, 'Token session revoked');
                    return null;
                }
            }
            // Check expiration
            if (options.validateExpiration && payload.exp) {
                const currentTime = Math.floor(Date.now() / 1000);
                if (payload.exp < currentTime) {
                    logger_1.logger.debug({
                        tokenId: payload.jti,
                        expiredAt: new Date(payload.exp * 1000).toISOString()
                    }, 'Token expired');
                    return null;
                }
            }
            // Check not before
            if (options.validateNotBefore && payload.nbf) {
                const currentTime = Math.floor(Date.now() / 1000);
                if (payload.nbf > currentTime + (options.clockTolerance || 0)) {
                    logger_1.logger.warn({
                        tokenId: payload.jti,
                        nbf: new Date(payload.nbf * 1000).toISOString()
                    }, 'Token not yet valid');
                    return null;
                }
            }
            return payload;
        }
        catch (error) {
            if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
                logger_1.logger.debug({ expiredAt: error.expiredAt }, 'Token expired');
            }
            else if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
                logger_1.logger.warn({ error: error.message }, 'Invalid JWT token');
            }
            else if (error instanceof jsonwebtoken_1.default.NotBeforeError) {
                logger_1.logger.warn({ date: error.date }, 'Token not yet active');
            }
            else {
                logger_1.logger.error({ error }, 'Error validating JWT token');
            }
            return null;
        }
    }
    /**
     * Verify session hash
     */
    static verifySessionHash(sessionHash, userId) {
        // In production, check against active sessions
        // For now, return true (will be implemented with Redis session store)
        return true;
    }
    /**
     * Authenticate request
     */
    static async authenticate(req) {
        try {
            const token = this.extractTokenFromRequest(req);
            if (!token) {
                return {
                    valid: false,
                    error: 'No authentication token provided',
                    errorCode: 'NO_TOKEN',
                };
            }
            const payload = this.validateToken(token);
            if (!payload) {
                return {
                    valid: false,
                    error: 'Invalid or expired token',
                    errorCode: 'INVALID_TOKEN',
                };
            }
            // Verify token binding
            if (DEFAULT_VALIDATION_OPTIONS.validateTokenBinding && payload.tb) {
                const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
                const userAgent = req.headers['user-agent'] || 'unknown';
                const bindingValid = this.verifyTokenBinding(payload, ipAddress, userAgent);
                if (!bindingValid) {
                    logger_1.logger.warn({ userId: payload.sub }, 'Token binding verification failed');
                    return {
                        valid: false,
                        error: 'Token binding verification failed',
                        errorCode: 'TOKEN_BINDING_FAILED',
                    };
                }
            }
            // Verify user exists and is active
            const user = await client_1.prisma.user.findUnique({
                where: { id: payload.sub },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    planId: true,
                    isActive: true,
                },
            });
            if (!user) {
                return {
                    valid: false,
                    error: 'User not found',
                    errorCode: 'USER_NOT_FOUND',
                };
            }
            if (!user.isActive) {
                return {
                    valid: false,
                    error: 'Account is disabled',
                    errorCode: 'ACCOUNT_DISABLED',
                };
            }
            logger_1.logger.debug({ userId: user.id, tokenId: payload.jti }, 'JWT authentication successful');
            return {
                valid: true,
                user: {
                    id: user.id,
                    email: user.email,
                    role: user.role,
                    planId: user.planId,
                },
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'JWT authentication failed');
            return {
                valid: false,
                error: 'Authentication failed',
                errorCode: 'AUTH_ERROR',
            };
        }
    }
    /**
     * Check if token is about to expire (for proactive refresh)
     */
    static isTokenExpiringSoon(token, thresholdSeconds = 300) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (!decoded || !decoded.exp)
                return false;
            const currentTime = Math.floor(Date.now() / 1000);
            const timeUntilExpiry = decoded.exp - currentTime;
            return timeUntilExpiry > 0 && timeUntilExpiry < thresholdSeconds;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to check token expiry');
            return false;
        }
    }
    /**
     * Get remaining time on token in seconds
     */
    static getTokenRemainingTime(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (!decoded || !decoded.exp)
                return 0;
            const currentTime = Math.floor(Date.now() / 1000);
            return Math.max(0, decoded.exp - currentTime);
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to get token remaining time');
            return 0;
        }
    }
    /**
     * Decode token without verification
     */
    static decodeToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.decode(token);
            if (!decoded)
                return null;
            return {
                sub: decoded.sub,
                email: decoded.email,
                role: decoded.role,
                planId: decoded.planId,
                jti: decoded.jti,
                type: decoded.type,
                exp: decoded.exp,
                iat: decoded.iat,
                iss: decoded.iss,
                aud: decoded.aud,
            };
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to decode token');
            return null;
        }
    }
    /**
     * Check if token is blacklisted
     */
    static async isTokenBlacklisted(tokenId) {
        try {
            const result = await client_1.prisma.$queryRaw `
        SELECT COUNT(*) as count FROM token_blacklist 
        WHERE token_id = ${tokenId} AND expires_at > NOW()
      `;
            return parseInt(result[0]?.count || '0') > 0;
        }
        catch (error) {
            logger_1.logger.error({ error, tokenId }, 'Failed to check token blacklist');
            return false;
        }
    }
    /**
     * Blacklist a token
     */
    static async blacklistToken(tokenId, reason, expiresAt) {
        try {
            const expiryDate = expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days default
            await client_1.prisma.$executeRaw `
        INSERT INTO token_blacklist (id, token_id, reason, expires_at, created_at)
        VALUES (${crypto_1.default.randomBytes(16).toString('hex')}, ${tokenId}, ${reason}, ${expiryDate}, NOW())
        ON CONFLICT (token_id) DO NOTHING
      `;
        }
        catch (error) {
            logger_1.logger.error({ error, tokenId }, 'Failed to blacklist token');
        }
    }
    /**
     * Clean up expired blacklisted tokens
     */
    static async cleanupBlacklistedTokens() {
        try {
            const result = await client_1.prisma.$executeRaw `
        DELETE FROM token_blacklist WHERE expires_at < NOW()
      `;
            if (result > 0) {
                logger_1.logger.debug({ deletedCount: result }, 'Expired blacklisted tokens cleaned up');
            }
            return result;
        }
        catch (error) {
            logger_1.logger.error({ error }, 'Failed to cleanup blacklisted tokens');
            return 0;
        }
    }
}
exports.JwtStrategy = JwtStrategy;
//# sourceMappingURL=jwt.strategy.js.map