import { Page, expect } from '@playwright/test';

/**
 * Test user credentials matching the seed data in TESTING-GUIDE.md
 */
export const TEST_USERS = {
  schoolA: {
    email: 'admin@school-a.edu',
    password: 'dev',
    name: 'Amit Sharma',
    firstName: 'Amit',
    role: 'ADMIN',
    tenantId: 'school-a',
  },
  schoolB: {
    email: 'admin@school-b.edu',
    password: 'dev',
    name: 'Priya Patel',
    firstName: 'Priya',
    role: 'ADMIN',
    tenantId: 'school-b',
  },
  schoolC: {
    email: 'admin@school-c.edu',
    password: 'dev',
    name: 'John Smith',
    firstName: 'John',
    role: 'ADMIN',
    tenantId: 'school-c',
  },
} as const;

/**
 * Navigate to the login page and sign in with the given credentials.
 * Submits the form and waits for either the dashboard or an error.
 */
export async function login(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto('/login');
  await page.waitForSelector('form', { timeout: 10_000 });

  await page.getByPlaceholder('teacher@school.edu').fill(email);
  await page.getByPlaceholder('••••••••').fill(password);

  await page.getByRole('button', { name: /Sign In/i }).click();
}

/**
 * Login and wait for the dashboard to fully load.
 */
export async function loginAndWaitForDashboard(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await login(page, email, password);

  // Wait for the dashboard welcome text to appear
  // The page will redirect from /login → / via client-side router.replace('/')
  await expect(page.locator('h1:has-text("Welcome,")')).toBeVisible({ timeout: 20_000 });
}

/**
 * Logout via the sidebar logout button.
 */
export async function logout(page: Page): Promise<void> {
  const logoutButton = page.getByTitle('Logout');
  await logoutButton.click();
  await page.waitForURL('**/login', { timeout: 10_000 });
}

/**
 * Verify the user is on the login page with the expected UI elements.
 */
export async function expectLoginPage(page: Page): Promise<void> {
  await expect(page.locator('h1').filter({ hasText: 'EduTech' })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('Sign in to your school account')).toBeVisible();
  await expect(page.getByPlaceholder('teacher@school.edu')).toBeVisible();
  await expect(page.getByPlaceholder('••••••••')).toBeVisible();
  await expect(page.getByRole('button', { name: /Sign In/i })).toBeVisible();
}

/**
 * Mock the dashboard API response to test specific states.
 */
export async function mockDashboardApi(
  page: Page,
  tenantId: string,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  const defaultData = {
    attendance_overview: { rate: 92, total_days: 180 },
    upcoming_exams: [
      { title: 'Mid-Term Exams', date: '2026-07-15' },
      { title: 'Final Exams', date: '2026-10-20' },
    ],
    pending_homework: [
      { title: 'Math Assignment', due_date: '2026-06-10' },
      { title: 'Science Project', due_date: '2026-06-12' },
    ],
    leave_requests: [
      { student_name: 'Rahul K.', status: 'Pending' },
    ],
    notifications_count: 3,
    ...overrides,
  };

  await page.route(`**/${tenantId}/reports/dashboard`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: defaultData }),
    });
  });
}
