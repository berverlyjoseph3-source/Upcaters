// enterprise-ai-agent-platform/apps/frontend/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  const testEmail = `e2e-test-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });
  
  test('should display login page correctly', async ({ page }) => {
    await page.goto('/login');
    
    await expect(page.locator('h2')).toContainText('Welcome back');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Sign In');
  });
  
  test('should register a new user successfully', async ({ page }) => {
    await page.goto('/register');
    
    await expect(page.locator('h2')).toContainText('Create your account');
    
    // Fill registration form
    await page.locator('input[name="name"]').fill('E2E Test User');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').first().fill(testPassword);
    await page.locator('input[type="password"]').nth(1).fill(testPassword);
    await page.locator('input[name="acceptTerms"]').check();
    
    // Submit form
    await page.locator('button[type="submit"]').click();
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
  
  test('should login with registered user', async ({ page }) => {
    await page.goto('/login');
    
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('h1')).toContainText('Dashboard');
  });
  
  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    
    await page.locator('input[type="email"]').fill('invalid@example.com');
    await page.locator('input[type="password"]').fill('WrongPassword123!');
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('.text-error')).toBeVisible();
    await expect(page.locator('.text-error')).toContainText('Invalid email or password');
  });
  
  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').fill(testPassword);
    await page.locator('button[type="submit"]').click();
    
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Click user menu and logout
    await page.locator('[aria-label="User menu"]').click();
    await page.locator('text=Sign out').click();
    
    await expect(page).toHaveURL(/.*login/);
  });
  
  test('should navigate to forgot password page', async ({ page }) => {
    await page.goto('/login');
    
    await page.locator('a[href="/forgot-password"]').click();
    
    await expect(page).toHaveURL(/.*forgot-password/);
    await expect(page.locator('h2')).toContainText('Reset password');
  });
  
  test('should send password reset email', async ({ page }) => {
    await page.goto('/forgot-password');
    
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('button[type="submit"]').click();
    
    await expect(page.locator('h2')).toContainText('Check your email');
  });
});