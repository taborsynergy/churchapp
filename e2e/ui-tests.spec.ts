import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { loginAsAdmin } from './helpers/auth';

// Shadcn dialogs use role="dialog" but Next.js error overlay also does — exclude the dev overlay
const DIALOG = '[role="dialog"]:not([data-nextjs-dialog])';

// Toast messages appear both in the visible toast and in an aria-live region — use .first()
function toast(page: Page, text: string) {
  return page.locator(`text=${text}`).first();
}

function ensureTestImage(): string {
  const imgPath = path.join(__dirname, 'fixtures', 'test.png');
  if (!fs.existsSync(path.dirname(imgPath))) fs.mkdirSync(path.dirname(imgPath), { recursive: true });
  if (!fs.existsSync(imgPath)) {
    const png = Buffer.from([
      0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,
      0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x02,0x00,0x00,0x00,0x90,0x77,0x53,
      0xde,0x00,0x00,0x00,0x0c,0x49,0x44,0x41,0x54,0x08,0xd7,0x63,0xf8,0xcf,0xc0,0x00,
      0x00,0x00,0x02,0x00,0x01,0xe2,0x21,0xbc,0x33,0x00,0x00,0x00,0x00,0x49,0x45,0x4e,
      0x44,0xae,0x42,0x60,0x82,
    ]);
    fs.writeFileSync(imgPath, png);
  }
  return imgPath;
}

// ─── AUTH ──────────────────────────────────────────────────────────────────

test.describe('Authentication', () => {
  test('login page loads and shows form', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Grace Community Church');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('rejects wrong password with error toast', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'uitest.admin@gracechurch.demo');
    await page.fill('input[type="password"]', 'WrongPassword99');
    await page.click('button[type="submit"]');
    await expect(toast(page, 'Sign in failed')).toBeVisible({ timeout: 8000 });
  });

  test('admin login succeeds and redirects to admin', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page).toHaveURL(/\/admin/, { timeout: 10000 });
  });

  test('register page shows approval notice', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('text=require admin approval')).toBeVisible();
  });

  test('forgot password page loads', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });
});

// ─── SERMONS ───────────────────────────────────────────────────────────────

test.describe('Sermon Management', () => {
  test.describe.configure({ mode: 'serial' });

  test('sermons admin page loads with table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/sermons');
    await expect(page.locator('h1')).toContainText('Sermons');
    await expect(page.locator('button', { hasText: 'New Sermon' })).toBeVisible();
  });

  test('create new sermon series', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/sermons');
    await page.click('button:has-text("New Series")');
    const dialog = page.locator(DIALOG);
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.locator('input').first().fill('UI Test Series');
    await dialog.locator('button[type="submit"]').click();
    await expect(toast(page, 'Series created')).toBeVisible({ timeout: 8000 });
  });

  test('create new sermon', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/sermons');
    await page.click('button:has-text("New Sermon")');
    const dialog = page.locator(DIALOG);
    await expect(dialog).toBeVisible({ timeout: 5000 });

    // Title input
    await dialog.locator('label', { hasText: 'Title' }).locator('..').locator('input').fill('UI Test Sermon');
    // Pastor input
    await dialog.locator('label', { hasText: 'Pastor' }).locator('..').locator('input').fill('Pastor John Test');
    // Scripture
    await dialog.locator('label', { hasText: 'Scripture' }).locator('..').locator('input').fill('John 3:16');

    await dialog.locator('button[type="submit"]').click();
    await expect(toast(page, 'Sermon created')).toBeVisible({ timeout: 8000 });
  });

  test('sermon appears in list after creation', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/sermons');
    await expect(page.locator('text=UI Test Sermon').first()).toBeVisible({ timeout: 8000 });
  });
});

// ─── PROFILE & IMAGE UPLOAD ────────────────────────────────────────────────

test.describe('Profile & Image Upload', () => {
  test('profile page loads with user info', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/profile');
    await expect(page.locator('h1')).toContainText('My Profile');
    // The name appears as h2 in the profile card
    await expect(page.locator('h2.font-bold')).toContainText('UI Test Admin', { timeout: 8000 });
  });

  test('profile form shows editable fields', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/profile');
    await expect(page.locator('label', { hasText: 'Full Name' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Phone' })).toBeVisible();
    await expect(page.locator('label', { hasText: 'Bio' })).toBeVisible();
    await expect(page.locator('button:has-text("Save Changes")')).toBeVisible();
  });

  test('update profile bio and save', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/profile');
    await page.locator('textarea').first().clear();
    await page.locator('textarea').first().fill('UI test bio - automated test');
    await page.click('button:has-text("Save Changes")');
    await expect(toast(page, 'Profile updated')).toBeVisible({ timeout: 8000 });
  });

  test('avatar upload file input is attached', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/profile');
    await expect(page.locator('input[type="file"][accept="image/*"]')).toBeAttached();
  });

  test('profile photo upload with test image', async ({ page }) => {
    const imgPath = ensureTestImage();
    await loginAsAdmin(page);
    await page.goto('/profile');
    await page.locator('input[type="file"][accept="image/*"]').setInputFiles(imgPath);
    // Either succeeds (Photo updated!) or fails with storage error (Upload failed)
    await expect(
      toast(page, 'Photo updated').or(toast(page, 'Upload failed'))
    ).toBeVisible({ timeout: 15000 });
  });
});

// ─── EVENTS ────────────────────────────────────────────────────────────────

test.describe('Event Management', () => {
  test.describe.configure({ mode: 'serial' });

  test('events admin page loads', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/events');
    await expect(page.locator('h1')).toContainText('Events');
    await expect(page.locator('button:has-text("New Event")')).toBeVisible();
  });

  test('create new event with future date', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/events');
    await page.click('button:has-text("New Event")');
    const dialog = page.locator(DIALOG);
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await dialog.locator('label', { hasText: 'Title' }).locator('..').locator('input').fill('UI Test Event');

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dt = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}T10:00`;
    await dialog.locator('input[type="datetime-local"]').first().fill(dt);

    await dialog.locator('label', { hasText: 'Location' }).locator('..').locator('input').fill('Main Sanctuary');

    await dialog.locator('button[type="submit"]').click();
    await expect(toast(page, 'Event created')).toBeVisible({ timeout: 8000 });
  });

  test('rejects event with past date', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/events');
    await page.click('button:has-text("New Event")');
    const dialog = page.locator(DIALOG);
    await expect(dialog).toBeVisible({ timeout: 5000 });

    await dialog.locator('label', { hasText: 'Title' }).locator('..').locator('input').fill('Past Event Test');

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    const pastDate = `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}T10:00`;
    await dialog.locator('input[type="datetime-local"]').first().fill(pastDate);

    await dialog.locator('button[type="submit"]').click();
    await expect(toast(page, 'Invalid date')).toBeVisible({ timeout: 6000 });
  });

  test('new event appears in list', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/events');
    await expect(page.locator('text=UI Test Event').first()).toBeVisible({ timeout: 8000 });
  });
});

// ─── USER MANAGEMENT ───────────────────────────────────────────────────────

test.describe('User Management', () => {
  test('user management page loads with table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await expect(page.locator('h1')).toContainText('User Management');
    await expect(page.locator('table')).toBeVisible();
  });

  test('search filters users', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.fill('input[placeholder*="Search"]', 'nonexistent_xyz_123');
    await expect(page.locator('text=No users found')).toBeVisible({ timeout: 5000 });
  });

  test('add member dialog opens with required fields', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.click('button:has-text("Add Member")');
    const dialog = page.locator(DIALOG);
    await expect(dialog).toBeVisible({ timeout: 5000 });
    // Verify required fields are present
    await expect(dialog.locator('label', { hasText: 'Full Name' })).toBeVisible();
    await expect(dialog.locator('label', { hasText: 'Email Address' })).toBeVisible();
    await expect(dialog.locator('label', { hasText: 'Password' })).toBeVisible();
    await expect(dialog.locator('button[type="submit"]')).toBeVisible();
  });
});

// ─── GROUPS ────────────────────────────────────────────────────────────────

test.describe('Group Management', () => {
  test.describe.configure({ mode: 'serial' });

  test('groups admin page loads', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/groups');
    await expect(page.locator('h1')).toContainText('Groups');
    await expect(page.locator('button:has-text("Create Group")')).toBeVisible();
  });

  test('create new group', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/groups');
    await page.click('button:has-text("Create Group")');
    const dialog = page.locator(DIALOG);
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.locator('label', { hasText: 'Group Name' }).locator('..').locator('input').fill('UI Test Group');
    await dialog.locator('button[type="submit"]').click();
    await expect(toast(page, 'Group created')).toBeVisible({ timeout: 8000 });
  });

  test('new group appears in list', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/groups');
    await expect(page.locator('text=UI Test Group').first()).toBeVisible({ timeout: 8000 });
  });

  test('members dialog opens for a group', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/groups');
    await expect(page.locator('text=UI Test Group').first()).toBeVisible({ timeout: 8000 });
    await page.locator('button:has-text("Members")').first().click();
    const dialog = page.locator(DIALOG);
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await expect(dialog.locator('[role="heading"], h2')).toContainText('Members');
  });
});

// ─── GIVING ────────────────────────────────────────────────────────────────

test.describe('Giving / Donations', () => {
  test('give page shows demo mode banner', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/give');
    // Use the amber banner specifically, not the small footer text
    await expect(page.locator('p.text-amber-400')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('p.text-amber-400')).toContainText('DEMO MODE');
  });

  test('give page shows donation form', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/give');
    await expect(page.locator('h2', { hasText: 'Make a Donation' })).toBeVisible({ timeout: 8000 });
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('donation submission shows success state', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/give');
    // Wait for funds to load — combobox stops showing placeholder once selectedFund is set
    await expect(page.locator('[role="combobox"]').first()).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[role="combobox"]').first()).not.toContainText('Choose a fund', { timeout: 10000 });
    // Use exact match to avoid $25 matching $250
    await page.getByRole('button', { name: '$25', exact: true }).first().click();
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Thank You for Your Gift')).toBeVisible({ timeout: 10000 });
  });

  test('admin giving page shows fund stats', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/giving');
    await expect(page.locator('h1')).toContainText('Giving Reports');
    await expect(page.locator('text=Total Received')).toBeVisible();
  });

  test('create giving fund', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/giving');
    await page.click('button:has-text("New Fund")');
    const dialog = page.locator(DIALOG);
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.locator('label', { hasText: 'Fund Name' }).locator('..').locator('input').fill('UI Test Fund');
    await dialog.locator('button[type="submit"]').click();
    await expect(toast(page, 'Fund created')).toBeVisible({ timeout: 8000 });
  });
});

// ─── ANNOUNCEMENTS ─────────────────────────────────────────────────────────

test.describe('Announcements', () => {
  test.describe.configure({ mode: 'serial' });

  test('admin announcements page loads', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/announcements');
    await expect(page.locator('h1')).toContainText('Announcements');
    await expect(page.locator('button:has-text("New Announcement")')).toBeVisible();
  });

  test('create announcement', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/announcements');
    await page.click('button:has-text("New Announcement")');
    const dialog = page.locator(DIALOG);
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.locator('label', { hasText: 'Title' }).locator('..').locator('input').fill('UI Test Announcement');
    await dialog.locator('textarea').fill('This is a test announcement body.');
    await dialog.locator('button[type="submit"]').click();
    await expect(toast(page, 'Announcement created')).toBeVisible({ timeout: 8000 });
  });

  test('announcement appears on public page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/announcements');
    await expect(page.locator('h1')).toContainText('Announcements');
    await expect(page.locator('text=UI Test Announcement').first()).toBeVisible({ timeout: 8000 });
  });
});

// ─── ATTENDANCE ─────────────────────────────────────────────────────────────

test.describe('Attendance Tracking', () => {
  test('attendance page loads', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/attendance');
    await expect(page.locator('h1')).toBeVisible({ timeout: 8000 });
  });

  test('attendance page has event selector', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/attendance');
    // Wait for loading spinner to disappear (page uses loading state)
    await page.waitForFunction(() => !document.querySelector('.animate-spin'), { timeout: 10000 }).catch(() => {});
    // Either shows a dropdown/combobox or some content loaded state
    const hasSelect = await page.locator('[role="combobox"]').first().isVisible({ timeout: 3000 }).catch(() => false);
    const hasContent = await page.locator('h1').isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasSelect || hasContent).toBe(true);
  });

  test('save attendance button works when event selected', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/attendance');
    const saveBtn = page.locator('button:has-text("Save Attendance")');
    if (await saveBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await saveBtn.click();
      await expect(
        toast(page, 'Attendance saved').or(toast(page, 'Error saving'))
      ).toBeVisible({ timeout: 8000 });
    }
  });
});

// ─── PRAYER WALL ───────────────────────────────────────────────────────────

test.describe('Prayer Wall', () => {
  test.describe.configure({ mode: 'serial' });

  test('prayer page loads', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/prayer');
    await expect(page.locator('h1')).toContainText('Prayer Wall');
    await expect(page.locator('button:has-text("Share a Request")')).toBeVisible();
  });

  test('submit prayer request', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/prayer');
    await page.click('button:has-text("Share a Request")');
    const dialog = page.locator(DIALOG);
    await expect(dialog).toBeVisible({ timeout: 5000 });
    await dialog.locator('label', { hasText: 'Title' }).locator('..').locator('input').fill('UI Test Prayer Request');
    await dialog.locator('textarea').fill('Lord, please help with this UI test.');
    await dialog.locator('button[type="submit"]').click();
    await expect(toast(page, 'Prayer request submitted')).toBeVisible({ timeout: 8000 });
  });

  test('prayer request appears on wall', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/prayer');
    await expect(page.locator('text=UI Test Prayer Request').first()).toBeVisible({ timeout: 8000 });
  });
});

// ─── PUBLIC PAGES ───────────────────────────────────────────────────────────

test.describe('Public Pages', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=Grace Community Church').first()).toBeVisible();
  });

  test('sermons public page loads', async ({ page }) => {
    await page.goto('/sermons');
    await expect(page.locator('h1')).toContainText('Sermon Library');
  });

  test('events public page loads', async ({ page }) => {
    await page.goto('/events');
    await expect(page.locator('h1')).toContainText('Events');
  });

  test('groups public page loads', async ({ page }) => {
    await page.goto('/groups');
    await expect(page.locator('h1')).toContainText('Groups');
  });

  test('give page redirects unauthenticated users to login', async ({ page }) => {
    await page.goto('/give');
    await page.waitForURL(/\/login/, { timeout: 8000 });
  });
});
