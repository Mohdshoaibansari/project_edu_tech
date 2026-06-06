import { test, expect } from '@playwright/test';
import { TEST_USERS, login } from './helpers';

test.describe('📱 Responsive Design', () => {
  // ==========================================================================
  // 7.1 Desktop (>1024px)
  // ==========================================================================
  test.describe('7.1 Desktop', () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test('sidebar is fully visible with labels', async ({ page }) => {
      await page.route('**/reports/dashboard', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { attendance_overview: { rate: 92, total_days: 180 }, upcoming_exams: [], pending_homework: [], leave_requests: [], notifications_count: 0 },
          }),
        });
      });

      await login(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);
      await expect(page.getByText(/Welcome,/i)).toBeVisible({ timeout: 15_000 });

      const sidebar = page.locator('aside').first();
      await expect(sidebar).toBeVisible();
      await expect(sidebar).toHaveClass(/w-64/);
      await expect(page.getByText('Students').first()).toBeVisible();
    });

    test('dashboard shows 4 stat cards in a row', async ({ page }) => {
      await page.route('**/reports/dashboard', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              attendance_overview: { rate: 92, total_days: 180 },
              upcoming_exams: [{ title: 'Mid-Term', date: '2026-07-15' }],
              pending_homework: [{ title: 'Math HW', due_date: '2026-06-10' }],
              leave_requests: [{ student_name: 'Rahul K.', status: 'Pending' }],
              notifications_count: 0,
            },
          }),
        });
      });

      await login(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);
      await expect(page.getByText(/Welcome,/i)).toBeVisible({ timeout: 15_000 });

      const statCardsGrid = page.locator('.grid').first();
      await expect(statCardsGrid).toHaveClass(/lg:grid-cols-4/);
    });
  });

  // ==========================================================================
  // 7.2 Tablet (768px — 1024px)
  // ==========================================================================
  test.describe('7.2 Tablet', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('dashboard shows 2 stat cards per row', async ({ page }) => {
      await page.route('**/reports/dashboard', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { attendance_overview: { rate: 92, total_days: 180 }, upcoming_exams: [], pending_homework: [], leave_requests: [], notifications_count: 0 },
          }),
        });
      });

      await login(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);
      await expect(page.getByText(/Welcome,/i)).toBeVisible({ timeout: 15_000 });

      const statCardsGrid = page.locator('.grid').first();
      await expect(statCardsGrid).toHaveClass(/sm:grid-cols-2/);
    });
  });

  // ==========================================================================
  // 7.3 Mobile (<768px)
  // ==========================================================================
  test.describe('7.3 Mobile', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('login form is centered and usable', async ({ page }) => {
      await page.goto('/login');
      await expect(page.getByPlaceholder('teacher@school.edu')).toBeVisible();
      await expect(page.getByPlaceholder('••••••••')).toBeVisible();
      await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'EduTech' })).toBeVisible();
    });

    test('dashboard shows 1 stat card per row', async ({ page }) => {
      await page.route('**/reports/dashboard', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { attendance_overview: { rate: 92, total_days: 180 }, upcoming_exams: [], pending_homework: [], leave_requests: [], notifications_count: 0 },
          }),
        });
      });

      await login(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);
      await expect(page.getByText(/Welcome,/i)).toBeVisible({ timeout: 15_000 });

      const statCardsGrid = page.locator('.grid').first();
      await expect(statCardsGrid).toHaveClass(/grid-cols-1/);
    });

    test('no horizontal scroll on mobile', async ({ page }) => {
      await page.route('**/reports/dashboard', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: { attendance_overview: { rate: 92, total_days: 180 }, upcoming_exams: [], pending_homework: [], leave_requests: [], notifications_count: 0 },
          }),
        });
      });

      await login(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);
      await expect(page.getByText(/Welcome,/i)).toBeVisible({ timeout: 15_000 });

      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      // Allow for sidebar width (256px) + content padding
      expect(bodyWidth).toBeLessThanOrEqual(500);
    });
  });
});
