// enterprise-ai-agent-platform/apps/api/tests/integration/admin.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Admin API Integration Tests', () => {
  let adminUserId: string;
  let adminEmail: string;
  let adminToken: string;
  let regularUserId: string;
  let regularUserEmail: string;
  let regularUserToken: string;
  
  beforeAll(async () => {
    // Create admin user
    adminEmail = `admin-${Date.now()}@example.com`;
    const adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        name: 'Admin User',
        planId: 'ENTERPRISE',
        role: 'ADMIN',
        isActive: true,
      },
    });
    adminUserId = adminUser.id;
    
    // Create regular user
    regularUserEmail = `user-${Date.now()}@example.com`;
    const regularUser = await prisma.user.create({
      data: {
        email: regularUserEmail,
        name: 'Regular User',
        planId: 'FREE',
        role: 'USER',
        isActive: true,
      },
    });
    regularUserId = regularUser.id;
    
    const { AuthService } = await import('../../src/auth/services/auth.service');
    adminToken = AuthService.generateAccessToken(adminUserId, adminEmail, 'ADMIN', 'ENTERPRISE');
    regularUserToken = AuthService.generateAccessToken(regularUserId, regularUserEmail, 'USER', 'FREE');
  });
  
  afterAll(async () => {
    await prisma.user.delete({ where: { id: adminUserId } }).catch(() => {});
    await prisma.user.delete({ where: { id: regularUserId } }).catch(() => {});
  });
  
  describe('Admin Access Control', () => {
    it('should allow admin to access admin endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
    });
    
    it('should deny regular user access to admin endpoints', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${regularUserToken}`);
      
      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
    });
    
    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/admin/users');
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/admin/users', () => {
    it('should return paginated list of users', async () => {
      const response = await request(app)
        .get('/api/admin/users?page=1&limit=10')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(response.body.data.total).toBeDefined();
      expect(response.body.data.page).toBe(1);
    });
    
    it('should filter users by search', async () => {
      const response = await request(app)
        .get(`/api/admin/users?search=${adminEmail}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.data.users.length).toBeGreaterThan(0);
      expect(response.body.data.users[0].email).toBe(adminEmail);
    });
    
    it('should filter users by plan', async () => {
      const response = await request(app)
        .get('/api/admin/users?planId=FREE')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      const freeUsers = response.body.data.users.filter((u: any) => u.planId === 'FREE');
      expect(freeUsers.length).toBeGreaterThan(0);
    });
  });
  
  describe('GET /api/admin/users/:userId', () => {
    it('should return specific user details', async () => {
      const response = await request(app)
        .get(`/api/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe(regularUserId);
      expect(response.body.data.email).toBe(regularUserEmail);
    });
    
    it('should return 404 for non-existent user', async () => {
      const response = await request(app)
        .get('/api/admin/users/non-existent-id')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(404);
    });
  });
  
  describe('PUT /api/admin/users/:userId', () => {
    it('should update user plan', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          planId: 'PROFESSIONAL',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify update
      const updatedUser = await prisma.user.findUnique({ where: { id: regularUserId } });
      expect(updatedUser?.planId).toBe('PROFESSIONAL');
    });
    
    it('should update user role', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          role: 'SUPPORT',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('should update user status', async () => {
      const response = await request(app)
        .put(`/api/admin/users/${regularUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          isActive: false,
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('GET /api/admin/metrics/platform', () => {
    it('should return platform metrics', async () => {
      const response = await request(app)
        .get('/api/admin/metrics/platform')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.users).toBeDefined();
      expect(response.body.data.executions).toBeDefined();
      expect(response.body.data.revenue).toBeDefined();
    });
  });
  
  describe('GET /api/admin/audit-logs', () => {
    it('should return audit logs', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.data).toBeDefined();
      expect(Array.isArray(response.body.data.data)).toBe(true);
    });
    
    it('should filter audit logs by action', async () => {
      const response = await request(app)
        .get('/api/admin/audit-logs?action=user_update')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('GET /api/admin/export/users', () => {
    it('should export users as CSV', async () => {
      const response = await request(app)
        .get('/api/admin/export/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
    });
  });
});