// enterprise-ai-agent-platform/apps/frontend/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  const testEmail = `dashboard-test-${Date.now()}@example.com`;
  const testPassword = 'Dashboard123!';
  
  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('/register');
    await page.locator('input[name="name"]').fill('Dashboard Test User');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').first().fill(testPassword);
    await page.locator('input[type="password"]').nth(1).fill(testPassword);
    await page.locator('input[name="acceptTerms"]').check();
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*dashboard/);
  });
  
  test('should display dashboard header', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Welcome back');
    await expect(page.locator('text=AI Agents')).toBeVisible();
  });
  
  test('should display usage statistics', async ({ page }) => {
    await expect(page.locator('.text-2xl.font-bold').first()).toBeVisible();
    await expect(page.locator('text=AI Actions used')).toBeVisible();
  });
  
  test('should display agent cards', async ({ page }) => {
    await expect(page.locator('text=Email Agent')).toBeVisible();
    await expect(page.locator('text=Calendar Agent')).toBeVisible();
    await expect(page.locator('text=Web Agent')).toBeVisible();
    await expect(page.locator('text=Task Agent')).toBeVisible();
  });
  
  test('should navigate to agents page', async ({ page }) => {
    await page.locator('a[href="/agents"]').first().click();
    await expect(page).toHaveURL(/.*agents/);
    await expect(page.locator('h1')).toContainText('AI Agents');
  });
  
  test('should navigate to billing page', async ({ page }) => {
    await page.locator('a[href="/billing"]').first().click();
    await expect(page).toHaveURL(/.*billing/);
    await expect(page.locator('h1')).toContainText('Billing & Subscription');
  });
  
  test('should navigate to analytics page', async ({ page }) => {
    await page.locator('a[href="/analytics"]').first().click();
    await expect(page).toHaveURL(/.*analytics/);
    await expect(page.locator('h1')).toContainText('Analytics');
  });
  
  test('should refresh dashboard data', async ({ page }) => {
    const refreshButton = page.locator('button[aria-label="Refresh"]');
    await refreshButton.click();
    await expect(page.locator('.animate-spin')).toBeVisible();
    await expect(page.locator('.animate-spin')).not.toBeVisible({ timeout: 10000 });
  });
});