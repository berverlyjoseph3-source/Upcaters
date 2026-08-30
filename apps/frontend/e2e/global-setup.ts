// enterprise-ai-agent-platform/apps/frontend/e2e/global-setup.ts
import { FullConfig } from '@playwright/test';
import { request } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Starting E2E test setup...');
  
  // Create API request context
  const apiContext = await request.newContext({
    baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
  });
  
  // Create test admin user
  const adminEmail = `admin-${Date.now()}@example.com`;
  const adminPassword = 'Admin123!';
  
  const registerRes = await apiContext.post('/api/auth/register', {
    data: {
      email: adminEmail,
      password: adminPassword,
      name: 'E2E Admin User',
      acceptTerms: true,
    },
  });
  
  if (registerRes.ok()) {
    console.log(`Created admin user: ${adminEmail}`);
  }
  
  // Create test regular user
  const userEmail = `user-${Date.now()}@example.com`;
  const userPassword = 'User123!';
  
  const userRegisterRes = await apiContext.post('/api/auth/register', {
    data: {
      email: userEmail,
      password: userPassword,
      name: 'E2E Regular User',
      acceptTerms: true,
    },
  });
  
  if (userRegisterRes.ok()) {
    console.log(`Created regular user: ${userEmail}`);
  }
  
  // Store test users in environment for teardown
  process.env.TEST_ADMIN_EMAIL = adminEmail;
  process.env.TEST_ADMIN_PASSWORD = adminPassword;
  process.env.TEST_USER_EMAIL = userEmail;
  process.env.TEST_USER_PASSWORD = userPassword;
  
  console.log('E2E test setup completed');
}

export default globalSetup;