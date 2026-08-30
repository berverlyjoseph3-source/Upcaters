// enterprise-ai-agent-platform/apps/api/tests/integration/billing.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';

describe('Billing API Integration Tests', () => {
  let testUserId: string;
  let testUserEmail: string;
  let accessToken: string;
  let stripeCustomerId: string;
  
  beforeAll(async () => {
    testUserEmail = `test-billing-${Date.now()}@example.com`;
    
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: 'Billing Test User',
        planId: 'FREE',
        isActive: true,
      },
    });
    testUserId = user.id;
    
    const { AuthService } = await import('../../src/auth/services/auth.service');
    accessToken = AuthService.generateAccessToken(testUserId, testUserEmail, 'USER', 'FREE');
  });
  
  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });
  
  describe('GET /api/billing/plans', () => {
    it('should return all available plans', async () => {
      const response = await request(app)
        .get('/api/billing/plans')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
      
      const plans = response.body.data;
      const planNames = plans.map((p: any) => p.id);
      expect(planNames).toContain('FREE');
      expect(planNames).toContain('STARTER');
      expect(planNames).toContain('PROFESSIONAL');
      expect(planNames).toContain('ENTERPRISE');
    });
    
    it('should include pricing information', async () => {
      const response = await request(app)
        .get('/api/billing/plans')
        .set('Authorization', `Bearer ${accessToken}`);
      
      const professionalPlan = response.body.data.find((p: any) => p.id === 'PROFESSIONAL');
      expect(professionalPlan.priceMonthly).toBe(9900);
      expect(professionalPlan.priceYearly).toBe(95040);
      expect(professionalPlan.currency).toBe('usd');
    });
  });
  
  describe('POST /api/billing/create-checkout', () => {
    it('should create checkout session for valid plan', async () => {
      const response = await request(app)
        .post('/api/billing/create-checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          planId: 'PROFESSIONAL',
          interval: 'month',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.sessionId).toBeDefined();
      expect(response.body.data.sessionUrl).toBeDefined();
    });
    
    it('should return 400 for invalid plan', async () => {
      const response = await request(app)
        .post('/api/billing/create-checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          planId: 'INVALID_PLAN',
          interval: 'month',
          successUrl: 'https://example.com/success',
          cancelUrl: 'https://example.com/cancel',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
    
    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/billing/create-checkout')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          planId: 'PROFESSIONAL',
        });
      
      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
  
  describe('GET /api/billing/subscription', () => {
    it('should return current subscription for free user', async () => {
      const response = await request(app)
        .get('/api/billing/subscription')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull(); // Free plan has no subscription
    });
  });
  
  describe('GET /api/billing/summary', () => {
    it('should return billing summary', async () => {
      const response = await request(app)
        .get('/api/billing/summary')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.currentPlan).toBeDefined();
      expect(response.body.data.usage).toBeDefined();
      expect(response.body.data.invoices).toBeDefined();
    });
    
    it('should include current plan information', async () => {
      const response = await request(app)
        .get('/api/billing/summary')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.body.data.currentPlan.id).toBe('FREE');
      expect(response.body.data.currentPlan.name).toBe('Free');
    });
  });
  
  describe('GET /api/billing/invoices', () => {
    it('should return empty invoice list for free user', async () => {
      const response = await request(app)
        .get('/api/billing/invoices')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.invoices).toBeDefined();
      expect(Array.isArray(response.body.data.invoices)).toBe(true);
    });
  });
  
  describe('GET /api/billing/invoices/upcoming', () => {
    it('should return null for free user (no upcoming invoice)', async () => {
      const response = await request(app)
        .get('/api/billing/invoices/upcoming')
        .set('Authorization', `Bearer ${accessToken}`);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeNull();
    });
  });
  
  describe('POST /api/billing/validate-coupon', () => {
    it('should validate coupon code', async () => {
      const response = await request(app)
        .post('/api/billing/validate-coupon')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          couponCode: 'TEST50',
          planId: 'PROFESSIONAL',
          interval: 'month',
        });
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});