// enterprise-ai-agent-platform/apps/frontend/e2e/agents.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Agents Page', () => {
  const testEmail = `agents-test-${Date.now()}@example.com`;
  const testPassword = 'Agents123!';
  
  test.beforeEach(async ({ page }) => {
    // Register and login
    await page.goto('/register');
    await page.locator('input[name="name"]').fill('Agents Test User');
    await page.locator('input[type="email"]').fill(testEmail);
    await page.locator('input[type="password"]').first().fill(testPassword);
    await page.locator('input[type="password"]').nth(1).fill(testPassword);
    await page.locator('input[name="acceptTerms"]').check();
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Navigate to agents page
    await page.goto('/agents');
    await expect(page.locator('h1')).toContainText('AI Agents');
  });
  
  test.describe('Email Agent', () => {
    test('should navigate to email agent', async ({ page }) => {
      await page.locator('text=Email Agent').first().click();
      await expect(page).toHaveURL(/.*agents\/email/);
      await expect(page.locator('h1')).toContainText('Email Agent');
    });
    
    test('should compose and send email', async ({ page }) => {
      await page.goto('/agents/email');
      
      await page.locator('button:has-text("Compose")').click();
      await page.locator('input[placeholder="recipient@example.com"]').fill('test@example.com');
      await page.locator('input[placeholder="Email subject"]').fill('Test Email');
      await page.locator('textarea[placeholder="Write your message here..."]').fill('This is a test email');
      await page.locator('button:has-text("Send")').click();
      
      await expect(page.locator('.text-green-600')).toBeVisible({ timeout: 5000 });
    });
  });
  
  test.describe('Content Agent', () => {
    test('should navigate to content agent', async ({ page }) => {
      await page.locator('text=Content Agent').first().click();
      await expect(page).toHaveURL(/.*agents\/content/);
      await expect(page.locator('h1')).toContainText('Content Agent');
    });
    
    test('should generate text content', async ({ page }) => {
      await page.goto('/agents/content');
      
      await page.locator('textarea').fill('Write a short story about a robot');
      await page.locator('button[aria-label="Generate"]').click();
      
      await expect(page.locator('.animate-spin')).toBeVisible();
      await expect(page.locator('.prose')).toBeVisible({ timeout: 30000 });
    });
    
    test('should generate image', async ({ page }) => {
      await page.goto('/agents/content');
      
      await page.locator('button:has-text("Image")').click();
      await page.locator('textarea').fill('A beautiful sunset over mountains');
      await page.locator('button[aria-label="Generate"]').click();
      
      await expect(page.locator('.animate-spin')).toBeVisible();
      await expect(page.locator('img')).toBeVisible({ timeout: 30000 });
    });
  });
  
  test.describe('Web Agent', () => {
    test('should navigate to web agent', async ({ page }) => {
      await page.locator('text=Web Agent').first().click();
      await expect(page).toHaveURL(/.*agents\/web/);
      await expect(page.locator('h1')).toContainText('Web Agent');
    });
    
    test('should perform web search', async ({ page }) => {
      await page.goto('/agents/web');
      
      await page.locator('input[placeholder="Search the web..."]').fill('artificial intelligence');
      await page.locator('button:has-text("Search")').click();
      
      await expect(page.locator('.animate-spin')).toBeVisible();
      await expect(page.locator('.text-teal-600')).toBeVisible({ timeout: 15000 });
    });
    
    test('should get weather information', async ({ page }) => {
      await page.goto('/agents/web');
      
      await page.locator('button:has-text("Weather")').click();
      await page.locator('input[placeholder="Enter city name"]').fill('New York');
      await page.locator('button:has-text("Get Weather")').click();
      
      await expect(page.locator('.animate-spin')).toBeVisible();
      await expect(page.locator('.text-4xl')).toBeVisible({ timeout: 10000 });
    });
  });
  
  test.describe('Task Agent', () => {
    test('should navigate to task agent', async ({ page }) => {
      await page.locator('text=Task Agent').first().click();
      await expect(page).toHaveURL(/.*agents\/task/);
      await expect(page.locator('h1')).toContainText('Task Agent');
    });
    
    test('should create a new task', async ({ page }) => {
      await page.goto('/agents/task');
      
      await page.locator('button:has-text("New Task")').click();
      await page.locator('input[placeholder="Task title"]').fill('Complete E2E testing');
      await page.locator('textarea[placeholder="Task description"]').fill('Write and run all E2E tests');
      await page.locator('button:has-text("Save")').click();
      
      await expect(page.locator('.animate-spin')).toBeVisible();
      await expect(page.locator('text=Complete E2E testing')).toBeVisible({ timeout: 5000 });
    });
  });
  
  test.describe('Calendar Agent', () => {
    test('should navigate to calendar agent', async ({ page }) => {
      await page.locator('text=Calendar Agent').first().click();
      await expect(page).toHaveURL(/.*agents\/calendar/);
      await expect(page.locator('h1')).toContainText('Calendar Agent');
    });
    
    test('should create a new event', async ({ page }) => {
      await page.goto('/agents/calendar');
      
      await page.locator('button:has-text("New Event")').click();
      await page.locator('input[placeholder="Meeting title"]').fill('Team Sync');
      await page.locator('button:has-text("Save")').click();
      
      await expect(page.locator('.animate-spin')).toBeVisible();
      await expect(page.locator('text=Team Sync')).toBeVisible({ timeout: 5000 });
    });
  });
});