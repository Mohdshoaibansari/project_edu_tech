import { test, expect } from '@playwright/test';
import { TEST_USERS, login } from './helpers';

test.describe('🏠 Dashboard', () => {
  // ==========================================================================
  // 2.1 Dashboard Load
  // ==========================================================================
  test.describe('2.1 Dashboard Load', () => {
    test('shows 4 stat cards after loading', async ({ page }) => {
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
              notifications_count: 3,
            },
          }),
        });
      });

      await login(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);
      await page.waitForURL((url) => url.pathname === '/', { timeout: 15_000 });

      await expect(page.getByText('Attendance Rate')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('Upcoming Exams').first()).toBeVisible();
      await expect(page.getByText('Pending Homework').first()).toBeVisible();
      await expect(page.getByText('Leave Requests').first()).toBeVisible();
    });

    test('shows welcome message with admin first name', async ({ page }) => {
      await page.route('**/reports/dashboard', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { attendance_overview: { rate: 92, total_days: 180 }, upcoming_exams: [], pending_homework: [], leave_requests: [], notifications_count: 0 } }),
        });
      });

      await login(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);
      await page.waitForURL((url) => url.pathname === '/', { timeout: 15_000 });

      await expect(page.getByText(`Welcome, ${TEST_USERS.schoolA.firstName}`)).toBeVisible();
      await expect(page.getByText(`${TEST_USERS.schoolA.role} Dashboard`)).toBeVisible();
    });

    test('shows Upcoming Exams and Pending Homework panels', async ({ page }) => {
      await page.route('**/reports/dashboard', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              attendance_overview: { rate: 92, total_days: 180 },
              upcoming_exams: [{ title: 'Mid-Term Exams', date: '2026-07-15' }],
              pending_homework: [{ title: 'Math Assignment', due_date: '2026-06-10' }],
              leave_requests: [],
              notifications_count: 0,
            },
          }),
        });
      });

      await login(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);
      await page.waitForURL((url) => url.pathname === '/', { timeout: 15_000 });

      await expect(page.getByRole('heading', { name: 'Upcoming Exams' }).first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('heading', { name: 'Pending Homework' }).first()).toBeVisible();
      await expect(page.getByText('Mid-Term Exams')).toBeVisible();
      await expect(page.getByText('Math Assignment')).toBeVisible();
    });
  });

  // ==========================================================================
  // 2.3 Dashboard — Error State
  // ==========================================================================
  test.describe('2.3 Dashboard — Error State', () => {
    test('shows ErrorState when API fails', async ({ page }) => {
      await page.route('**/*reports/dashboard*', async (route) => {
        await route.fulfill({ status: 500, contentType: 'application/json', body: 'error' });
      });

      await login(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);
      await page.waitForURL((url) => url.pathname === '/', { timeout: 15_000 });

      await expect(page.getByText('Something went wrong').first()).toBeVisible({ timeout: 10_000 });
      await expect(page.getByRole('button', { name: /Try Again/i })).toBeVisible();
    });

    test('retries API request after clicking Try Again', async ({ page }) => {
      // Step 1: Register a route that fails
      await page.route('**/reports/dashboard', async (route) => {
        await route.fulfill({ status: 500, body: 'error' });
      });

      await login(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);
      await page.waitForURL((url) => url.pathname === '/', { timeout: 15_000 });

      // Wait for error state
      await expect(page.getByText('Something went wrong').first()).toBeVisible({ timeout: 15_000 });

      // Step 2: Remove the failing route, register a successful one, click retry
      await page.unroute('**/reports/dashboard');
      await page.route('**/reports/dashboard', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              attendance_overview: { rate: 92, total_days: 180 },
              upcoming_exams: [{ title: 'Mid-Term', date: '2026-07-15' }],
              pending_homework: [],
              leave_requests: [],
              notifications_count: 0,
            },
          }),
        });
      });

      // Click retry
      await page.getByRole('button', { name: /Try Again/i }).click();

      // Data loads after retry
      await expect(page.getByText('Attendance Rate')).toBeVisible({ timeout: 15_000 });
    });
  });

  // ==========================================================================
  // 2.4 Dashboard — Cards
  // ==========================================================================
  test.describe('2.4 Dashboard — Cards', () => {
    test('shows all 4 stat card labels', async ({ page }) => {
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
      await page.waitForURL((url) => url.pathname === '/', { timeout: 15_000 });

      await expect(page.getByText('Attendance Rate')).toBeVisible({ timeout: 10_000 });
      await expect(page.getByText('Upcoming Exams').first()).toBeVisible();
      await expect(page.getByText('Pending Homework').first()).toBeVisible();
      await expect(page.getByText('Leave Requests').first()).toBeVisible();
    });

    test('shows stat values from mocked data', async ({ page }) => {
      await page.route('**/reports/dashboard', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              attendance_overview: { rate: 92, total_days: 180 },
              upcoming_exams: [{ title: 'Mid-Term', date: '2026-07-15' }],
              pending_homework: [],
              leave_requests: [],
              notifications_count: 0,
            },
          }),
        });
      });

      await login(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);
      await page.waitForURL((url) => url.pathname === '/', { timeout: 15_000 });

      // Attendance rate stat value
      await expect(page.getByText('92%')).toBeVisible({ timeout: 10_000 });
      // Upcoming exams count — the stat card value
      await expect(page.locator('.grid').first().getByText('1')).toBeVisible();
    });
  });
});
