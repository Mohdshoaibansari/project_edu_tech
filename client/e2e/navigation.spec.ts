import { test, expect } from '@playwright/test';
import { TEST_USERS, login } from './helpers';

test.describe('🧭 Sidebar Navigation', () => {
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

  // ==========================================================================
  // 3.1 Navigation Items
  // ==========================================================================
  test.describe('3.1 Navigation Items', () => {
    const pages = [
      { label: 'Dashboard', href: '/', heading: /Welcome,/i },
      { label: 'Students', href: '/students', heading: 'Student Management' },
      { label: 'Attendance', href: '/attendance', heading: 'Attendance Tracking' },
      { label: 'Homework', href: '/homework', heading: 'Homework Management' },
      { label: 'Exams', href: '/exams', heading: 'Exam Management' },
      { label: 'Leave', href: '/leave', heading: 'Leave Management' },
      { label: 'Reports', href: '/reports', heading: 'Reporting' },
      { label: 'Notifications', href: '/notifications', heading: 'Notification Inbox' },
      { label: 'Settings', href: '/settings', heading: 'Settings' },
    ];

    for (const { label, href, heading } of pages) {
      test(`clicking "${label}" navigates to ${href}`, async ({ page }) => {
        await page.getByRole('link', { name: label }).first().click();
        await page.waitForURL(`**${href}`, { timeout: 10_000 });

        // Use exact match for "Settings" to avoid matching "Admin Settings" heading
        const matcher = label === 'Settings'
          ? { name: heading, exact: true }
          : { name: heading };
        await expect(page.getByRole('heading', matcher)).toBeVisible({ timeout: 10_000 });
      });
    }
  });

  // ==========================================================================
  // 3.2 Active State Highlighting
  // ==========================================================================
  test.describe('3.2 Active State Highlighting', () => {
    test('Dashboard link has active styling by default', async ({ page }) => {
      const dashboardLink = page.getByRole('link', { name: 'Dashboard' });
      await expect(dashboardLink).toHaveClass(/bg-primary\/10|text-primary/);
    });

    test('clicking a nav item highlights it', async ({ page }) => {
      const studentsLink = page.getByRole('link', { name: 'Students' });
      await studentsLink.click();
      await page.waitForURL('**/students', { timeout: 10_000 });
      await expect(studentsLink).toHaveClass(/bg-primary\/10|text-primary/);
    });
  });

  // ==========================================================================
  // 3.3 Sidebar Collapse / Expand
  // ==========================================================================
  test.describe('3.3 Sidebar Collapse', () => {
    test('collapses sidebar when chevron is clicked', async ({ page }) => {
      const collapseButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).first();
      const sidebar = page.locator('aside').first();

      await expect(sidebar).toHaveClass(/w-64/);
      await collapseButton.click();
      await expect(sidebar).toHaveClass(/w-16/);
    });

    test('expands sidebar when chevron is clicked again', async ({ page }) => {
      const collapseButton = page.locator('button').filter({ has: page.locator('svg.lucide-chevron-left') }).first();
      const sidebar = page.locator('aside').first();

      await collapseButton.click();
      await expect(sidebar).toHaveClass(/w-16/);

      await collapseButton.click();
      await expect(sidebar).toHaveClass(/w-64/);
    });
  });

  // ==========================================================================
  // 3.4 Sidebar — User Info
  // ==========================================================================
  test.describe('3.4 Sidebar — User Info', () => {
    test('shows user initials, name, role, and logout button', async ({ page }) => {
      await expect(page.getByText('AS', { exact: true })).toBeVisible();
      await expect(page.getByText(TEST_USERS.schoolA.name)).toBeVisible();
      await expect(page.getByText(TEST_USERS.schoolA.role, { exact: true })).toBeVisible();
      await expect(page.getByTitle('Logout')).toBeVisible();
    });
  });
});
