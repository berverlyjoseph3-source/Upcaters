// enterprise-ai-agent-platform/apps/api/tests/integration/auth.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Auth API Integration Tests', () => {
  let testUserEmail: string;
  let testUserId: string;
  let accessToken: string;
  let refreshToken: string;
  
  beforeAll(async () => {
    testUserEmail = `test-${Date.now()}@example.com`;
  });
  
  afterAll(async () => {
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });
  
  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUserEmail,
          name: 'Test User',
          password: 'TestPassword123!',
          confirmPassword: 'TestPassword123!',
          acceptTerms: true,
        });
      
      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.user.email).toBe(testUserEmail);
      expect(response.body.data.user.planId).toBe('FREE');
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
      
      testUserId = response.body.data.user.id;
      accessToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });
    
    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: testUserEmail,
          password: 'TestPassword123!',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    it('should return 400 for weak password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `weak-${Date.now()}@example.com`,
          name: 'Weak Password',
          password: 'weak',
          confirmPassword: 'weak',
          acceptTerms: true,
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    it('should return 400 for mismatched passwords', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: `mismatch-${Date.now()}@example.com`,
          name: 'Mismatch',
          password: 'Password123!',
          confirmPassword: 'Password456!',
          acceptTerms: true,
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'TestPassword123!',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });
    
    it('should return 401 for invalid password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'WrongPassword123!',
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    it('should return 401 for non-existent email', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'Password123!',
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    it('should return 429 for too many failed attempts', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post('/api/auth/login')
          .send({
            email: testUserEmail,
            password: 'WrongPassword123!',
          });
      }
      
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: testUserEmail,
          password: 'WrongPassword123!',
        });
      
      expect(response.status).toBe(429);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/auth/refresh', () => {
    it('should refresh access token successfully', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: refreshToken,
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accessToken).toBeDefined();
      expect(response.body.data.refreshToken).toBeDefined();
    });
    
    it('should return 401 for invalid refresh token', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-token',
        });
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/auth/me', () => {
    it('should get current user profile with valid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(testUserId);
      expect(response.body.data.email).toBe(testUserEmail);
    });
    
    it('should return 401 without token', async () => {
      const response = await request(app)
        .get('/api/auth/me');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
    
    it('should return 401 with invalid token', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');
      
      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
  
  describe('POST /api/auth/forgot-password', () => {
    it('should send password reset email for existing user', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: testUserEmail,
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
    
    it('should return 200 even for non-existent user (security)', async () => {
      const response = await request(app)
        .post('/api/auth/forgot-password')
        .send({
          email: 'nonexistent@example.com',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});