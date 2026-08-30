// enterprise-ai-agent-platform/tests/load/soak-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const requestDuration = new Trend('request_duration');
const requestsTotal = new Counter('requests_total');

// Test configuration - Soak test (long duration, steady load)
export const options = {
  stages: [
    { duration: '5m', target: 50 }, // Ramp up to 50 users
    { duration: '4h', target: 50 }, // Stay at 50 users for 4 hours
    { duration: '5m', target: 0 }, // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000', 'p(99)<2000'],
    error_rate: ['rate<0.01'],
  },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

// Test user
const testUser = {
  email: `soak-test-${Date.now()}@example.com`,
  password: 'SoakTest123!',
  name: 'Soak Test User',
};

let accessToken = '';

export function setup() {
  // Register user
  const registerRes = http.post(`${baseUrl}/api/auth/register`, JSON.stringify({
    email: testUser.email,
    password: testUser.password,
    name: testUser.name,
    acceptTerms: true,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (registerRes.status === 201) {
    const body = JSON.parse(registerRes.body);
    accessToken = body.data.accessToken;
  }
  
  return { accessToken };
}

export default function(data) {
  const token = data.accessToken;
  if (!token) return;
  
  // Mix of different API calls
  
  // 40% - Get user profile
  if (__ITER % 10 < 4) {
    const res = http.get(`${baseUrl}/api/auth/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    check(res, { 'profile status is 200': (r) => r.status === 200 });
    requestsTotal.add(1);
    requestDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  }
  
  // 30% - Execute agent
  else if (__ITER % 10 < 7) {
    const res = http.post(`${baseUrl}/api/agent/execute`, JSON.stringify({
      input: 'Send a test email',
      sessionId: `soak-test-${__VU}-${__ITER}`,
    }), {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    check(res, { 'agent status is 200': (r) => r.status === 200 });
    requestsTotal.add(1);
    requestDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  }
  
  // 20% - Get usage stats
  else if (__ITER % 10 < 9) {
    const res = http.get(`${baseUrl}/api/usage/stats`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    check(res, { 'usage status is 200': (r) => r.status === 200 });
    requestsTotal.add(1);
    requestDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  }
  
  // 10% - Get billing summary
  else {
    const res = http.get(`${baseUrl}/api/billing/summary`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    
    check(res, { 'billing status is 200': (r) => r.status === 200 });
    requestsTotal.add(1);
    requestDuration.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  }
  
  // Random sleep between 1-5 seconds to simulate real user behavior
  sleep(Math.random() * 4 + 1);
}

export function teardown(data) {
  // Clean up
  console.log('Soak test completed');
}