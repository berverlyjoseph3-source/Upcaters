// enterprise-ai-agent-platform/apps/frontend/e2e/global-teardown.ts
import { FullConfig } from '@playwright/test';
import { request } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('Starting E2E test teardown...');
  
  // Login as admin to get token for cleanup
  const apiContext = await request.newContext({
    baseURL: process.env.API_BASE_URL || 'http://localhost:3000',
  });
  
  // Login as admin
  const loginRes = await apiContext.post('/api/auth/login', {
    data: {
      email: process.env.TEST_ADMIN_EMAIL,
      password: process.env.TEST_ADMIN_PASSWORD,
    },
  });
  
  if (loginRes.ok()) {
    const { data } = await loginRes.json();
    const token = data.accessToken;
    
    // Delete test admin user
    await apiContext.delete(`/api/admin/users/${process.env.TEST_ADMIN_EMAIL}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    // Delete test regular user
    await apiContext.delete(`/api/admin/users/${process.env.TEST_USER_EMAIL}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    
    console.log('Test users cleaned up');
  }
  
  console.log('E2E test teardown completed');
}

export default globalTeardown;