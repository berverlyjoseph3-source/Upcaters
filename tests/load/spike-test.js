// enterprise-ai-agent-platform/tests/load/spike-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('error_rate');
const requestDuration = new Trend('request_duration');
const requestsTotal = new Counter('requests_total');
const authSuccess = new Rate('auth_success');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 20 }, // Ramp up to 20 users
    { duration: '2m', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 200 }, // Spike to 200 users
    { duration: '2m', target: 500 }, // Spike to 500 users
    { duration: '1m', target: 0 }, // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    error_rate: ['rate<0.05'],
    request_duration: ['avg<300'],
  },
};

// Test data
const users = [];
const baseUrl = __ENV.BASE_URL || 'http://localhost:3000';

// Generate test users
for (let i = 0; i < 100; i++) {
  users.push({
    email: `test${i}@example.com`,
    password: `Password${i}!`,
    name: `Test User ${i}`,
  });
}

export function setup() {
  // Register users
  const registeredUsers = [];
  for (const user of users) {
    const registerRes = http.post(`${baseUrl}/api/auth/register`, JSON.stringify({
      email: user.email,
      password: user.password,
      name: user.name,
      acceptTerms: true,
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (registerRes.status === 201) {
      const body = JSON.parse(registerRes.body);
      registeredUsers.push({
        ...user,
        accessToken: body.data.accessToken,
        refreshToken: body.data.refreshToken,
      });
    }
    sleep(0.1);
  }
  
  return { users: registeredUsers };
}

export default function(data) {
  const user = data.users[Math.floor(Math.random() * data.users.length)];
  if (!user) return;
  
  // Login
  const loginRes = http.post(`${baseUrl}/api/auth/login`, JSON.stringify({
    email: user.email,
    password: user.password,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const loginSuccess = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
  });
  
  authSuccess.add(loginSuccess);
  errorRate.add(!loginSuccess);
  requestsTotal.add(1);
  requestDuration.add(loginRes.timings.duration);
  
  if (!loginSuccess) return;
  
  const tokens = JSON.parse(loginRes.body).data;
  
  // Get user profile
  const profileRes = http.get(`${baseUrl}/api/auth/me`, {
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  check(profileRes, {
    'profile status is 200': (r) => r.status === 200,
  });
  
  requestsTotal.add(1);
  requestDuration.add(profileRes.timings.duration);
  
  // Execute agent
  const agentRes = http.post(`${baseUrl}/api/agent/execute`, JSON.stringify({
    input: 'What is the weather in New York?',
    sessionId: `load-test-${__VU}-${__ITER}`,
  }), {
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  
  check(agentRes, {
    'agent status is 200': (r) => r.status === 200,
  });
  
  requestsTotal.add(1);
  requestDuration.add(agentRes.timings.duration);
  errorRate.add(agentRes.status !== 200);
  
  // Get usage stats
  const usageRes = http.get(`${baseUrl}/api/usage/stats`, {
    headers: {
      'Authorization': `Bearer ${tokens.accessToken}`,
    },
  });
  
  requestsTotal.add(1);
  requestDuration.add(usageRes.timings.duration);
  
  sleep(1);
}

export function teardown(data) {
  // Clean up test users
  for (const user of data.users) {
    // Note: Would need admin token to delete users
    console.log(`User ${user.email} would be cleaned up`);
  }
}