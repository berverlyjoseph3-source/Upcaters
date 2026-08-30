// enterprise-ai-agent-platform/apps/api/tests/helpers/api-client.ts
import request from 'supertest';
import { app } from '../../src/app';

export class TestApiClient {
  private agent: request.SuperTest<request.Test>;
  private authToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    this.agent = request(app);
  }

  setAuthToken(token: string): this {
    this.authToken = token;
    return this;
  }

  setRefreshToken(token: string): this {
    this.refreshToken = token;
    return this;
  }

  clearTokens(): this {
    this.authToken = null;
    this.refreshToken = null;
    return this;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {};
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  // Auth endpoints
  async register(data: {
    email: string;
    password: string;
    name?: string;
    acceptTerms: boolean;
  }) {
    return this.agent
      .post('/api/auth/register')
      .send(data)
      .set(this.getHeaders());
  }

  async login(email: string, password: string) {
    return this.agent
      .post('/api/auth/login')
      .send({ email, password })
      .set(this.getHeaders());
  }

  async logout() {
    return this.agent
      .post('/api/auth/logout')
      .set(this.getHeaders());
  }

  async refresh(refreshToken: string) {
    return this.agent
      .post('/api/auth/refresh')
      .send({ refreshToken })
      .set(this.getHeaders());
  }

  async getMe() {
    return this.agent
      .get('/api/auth/me')
      .set(this.getHeaders());
  }

  async forgotPassword(email: string) {
    return this.agent
      .post('/api/auth/forgot-password')
      .send({ email })
      .set(this.getHeaders());
  }

  async resetPassword(token: string, newPassword: string) {
    return this.agent
      .post('/api/auth/reset-password')
      .send({ token, newPassword })
      .set(this.getHeaders());
  }

  // User endpoints
  async getProfile() {
    return this.agent
      .get('/api/user/profile')
      .set(this.getHeaders());
  }

  async updateProfile(data: { name?: string; avatarUrl?: string }) {
    return this.agent
      .put('/api/user/profile')
      .send(data)
      .set(this.getHeaders());
  }

  async getConnections() {
    return this.agent
      .get('/api/user/connections')
      .set(this.getHeaders());
  }

  async getApiKeys() {
    return this.agent
      .get('/api/user/api-keys')
      .set(this.getHeaders());
  }

  async generateApiKey(name: string) {
    return this.agent
      .post('/api/user/api-keys')
      .send({ name })
      .set(this.getHeaders());
  }

  async revokeApiKey() {
    return this.agent
      .delete('/api/user/api-keys')
      .set(this.getHeaders());
  }

  // Agent endpoints
  async executeAgent(input: string, sessionId?: string, agentType?: string) {
    return this.agent
      .post('/api/agent/execute')
      .send({ input, sessionId, agentType })
      .set(this.getHeaders());
  }

  async streamAgent(input: string, sessionId?: string, agentType?: string) {
    return this.agent
      .post('/api/agent/stream')
      .send({ input, sessionId, agentType })
      .set(this.getHeaders());
  }

  async getAgentStatus() {
    return this.agent
      .get('/api/agent/status')
      .set(this.getHeaders());
  }

  async listAgents() {
    return this.agent
      .get('/api/agent/agents')
      .set(this.getHeaders());
  }

  async getAgentTools(agentType: string) {
    return this.agent
      .get(`/api/agent/agents/${agentType}/tools`)
      .set(this.getHeaders());
  }

  async executeSpecificAgent(agentType: string, input: string) {
    return this.agent
      .post(`/api/agent/${agentType}/execute`)
      .send({ input })
      .set(this.getHeaders());
  }

  // Usage endpoints
  async getUsageStats(startDate?: string, endDate?: string) {
    const query: Record<string, string> = {};
    if (startDate) query.startDate = startDate;
    if (endDate) query.endDate = endDate;
    return this.agent
      .get('/api/usage/stats')
      .query(query)
      .set(this.getHeaders());
  }

  async getUsageLimits() {
    return this.agent
      .get('/api/usage/limits')
      .set(this.getHeaders());
  }

  async getUsageHistory(months: number = 6) {
    return this.agent
      .get('/api/usage/history')
      .query({ months })
      .set(this.getHeaders());
  }

  async exportUsage() {
    return this.agent
      .get('/api/usage/export')
      .set(this.getHeaders());
  }

  // Billing endpoints
  async getPlans() {
    return this.agent
      .get('/api/billing/plans')
      .set(this.getHeaders());
  }

  async createCheckout(data: { planId: string; interval: 'month' | 'year' }) {
    return this.agent
      .post('/api/billing/create-checkout')
      .send(data)
      .set(this.getHeaders());
  }

  async getSubscription() {
    return this.agent
      .get('/api/billing/subscription')
      .set(this.getHeaders());
  }

  async updateSubscription(data: { planId?: string; interval?: 'month' | 'year' }) {
    return this.agent
      .put('/api/billing/subscription')
      .send(data)
      .set(this.getHeaders());
  }

  async cancelSubscription(atPeriodEnd: boolean = true) {
    return this.agent
      .delete('/api/billing/subscription')
      .send({ atPeriodEnd })
      .set(this.getHeaders());
  }

  async getBillingSummary() {
    return this.agent
      .get('/api/billing/summary')
      .set(this.getHeaders());
  }

  async getInvoices(limit?: number, offset?: number) {
    const query: Record<string, number> = {};
    if (limit) query.limit = limit;
    if (offset) query.offset = offset;
    return this.agent
      .get('/api/billing/invoices')
      .query(query)
      .set(this.getHeaders());
  }

  async getUpcomingInvoice() {
    return this.agent
      .get('/api/billing/invoices/upcoming')
      .set(this.getHeaders());
  }

  // Admin endpoints
  async adminGetUsers(page?: number, limit?: number) {
    const query: Record<string, number> = {};
    if (page) query.page = page;
    if (limit) query.limit = limit;
    return this.agent
      .get('/api/admin/users')
      .query(query)
      .set(this.getHeaders());
  }

  async adminGetUser(userId: string) {
    return this.agent
      .get(`/api/admin/users/${userId}`)
      .set(this.getHeaders());
  }

  async adminUpdateUser(userId: string, data: any) {
    return this.agent
      .put(`/api/admin/users/${userId}`)
      .send(data)
      .set(this.getHeaders());
  }

  async adminSuspendUser(userId: string, reason?: string) {
    return this.agent
      .post(`/api/admin/users/${userId}/suspend`)
      .send({ reason })
      .set(this.getHeaders());
  }

  async adminActivateUser(userId: string) {
    return this.agent
      .post(`/api/admin/users/${userId}/activate`)
      .set(this.getHeaders());
  }

  async adminDeleteUser(userId: string) {
    return this.agent
      .delete(`/api/admin/users/${userId}`)
      .set(this.getHeaders());
  }

  async getPlatformMetrics() {
    return this.agent
      .get('/api/admin/metrics/platform')
      .set(this.getHeaders());
  }

  async getAuditLogs(page?: number, limit?: number) {
    const query: Record<string, number> = {};
    if (page) query.page = page;
    if (limit) query.limit = limit;
    return this.agent
      .get('/api/admin/audit-logs')
      .query(query)
      .set(this.getHeaders());
  }

  // Health endpoints
  async health() {
    return this.agent.get('/health');
  }

  async ready() {
    return this.agent.get('/health/ready');
  }

  async live() {
    return this.agent.get('/health/live');
  }

  async metrics() {
    return this.agent.get('/health/metrics');
  }

  async dependencies() {
    return this.agent.get('/health/dependencies');
  }
}

export const testApiClient = new TestApiClient();