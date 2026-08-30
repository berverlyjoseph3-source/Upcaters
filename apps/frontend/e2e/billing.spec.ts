// enterprise-ai-agent-platform/apps/frontend/e2e/billing.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Billing Page', () => {
  const testEmail = `billing-test-${Date.now()}@example.com`;
  const testPassword = 'Billing123!';
  
  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('/register');
    await page.locator('input[name="name"]').fill('Billing Test User');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').first().fill(testPassword);
    await page.locator('input[type="password"]').nth(1).fill(testPassword);
    await page.locator('input[name="acceptTerms"]').check();
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Navigate to billing page
    await page.goto('/billing');
    await expect(page.locator('h1')).toContainText('Billing & Subscription');
  });
  
  test.describe('Plans Display', () => {
    test('should display all pricing plans', async ({ page }) => {
      await expect(page.locator('text=Free')).toBeVisible();
      await expect(page.locator('text=Starter')).toBeVisible();
      await expect(page.locator('text=Professional')).toBeVisible();
      await expect(page.locator('text=Enterprise')).toBeVisible();
    });
    
    test('should display monthly pricing by default', async ({ page }) => {
      await expect(page.locator('text=$29')).toBeVisible();
      await expect(page.locator('text=$99')).toBeVisible();
      await expect(page.locator('text=$499')).toBeVisible();
    });
    
    test('should switch to yearly pricing', async ({ page }) => {
      await page.locator('button:has-text("Yearly")').click();
      await expect(page.locator('text=$278.40')).toBeVisible();
      await expect(page.locator('text=$950.40')).toBeVisible();
      await expect(page.locator('text=$4,790.40')).toBeVisible();
    });
    
    test('should highlight professional plan as popular', async ({ page }) => {
      await expect(page.locator('text=Most Popular')).toBeVisible();
    });
  });
  
  test.describe('Current Subscription', () => {
    test('should display current plan', async ({ page }) => {
      await expect(page.locator('text=Free Plan')).toBeVisible();
      await expect(page.locator('text=Current Plan')).toBeVisible();
    });
    
    test('should show subscription details', async ({ page }) => {
      await expect(page.locator('text=Current Period:')).toBeVisible();
      await expect(page.locator('text=Renews on')).toBeVisible();
    });
  });
  
  test.describe('Upgrade Flow', () => {
    test('should open upgrade modal when clicking upgrade', async ({ page }) => {
      await page.locator('button:has-text("Upgrade")').first().click();
      await expect(page.locator('h2:has-text("Upgrade Plan")')).toBeVisible();
    });
    
    test('should show upgrade confirmation', async ({ page }) => {
      await page.locator('button:has-text("Upgrade")').first().click();
      await expect(page.locator('text=You are about to upgrade')).toBeVisible();
    });
  });
  
  test.describe('Invoice History', () => {
    test('should display invoice history section', async ({ page }) => {
      await expect(page.locator('h3:has-text("Invoice History")')).toBeVisible();
    });
    
    test('should show invoice table', async ({ page }) => {
      await expect(page.locator('table')).toBeVisible();
    });
  });
  
  test.describe('Payment Methods', () => {
    test('should display payment methods section', async ({ page }) => {
      await page.locator('button:has-text("Payment Methods")').click();
      await expect(page.locator('text=Add Payment Method')).toBeVisible();
    });
  });
});