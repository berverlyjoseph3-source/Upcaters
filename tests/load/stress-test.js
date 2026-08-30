// enterprise-ai-agent-platform/tests/load/stress-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const requestDuration = new Trend('request_duration');
const requestsTotal = new Counter('requests_total');

// Test configuration - Stress test (find breaking point)
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 500 }, // Ramp up to 500 users
    { duration: '5m', target: 1000 }, // Ramp up to 1000 users
    { duration: '5m', target: 1500 }, // Ramp up to 1500 users
    { duration: '10m', target: 1500 }, // Stay at 1500 users
    { duration: '5m', target: 0 }, // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    error_rate: ['rate<0.1'], // Allow up to 10% error rate under extreme load
  },
};

const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

// Different test scenarios
const scenarios = [
  { name: 'auth', weight: 2 },
  { name: 'agent', weight: 5 },
  { name: 'usage', weight: 2 },
  { name: 'billing', weight: 1 },
];

let testUser = null;
let accessToken = null;

export function setup() {
  // Create a test user for stress testing
  const email = `stress-test-${Date.now()}@example.com`;
  const registerRes = http.post(`${baseUrl}/api/auth/register`, JSON.stringify({
    email: email,
    password: 'StressTest123!',
    name: 'Stress Test User',
    acceptTerms: true,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (registerRes.status === 201) {
    const body = JSON.parse(registerRes.body);
    testUser = { email };
    accessToken = body.data.accessToken;
  }
  
  return { accessToken, email: testUser?.email };
}

export default function(data) {
  const token = data.accessToken;
  if (!token) return;
  
  // Select random scenario based on weights
  const random = Math.random() * 10;
  let scenario;
  
  if (random < 2) scenario = 'auth';
  else if (random < 7) scenario = 'agent';
  else if (random < 9) scenario = 'usage';
  else scenario = 'billing';
  
  let res;
  const startTime = Date.now();
  
  switch (scenario) {
    case 'auth':
      // Refresh token
      res = http.post(`${baseUrl}/api/auth/refresh`, JSON.stringify({
        refreshToken: token,
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
      break;
      
    case 'agent':
      // Execute different agent types
      const agents = ['email', 'web', 'calendar', 'task'];
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const prompts = {
        email: 'Show my recent emails',
        web: 'Search for latest news',
        calendar: 'Show my schedule for today',
        task: 'List my pending tasks',
      };
      
      res = http.post(`${baseUrl}/api/agent/${agent}/execute`, JSON.stringify({
        input: prompts[agent],
        sessionId: `stress-${__VU}-${__ITER}`,
      }), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      break;
      
    case 'usage':
      // Get usage statistics
      res = http.get(`${baseUrl}/api/usage/stats`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      break;
      
    case 'billing':
      // Get billing summary
      res = http.get(`${baseUrl}/api/billing/summary`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      break;
  }
  
  const duration = Date.now() - startTime;
  
  // Record metrics
  const success = res && res.status >= 200 && res.status < 500;
  requestsTotal.add(1);
  requestDuration.add(duration);
  errorRate.add(!success);
  
  // Log slow requests
  if (duration > 5000) {
    console.warn(`Slow request: ${scenario} took ${duration}ms, status ${res?.status}`);
  }
  
  // Simulate think time
  sleep(Math.random() * 2);
}

export function handleSummary(data) {
  const summary = {
    timestamp: new Date().toISOString(),
    metrics: {
      http_req_duration: data.metrics.http_req_duration,
      error_rate: data.metrics.error_rate,
      requests_total: data.metrics.requests_total,
    },
    checks: data.metrics.checks,
  };
  
  // Output to file for analysis
  return {
    'stress-test-results.json': JSON.stringify(summary, null, 2),
    stdout: `${summary.timestamp} - Stress test completed. Total requests: ${summary.metrics.requests_total.values.count}`,
  };
}