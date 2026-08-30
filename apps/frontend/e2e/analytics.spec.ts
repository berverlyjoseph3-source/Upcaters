// enterprise-ai-agent-platform/apps/frontend/e2e/analytics.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Analytics Page', () => {
  const testEmail = `analytics-test-${Date.now()}@example.com`;
  const testPassword = 'Analytics123!';
  
  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('/register');
    await page.locator('input[name="name"]').fill('Analytics Test User');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').first().fill(testPassword);
    await page.locator('input[type="password"]').nth(1).fill(testPassword);
    await page.locator('input[name="acceptTerms"]').check();
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Navigate to analytics page
    await page.goto('/analytics');
    await expect(page.locator('h1')).toContainText('Analytics');
  });
  
  test.describe('Overview Tab', () => {
    test('should display summary metrics', async ({ page }) => {
      await expect(page.locator('text=AI Actions')).toBeVisible();
      await expect(page.locator('text=API Calls')).toBeVisible();
      await expect(page.locator('text=Total Cost')).toBeVisible();
      await expect(page.locator('text=Tokens Used')).toBeVisible();
    });
    
    test('should display usage trend chart', async ({ page }) => {
      await expect(page.locator('.recharts-responsive-container')).toBeVisible();
    });
    
    test('should display usage by agent chart', async ({ page }) => {
      await expect(page.locator('text=Usage by Agent')).toBeVisible();
    });
    
    test('should display top actions', async ({ page }) => {
      await expect(page.locator('text=Top Actions')).toBeVisible();
    });
  });
  
  test.describe('Filters', () => {
    test('should open filter panel', async ({ page }) => {
      await page.locator('button:has-text("Filters")').click();
      await expect(page.locator('text=Date Range')).toBeVisible();
    });
    
    test('should apply date range filter', async ({ page }) => {
      await page.locator('button:has-text("Filters")').click();
      await page.locator('button:has-text("Last 30 days")').click();
      await page.locator('button:has-text("Apply")').click();
      await expect(page.locator('.animate-spin')).toBeVisible();
    });
    
    test('should filter by agent type', async ({ page }) => {
      await page.locator('button:has-text("Filters")').click();
      await page.locator('text=Email').click();
      await page.locator('button:has-text("Apply")').click();
      await expect(page.locator('.animate-spin')).toBeVisible();
    });
  });
  
  test.describe('Export Functionality', () => {
    test('should open export modal', async ({ page }) => {
      await page.locator('button:has-text("Export")').click();
      await expect(page.locator('h2:has-text("Export Analytics")')).toBeVisible();
    });
    
    test('should have CSV export option', async ({ page }) => {
      await page.locator('button:has-text("Export")').click();
      await expect(page.locator('text=CSV')).toBeVisible();
    });
    
    test('should have JSON export option', async ({ page }) => {
      await page.locator('button:has-text("Export")').click();
      await expect(page.locator('text=JSON')).toBeVisible();
    });
    
    test('should have PDF export option', async ({ page }) => {
      await page.locator('button:has-text("Export")').click();
      await expect(page.locator('text=PDF')).toBeVisible();
    });
  });
  
  test.describe('Breakdown Tab', () => {
    test('should switch to breakdown tab', async ({ page }) => {
      await page.locator('button:has-text("Breakdown")').click();
      await expect(page.locator('text=Total Agents')).toBeVisible();
    });
    
    test('should display by agent view', async ({ page }) => {
      await page.locator('button:has-text("Breakdown")').click();
      await expect(page.locator('button:has-text("By Agent")')).toBeVisible();
    });
    
    test('should display by action view', async ({ page }) => {
      await page.locator('button:has-text("Breakdown")').click();
      await page.locator('button:has-text("By Action")').click();
      await expect(page.locator('text=By Action')).toBeVisible();
    });
  });
  
  test.describe('Cost Analysis Tab', () => {
    test('should switch to cost analysis tab', async ({ page }) => {
      await page.locator('button:has-text("Cost Analysis")').click();
      await expect(page.locator('text=Total Cost')).toBeVisible();
    });
    
    test('should display cost trend chart', async ({ page }) => {
      await page.locator('button:has-text("Cost Analysis")').click();
      await expect(page.locator('.recharts-responsive-container')).toBeVisible();
    });
  });
  
  test.describe('Forecast Tab', () => {
    test('should switch to forecast tab', async ({ page }) => {
      await page.locator('button:has-text("Forecast")').click();
      await expect(page.locator('text=Forecast Period')).toBeVisible();
    });
    
    test('should display forecast chart', async ({ page }) => {
      await page.locator('button:has-text("Forecast")').click();
      await expect(page.locator('.recharts-responsive-container')).toBeVisible();
    });
  });
});