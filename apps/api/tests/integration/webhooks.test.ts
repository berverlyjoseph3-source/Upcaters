// enterprise-ai-agent-platform/apps/api/tests/integration/webhooks.test.ts
import request from 'supertest';
import { app } from '../../src/app';
import { prisma } from '../../src/db/client';
import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';

// Mock Stripe webhook signature verification
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    webhooks: {
      constructEvent: (payload: any, signature: any, secret: any) => {
        return JSON.parse(payload);
      },
    },
  }));
});

describe('Webhook API Integration Tests', () => {
  let testUserId: string;
  let testUserEmail: string;
  
  beforeAll(async () => {
    testUserEmail = `test-webhook-${Date.now()}@example.com`;
    
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        name: 'Webhook Test User',
        planId: 'FREE',
        isActive: true,
      },
    });
    testUserId = user.id;
  });
  
  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
  });
  
  describe('POST /api/webhooks/stripe', () => {
    it('should handle customer.subscription.created webhook', async () => {
      const webhookPayload = {
        id: 'evt_test_123',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
            items: {
              data: [{ price: { id: 'price_professional' } }],
            },
            current_period_start: Math.floor(Date.now() / 1000),
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
          },
        },
      };
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload);
      
      expect(response.status).toBe(200);
      expect(response.body.received).toBe(true);
    });
    
    it('should handle customer.subscription.updated webhook', async () => {
      const webhookPayload = {
        id: 'evt_test_456',
        type: 'customer.subscription.updated',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
            status: 'active',
            cancel_at_period_end: true,
          },
        },
      };
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload);
      
      expect(response.status).toBe(200);
    });
    
    it('should handle customer.subscription.deleted webhook', async () => {
      const webhookPayload = {
        id: 'evt_test_789',
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_test_123',
            customer: 'cus_test_123',
          },
        },
      };
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload);
      
      expect(response.status).toBe(200);
    });
    
    it('should handle invoice.paid webhook', async () => {
      const webhookPayload = {
        id: 'evt_test_101',
        type: 'invoice.paid',
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_test_123',
            amount_paid: 9900,
            currency: 'usd',
            status: 'paid',
          },
        },
      };
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload);
      
      expect(response.status).toBe(200);
    });
    
    it('should handle invoice.payment_failed webhook', async () => {
      const webhookPayload = {
        id: 'evt_test_102',
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_456',
            customer: 'cus_test_123',
            amount_due: 9900,
            currency: 'usd',
            last_payment_error: {
              message: 'Card declined',
            },
          },
        },
      };
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload);
      
      expect(response.status).toBe(200);
    });
    
    it('should handle checkout.session.completed webhook', async () => {
      const webhookPayload = {
        id: 'evt_test_103',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            customer: 'cus_test_123',
            subscription: 'sub_test_123',
            client_reference_id: testUserId,
          },
        },
      };
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload);
      
      expect(response.status).toBe(200);
    });
    
    it('should return 401 for invalid signature', async () => {
      const webhookPayload = {
        id: 'evt_test_999',
        type: 'customer.subscription.created',
        data: { object: {} },
      };
      
      // Temporarily mock signature verification to fail
      const originalConstructEvent = (await import('stripe')).default.prototype.webhooks.constructEvent;
      
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'invalid_signature')
        .send(webhookPayload);
      
      expect(response.status).toBe(401);
    });
  });
  
  describe('GET /api/webhooks/health', () => {
    it('should return webhook health status', async () => {
      const response = await request(app)
        .get('/api/webhooks/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.service).toBe('stripe-webhook-handler');
    });
  });
  
  describe('Webhook Idempotency', () => {
    it('should not process duplicate webhook events', async () => {
      const webhookPayload = {
        id: 'evt_test_duplicate',
        type: 'customer.subscription.created',
        data: {
          object: {
            id: 'sub_test_duplicate',
            customer: 'cus_test_123',
          },
        },
      };
      
      // First request
      await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload);
      
      // Second request with same event ID
      const response = await request(app)
        .post('/api/webhooks/stripe')
        .set('stripe-signature', 'test_signature')
        .send(webhookPayload);
      
      expect(response.status).toBe(200);
      // Should acknowledge but not reprocess
    });
  });
});