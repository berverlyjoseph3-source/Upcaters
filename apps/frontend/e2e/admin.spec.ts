// enterprise-ai-agent-platform/apps/frontend/e2e/admin.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Admin Panel', () => {
  const adminEmail = `admin-${Date.now()}@example.com`;
  const adminPassword = 'Admin123!';
  let adminToken: string;
  
  test.beforeAll(async ({ request }) => {
    // Create admin user via API
    const registerRes = await request.post('/api/auth/register', {
      data: {
        email: adminEmail,
        password: adminPassword,
        name: 'Admin User',
        acceptTerms: true,
      },
    });
    
    const registerData = await registerRes.json();
    
    // Promote to admin (would need direct DB access or admin API)
    // For E2E tests, we'll assume admin user exists
  });
  
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(adminEmail);
    await page.locator('input[type="password"]').fill(adminPassword);
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Navigate to admin panel
    await page.goto('/admin');
    await expect(page.locator('h1')).toContainText('Admin Dashboard');
  });
  
  test.describe('Overview Tab', () => {
    test('should display platform metrics', async ({ page }) => {
      await expect(page.locator('text=Total Users')).toBeVisible();
      await expect(page.locator('text=Active Users')).toBeVisible();
      await expect(page.locator('text=Monthly Recurring Revenue')).toBeVisible();
      await expect(page.locator('text=Total Executions')).toBeVisible();
    });
    
    test('should display plan distribution chart', async ({ page }) => {
      await expect(page.locator('text=Plan Distribution')).toBeVisible();
    });
    
    test('should display service health status', async ({ page }) => {
      await expect(page.locator('text=Service Health')).toBeVisible();
      await expect(page.locator('text=API')).toBeVisible();
      await expect(page.locator('text=Database')).toBeVisible();
      await expect(page.locator('text=Redis')).toBeVisible();
    });
  });
  
  test.describe('Users Management', () => {
    test('should switch to users tab', async ({ page }) => {
      await page.locator('button:has-text("Users")').click();
      await expect(page.locator('input[placeholder="Search users"]')).toBeVisible();
    });
    
    test('should display users table', async ({ page }) => {
      await page.locator('button:has-text("Users")').click();
      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('th:has-text("User")')).toBeVisible();
      await expect(page.locator('th:has-text("Plan")')).toBeVisible();
      await expect(page.locator('th:has-text("Role")')).toBeVisible();
    });
    
    test('should search for users', async ({ page }) => {
      await page.locator('button:has-text("Users")').click();
      await page.locator('input[placeholder="Search users"]').fill(adminEmail);
      await expect(page.locator(`text=${adminEmail}`)).toBeVisible();
    });
    
    test('should filter users by plan', async ({ page }) => {
      await page.locator('button:has-text("Users")').click();
      await page.locator('button:has-text("Filters")').click();
      await page.locator('select').selectOption('PROFESSIONAL');
      await page.locator('button:has-text("Apply Filters")').click();
      await expect(page.locator('.animate-spin')).toBeVisible();
    });
    
    test('should open user edit modal', async ({ page }) => {
      await page.locator('button:has-text("Users")').click();
      await page.locator('button[aria-label="Edit"]').first().click();
      await expect(page.locator('h2:has-text("Change User Plan")')).toBeVisible();
    });
  });
  
  test.describe('Revenue Analytics', () => {
    test('should switch to revenue tab', async ({ page }) => {
      await page.locator('button:has-text("Revenue")').click();
      await expect(page.locator('text=Monthly Recurring Revenue')).toBeVisible();
      await expect(page.locator('text=Annual Recurring Revenue')).toBeVisible();
    });
    
    test('should display revenue chart', async ({ page }) => {
      await page.locator('button:has-text("Revenue")').click();
      await expect(page.locator('.recharts-responsive-container')).toBeVisible();
    });
    
    test('should display subscription activity', async ({ page }) => {
      await page.locator('button:has-text("Revenue")').click();
      await expect(page.locator('text=Subscription Activity')).toBeVisible();
    });
  });
  
  test.describe('System Health', () => {
    test('should switch to system health tab', async ({ page }) => {
      await page.locator('button:has-text("System Health")').click();
      await expect(page.locator('text=System Health')).toBeVisible();
    });
    
    test('should display service status cards', async ({ page }) => {
      await page.locator('button:has-text("System Health")').click();
      await expect(page.locator('text=API Gateway')).toBeVisible();
      await expect(page.locator('text=Database (PostgreSQL)')).toBeVisible();
      await expect(page.locator('text=Redis Cache')).toBeVisible();
    });
    
    test('should refresh health status', async ({ page }) => {
      await page.locator('button:has-text("System Health")').click();
      await page.locator('button:has-text("Check Now")').click();
      await expect(page.locator('.animate-spin')).toBeVisible();
    });
  });
  
  test.describe('Audit Logs', () => {
    test('should switch to audit logs tab', async ({ page }) => {
      await page.locator('button:has-text("Audit Logs")').click();
      await expect(page.locator('input[placeholder="Search by user or action"]')).toBeVisible();
    });
    
    test('should display audit logs table', async ({ page }) => {
      await page.locator('button:has-text("Audit Logs")').click();
      await expect(page.locator('table')).toBeVisible();
      await expect(page.locator('th:has-text("Timestamp")')).toBeVisible();
      await expect(page.locator('th:has-text("User")')).toBeVisible();
      await expect(page.locator('th:has-text("Action")')).toBeVisible();
    });
    
    test('should filter audit logs by action', async ({ page }) => {
      await page.locator('button:has-text("Audit Logs")').click();
      await page.locator('select').selectOption('user_create');
      await expect(page.locator('.animate-spin')).toBeVisible();
    });
    
    test('should export audit logs', async ({ page }) => {
      await page.locator('button:has-text("Audit Logs")').click();
      await page.locator('button:has-text("Export")').click();
      // Check for download trigger
      await expect(page.locator('text=Download started')).toBeVisible();
    });
  });
  
  test.describe('Announcements', () => {
    test('should switch to announcements tab', async ({ page }) => {
      await page.locator('button:has-text("Announcements")').click();
      await expect(page.locator('button:has-text("New Announcement")')).toBeVisible();
    });
    
    test('should create new announcement', async ({ page }) => {
      await page.locator('button:has-text("Announcements")').click();
      await page.locator('button:has-text("New Announcement")').click();
      await page.locator('input[placeholder="Announcement title"]').fill('Test Announcement');
      await page.locator('textarea[placeholder="Announcement content"]').fill('This is a test announcement');
      await page.locator('button:has-text("Save")').click();
      
      await expect(page.locator('text=Test Announcement')).toBeVisible();
    });
  });
  
  test.describe('Settings', () => {
    test('should switch to settings tab', async ({ page }) => {
      await page.locator('button:has-text("Settings")').click();
      await expect(page.locator('text=System Settings')).toBeVisible();
    });
    
    test('should update company name', async ({ page }) => {
      await page.locator('button:has-text("Settings")').click();
      await page.locator('input[value*="AI Agent Platform"]').fill('Test Company');
      await page.locator('button:has-text("Save Settings")').click();
      await expect(page.locator('text=Settings saved')).toBeVisible();
    });
  });
});