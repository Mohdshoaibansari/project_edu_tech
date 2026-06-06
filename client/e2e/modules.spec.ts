import { test, expect } from '@playwright/test';
import { TEST_USERS, login } from './helpers';

test.describe('📄 Module Pages', () => {
  // Mock the dashboard API so login at / works reliably
  test.beforeEach(async ({ page }) => {
    await page.route('**/reports/dashboard', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            attendance_overview: { rate: 92, total_days: 180 },
            upcoming_exams: [],
            pending_homework: [],
            leave_requests: [],
            notifications_count: 0,
          },
        }),
      });
    });

    await login(page, TEST_USERS.schoolA.email, TEST_USERS.schoolA.password);
    await expect(page.getByText(/Welcome,/i)).toBeVisible({ timeout: 15_000 });
  });

  // All stub pages show EmptyState with icon + title + description
  const modulePages = [
    { path: '/students', title: 'Student Management' },
    { path: '/attendance', title: 'Attendance Tracking' },
    { path: '/homework', title: 'Homework Management' },
    { path: '/exams', title: 'Exam Management' },
    { path: '/leave', title: 'Leave Management' },
    { path: '/reports', title: 'Reporting' },
    { path: '/notifications', title: 'Notification Inbox' },
  ];

  for (const { path, title } of modulePages) {
    test(`displays "${title}" page at ${path}`, async ({ page }) => {
      await page.goto(path);
      await page.waitForURL(`**${path}`, { timeout: 10_000 });
      await expect(page.getByRole('heading', { name: title })).toBeVisible({ timeout: 10_000 });
    });
  }

  test.describe('Settings Page', () => {
    test('displays account information and admin settings', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForURL('**/settings', { timeout: 10_000 });

      // Use exact match to avoid matching "Admin Settings" heading
      await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible();
      await expect(page.getByText('Manage account and preferences')).toBeVisible();

      // Account Information card
      await expect(page.getByText('Account Information')).toBeVisible();
      // Name appears in both sidebar and settings card — use .first()
      await expect(page.getByText(TEST_USERS.schoolA.name).first()).toBeVisible();
      await expect(page.getByText(TEST_USERS.schoolA.email)).toBeVisible();
      // Role appears in both sidebar and settings card — use .first()
      await expect(page.getByText(TEST_USERS.schoolA.role, { exact: true }).first()).toBeVisible();

      // Admin Settings card (visible since user is ADMIN)
      await expect(page.getByText('Admin Settings')).toBeVisible();
    });
  });
});
