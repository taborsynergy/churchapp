import { Page } from '@playwright/test';

export const ADMIN_EMAIL = 'uitest.admin@gracechurch.demo';
export const ADMIN_PASSWORD = 'UiTest@Admin1';

export async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 12000 });
}
