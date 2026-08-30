// enterprise-ai-agent-platform/apps/api/tests/auth/auth.service.test.ts
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { AuthService } from '../../src/auth/services/auth.service';
import { prisma } from '../../src/db/client';

describe('AuthService', () => {
  let testUserEmail: string;
  let testUserId: string;

  beforeAll(async () => {
    testUserEmail = `test-${Date.now()}@example.com`;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  describe('hashPassword', () => {
    it('should hash a password correctly', async () => {
      const password = 'TestPassword123!';
      const hashed = await AuthService.hashPassword(password);
      
      expect(hashed).toBeDefined();
      expect(hashed).not.toBe(password);
      expect(hashed.length).toBeGreaterThan(20);
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'TestPassword123!';
      const hashed = await AuthService.hashPassword(password);
      const isValid = await AuthService.verifyPassword(password, hashed);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPassword123!';
      const wrongPassword = 'WrongPassword456!';
      const hashed = await AuthService.hashPassword(password);
      const isValid = await AuthService.verifyPassword(wrongPassword, hashed);
      expect(isValid).toBe(false);
    });
  });

  describe('generateAccessToken', () => {
    it('should generate a JWT access token', () => {
      const token = AuthService.generateAccessToken(
        'user123',
        'test@example.com',
        'USER',
        'FREE'
      );
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a JWT refresh token', () => {
      const token = AuthService.generateRefreshToken(
        'user123',
        'test@example.com',
        'USER',
        'FREE'
      );
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid access token', () => {
      const token = AuthService.generateAccessToken(
        'user123',
        'test@example.com',
        'USER',
        'FREE'
      );
      
      const payload = AuthService.verifyToken(token, 'access');
      expect(payload).toBeDefined();
      expect(payload?.sub).toBe('user123');
      expect(payload?.email).toBe('test@example.com');
      expect(payload?.type).toBe('access');
    });

    it('should return null for invalid token', () => {
      const payload = AuthService.verifyToken('invalid.token.here', 'access');
      expect(payload).toBeNull();
    });
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const result = await AuthService.register({
        email: testUserEmail,
        name: 'Test User',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
        acceptTerms: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.user.email).toBe(testUserEmail);
      expect(result.data?.user.planId).toBe('FREE');
      
      testUserId = result.data?.user.id || '';
    });

    it('should reject registration with existing email', async () => {
      const result = await AuthService.register({
        email: testUserEmail,
        name: 'Another User',
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!',
        acceptTerms: true,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('createSession', () => {
    it('should create a session for user', async () => {
      const refreshToken = AuthService.generateRefreshToken(
        testUserId,
        testUserEmail,
        'USER',
        'FREE'
      );
      
      await expect(
        AuthService.createSession(testUserId, refreshToken, '127.0.0.1', 'Jest Test')
      ).resolves.not.toThrow();
    });
  });

  describe('getUserSessions', () => {
    it('should return user sessions', async () => {
      const sessions = await AuthService.getUserSessions(testUserId);
      expect(Array.isArray(sessions)).toBe(true);
    });
  });
});

describe('JwtStrategy', () => {
  const { JwtStrategy } = require('../../src/auth/strategies/jwt.strategy');

  describe('extractTokenFromRequest', () => {
    it('should extract token from Authorization header', () => {
      const req = {
        headers: {
          authorization: 'Bearer test-token-123',
        },
      } as any;
      
      const token = JwtStrategy.extractTokenFromRequest(req);
      expect(token).toBe('test-token-123');
    });

    it('should return null if no token present', () => {
      const req = { headers: {} } as any;
      const token = JwtStrategy.extractTokenFromRequest(req);
      expect(token).toBeNull();
    });
  });

  describe('decodeToken', () => {
    it('should decode token without verification', () => {
      const { AuthService } = require('../../src/auth/services/auth.service');
      const token = AuthService.generateAccessToken('user123', 'test@example.com', 'USER', 'FREE');
      const decoded = JwtStrategy.decodeToken(token);
      
      expect(decoded).toBeDefined();
      expect(decoded?.sub).toBe('user123');
    });
  });
});

describe('LocalStrategy', () => {
  const { LocalStrategy } = require('../../src/auth/strategies/local.strategy');

  describe('validatePasswordStrength', () => {
    it('should accept strong password', () => {
      const result = LocalStrategy.validatePasswordStrength('StrongP@ssw0rd123');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject short password', () => {
      const result = LocalStrategy.validatePasswordStrength('Short1!');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject password without uppercase', () => {
      const result = LocalStrategy.validatePasswordStrength('weakpassword123!');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('uppercase'))).toBe(true);
    });

    it('should reject password without number', () => {
      const result = LocalStrategy.validatePasswordStrength('NoNumbersHere!');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('number'))).toBe(true);
    });

    it('should reject password without special character', () => {
      const result = LocalStrategy.validatePasswordStrength('NoSpecialChars123');
      expect(result.valid).toBe(false);
      expect(result.errors.some((e: string) => e.includes('special'))).toBe(true);
    });
  });
});

describe('RolesGuard', () => {
  const { RolesGuard } = require('../../src/auth/guards/roles.guard');

  describe('hasRole', () => {
    it('should return true for ADMIN checking ADMIN role', () => {
      expect(RolesGuard.hasRole('ADMIN', 'ADMIN')).toBe(true);
    });

    it('should return true for ADMIN checking USER role', () => {
      expect(RolesGuard.hasRole('ADMIN', 'USER')).toBe(true);
    });

    it('should return false for USER checking ADMIN role', () => {
      expect(RolesGuard.hasRole('USER', 'ADMIN')).toBe(false);
    });
  });

  describe('hasPermission', () => {
    it('should return true for ADMIN checking any permission', () => {
      expect(RolesGuard.hasPermission('ADMIN', 'user:read')).toBe(true);
      expect(RolesGuard.hasPermission('ADMIN', 'admin:write')).toBe(true);
    });

    it('should return true for USER checking user:read', () => {
      expect(RolesGuard.hasPermission('USER', 'user:read')).toBe(true);
    });

    it('should return false for USER checking admin:read', () => {
      expect(RolesGuard.hasPermission('USER', 'admin:read')).toBe(false);
    });
  });

  describe('canAccessUser', () => {
    it('should allow ADMIN to access any user', () => {
      const canAccess = RolesGuard.canAccessUser(
        { id: 'admin123', role: 'ADMIN' },
        'otherUser456'
      );
      expect(canAccess).toBe(true);
    });

    it('should allow user to access their own data', () => {
      const canAccess = RolesGuard.canAccessUser(
        { id: 'user123', role: 'USER' },
        'user123'
      );
      expect(canAccess).toBe(true);
    });

    it('should deny user from accessing another user\'s data', () => {
      const canAccess = RolesGuard.canAccessUser(
        { id: 'user123', role: 'USER' },
        'otherUser456'
      );
      expect(canAccess).toBe(false);
    });
  });
});