import { test, expect } from '@playwright/test';
import {
  TEST_USERS,
  login,
  loginAndWaitForDashboard,
  logout,
  expectLoginPage,
} from './helpers';

test.describe('🔐 Authentication', () => {
  // ==========================================================================
  // 1.1 Unauthenticated Access — Route Guard
  // ==========================================================================
  test.describe('1.1 Unauthenticated Access — Route Guard', () => {
    test('redirects root to /login when not authenticated', async ({ page }) => {
      await page.goto('/');
      await page.waitForURL('**/login');
      await expectLoginPage(page);
    });

    test('redirects /students to /login when not authenticated', async ({ page }) => {
      await page.goto('/students');
      await page.waitForURL('**/login');
      await expectLoginPage(page);
    });

    test('redirects /attendance to /login when not authenticated', async ({ page }) => {
      await page.goto('/attendance');
      await page.waitForURL('**/login');
      await expectLoginPage(page);
    });

    test('redirects /settings to /login when not authenticated', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForURL('**/login');
      await expectLoginPage(page);
    });
  });

  // ==========================================================================
  // 1.2 Login — Invalid Credentials
  // ==========================================================================
  test.describe('1.2 Login — Invalid Credentials', () => {
    test('shows validation errors for empty fields', async ({ page }) => {
      await page.goto('/login');
      await page.getByRole('button', { name: /Sign In/i }).click();

      await expect(page.getByText('Enter a valid email').first()).toBeVisible({ timeout: 8_000 });
      await expect(page.getByText('Password is required').first()).toBeVisible();
    });

    test('shows server error for non-existent user', async ({ page }) => {
      await page.goto('/login');
      await page.getByPlaceholder('teacher@school.edu').fill('nonexistent@school.edu');
      await page.getByPlaceholder('••••••••').fill('dev');
      await page.getByRole('button', { name: /Sign In/i }).click();

      await expect(
        page.locator('form .rounded-md.bg-destructive\\/10'),
      ).toBeVisible({ timeout: 10_000 });
    });
  });

  // ==========================================================================
  // 1.3 Login — Valid Credentials
  // ==========================================================================
  test.describe('1.3 Login — Valid Credentials', () => {
    test('logs in as School A admin and sees dashboard', async ({ page }) => {
      await loginAndWaitForDashboard(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);

      await expect(page.getByText(`Welcome, ${TEST_USERS.schoolA.firstName}`)).toBeVisible();
      await expect(page.getByText(`${TEST_USERS.schoolA.role} Dashboard`)).toBeVisible();

      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      expect(token).toBeTruthy();

      await expect(page.getByText(TEST_USERS.schoolA.name)).toBeVisible();
      await expect(page.getByText(TEST_USERS.schoolA.role, { exact: true })).toBeVisible();
    });

    test('logs in as School B admin and sees correct user', async ({ page }) => {
      await loginAndWaitForDashboard(page, TEST_USERS.schoolB.email, TEST_USERS.schoolB.password);
      await expect(page.getByText(`Welcome, ${TEST_USERS.schoolB.firstName}`)).toBeVisible();
    });

    test('logs in as School C admin and sees correct user', async ({ page }) => {
      await loginAndWaitForDashboard(page, TEST_USERS.schoolC.email, TEST_USERS.schoolC.password);
      await expect(page.getByText(`Welcome, ${TEST_USERS.schoolC.firstName}`)).toBeVisible();
    });
  });

  // ==========================================================================
  // 1.6 Logout
  // ==========================================================================
  test.describe('1.6 Logout', () => {
    test('logs out and redirects to login page', async ({ page }) => {
      await loginAndWaitForDashboard(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);
      await logout(page);
      await expectLoginPage(page);
    });

    test('clears access_token from localStorage on logout', async ({ page }) => {
      await loginAndWaitForDashboard(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);
      await logout(page);
      const token = await page.evaluate(() => localStorage.getItem('access_token'));
      expect(token).toBeNull();
    });

    test('protected routes redirect to login after logout', async ({ page }) => {
      await loginAndWaitForDashboard(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);
      await logout(page);
      await page.goto('/');
      await page.waitForURL('**/login');
    });
  });

  // ==========================================================================
  // 1.7 Token Refresh
  // ==========================================================================
  test.describe('1.7 Token Refresh', () => {
    test('auto-refreshes session when access_token is expired (refresh_token cookie is valid)', async ({ page }) => {
      await loginAndWaitForDashboard(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);

      await page.evaluate(() => localStorage.setItem('access_token', 'expired-invalid-token'));

      await page.goto('/');
      await expect(page.getByText(/Welcome,/i)).toBeVisible({ timeout: 15_000 });

      const newToken = await page.evaluate(() => localStorage.getItem('access_token'));
      expect(newToken).not.toBe('expired-invalid-token');
      expect(newToken).toBeTruthy();
    });
  });
});
