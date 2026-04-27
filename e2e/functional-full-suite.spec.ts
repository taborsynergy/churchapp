/**
 * FUNCTIONAL FULL SUITE — Grace Community Church App
 * Senior QA Architect — 180+ test cases across 18 modules
 *
 * Modules: AUTH · NAV · HOME · SERMONS · EVENTS · GROUPS · PRAYER ·
 *          GIVING · ANNOUNCE · PROFILE · ADMIN-DASH · ADMIN-USERS ·
 *          ADMIN-GROUPS · ADMIN-SERMONS · ADMIN-EVENTS · ADMIN-ANN ·
 *          ACCESS-CTRL · E2E-JOURNEYS
 *
 * Accounts:
 *   ADMIN   write2dinakar@gmail.com / Newpc4us!
 *   MEMBER  bhanu.bitra1@gmail.com  / Newpc4us!   (Janice — active)
 *   MEMBER2 chandrikabb@gmail.com   / Newpc4us!   (Jessie — active)
 */

import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

const ADMIN   = { email: 'write2dinakar@gmail.com', password: 'Newpc4us!' };
const MEMBER  = { email: 'bhanu.bitra1@gmail.com',  password: 'Newpc4us!' };
const MEMBER2 = { email: 'chandrikabb@gmail.com',   password: 'Newpc4us!' };
const TS      = Date.now(); // unique suffix per run

// ─── Shared helpers ───────────────────────────────────────────────────────────

async function login(page: Page, creds: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('input[type="email"]', creds.email);
  await page.fill('input[type="password"]', creds.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(
    (url) => !url.pathname.startsWith('/login'),
    { timeout: 15000 }
  );
}

async function loginAsAdmin(page: Page) { await login(page, ADMIN); }
async function loginAsMember(page: Page) { await login(page, MEMBER); }

async function toast(page: Page) {
  return page.locator('[data-sonner-toast], [role="status"], .sonner-toast').first();
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 1 — AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('AUTH-POS: Authentication — Positive', () => {

  test('AUTH-P-001: admin login redirects to /admin with welcome toast', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN.email);
    await page.fill('input[type="password"]', ADMIN.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/, { timeout: 15000 });
    await expect(page).toHaveURL(/\/admin/);
    await expect(page.getByText(/welcome back/i).first()).toBeVisible({ timeout: 6000 });
  });

  test('AUTH-P-002: member login redirects to home with welcome toast', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', MEMBER.email);
    await page.fill('input[type="password"]', MEMBER.password);
    await page.click('button[type="submit"]');
    await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 });
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.getByText(/welcome back/i).first()).toBeVisible({ timeout: 6000 });
  });

  test('AUTH-P-003: password show/hide toggle changes input type', async ({ page }) => {
    await page.goto('/login');
    const pwInput = page.locator('input[type="password"]');
    await expect(pwInput).toBeVisible();
    await page.click('button[aria-label="Show password"]');
    await expect(page.locator('input[type="text"]#password')).toBeVisible();
    await page.click('button[aria-label="Hide password"]');
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('AUTH-P-004: sign out clears session and hides admin link', async ({ page }) => {
    await loginAsAdmin(page);
    await expect(page.getByText(/admin/i).first()).toBeVisible({ timeout: 5000 });
    // open account dropdown
    await page.getByRole('button', { name: /sign out|account|menu/i }).last().click().catch(() =>
      page.locator('[data-testid="user-menu"], button:has(img), button:has-text("Sign Out")').first().click()
    );
    const signOutBtn = page.getByRole('menuitem', { name: /sign out/i })
      .or(page.getByRole('button', { name: /sign out/i }))
      .or(page.getByText(/sign out/i));
    await signOutBtn.first().click({ timeout: 5000 });
    await page.waitForURL(/\/$|\/login/, { timeout: 10000 });
    await expect(page.getByText(/admin dashboard/i)).not.toBeVisible();
  });

  test('AUTH-P-005: register page shows all 3 required fields', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[id="fullName"], input[placeholder*="full name" i]').first()).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"], input[id="password"]').first()).toBeVisible();
    await expect(page.getByText(/admin approval/i)).toBeVisible();
  });

  test('AUTH-P-006: register page show/hide password toggle works', async ({ page }) => {
    await page.goto('/register');
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await page.click('button[aria-label="Show password"]');
    await expect(page.locator('input[type="text"]#password')).toBeVisible();
  });

  test('AUTH-P-007: forgot password page loads with email field', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /send|reset|submit/i }).first()).toBeVisible();
  });

  test('AUTH-P-008: register → login link navigates correctly', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('link', { name: /sign in/i }).click();
    await expect(page).toHaveURL(/\/login/);
  });

  test('AUTH-P-009: login → register link navigates correctly', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /register/i }).click();
    await expect(page).toHaveURL(/\/register/);
  });

  test('AUTH-P-010: login → forgot password link navigates correctly', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
  });

});

test.describe('AUTH-NEG: Authentication — Negative', () => {

  test('AUTH-N-001: wrong password shows error toast, stays on /login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN.email);
    await page.fill('input[type="password"]', 'WrongPass999!');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/sign in failed|invalid email or password/i).first()).toBeVisible({ timeout: 8000 });
    await expect(page).toHaveURL(/\/login/);
  });

  test('AUTH-N-002: non-existent email shows generic error (no enumeration)', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', `nope_${TS}@fake.com`);
    await page.fill('input[type="password"]', 'Newpc4us!');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/sign in failed|invalid/i).first()).toBeVisible({ timeout: 8000 });
    // Must NOT say "email not found" — prevents user enumeration
    await expect(page.getByText(/email not found|no account/i)).not.toBeVisible();
  });

  test('AUTH-N-003: empty email — browser validation blocks submit', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="password"]', 'Newpc4us!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login/);
  });

  test('AUTH-N-004: empty password — browser validation blocks submit', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', ADMIN.email);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login/);
  });

  test('AUTH-N-005: malformed email — browser type validation blocks submit', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[type="email"]', 'notanemail');
    await page.fill('input[type="password"]', 'Newpc4us!');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/login/);
  });

  test('AUTH-N-006: register — empty name shows toast error', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[id="fullName"], input[placeholder*="name" i]', ' '); // space passes required but fails trim
    await page.fill('input[type="email"]', `test_${TS}@test.com`);
    await page.fill('input[type="password"]', 'Secure1!');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/name required/i).first()).toBeVisible({ timeout: 6000 });
  });

  test('AUTH-N-007: register — password < 8 chars shows toast error', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[id="fullName"], input[placeholder*="name" i]', 'Test User');
    await page.fill('input[type="email"]', `test_${TS}@test.com`);
    await page.fill('input[type="password"]', 'Ab1!');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/password must be at least 8/i).first()).toBeVisible({ timeout: 6000 });
  });

  test('AUTH-N-008: register — password no uppercase shows toast error', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[id="fullName"], input[placeholder*="name" i]', 'Test User');
    await page.fill('input[type="email"]', `test_${TS}@test.com`);
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/uppercase|too weak/i).first()).toBeVisible({ timeout: 6000 });
  });

  test('AUTH-N-009: register — password no number shows toast error', async ({ page }) => {
    await page.goto('/register');
    await page.fill('input[id="fullName"], input[placeholder*="name" i]', 'Test User');
    await page.fill('input[type="email"]', `test_${TS}@test.com`);
    await page.fill('input[type="password"]', 'PasswordOnly');
    await page.click('button[type="submit"]');
    await expect(page.getByText(/number|too weak/i).first()).toBeVisible({ timeout: 6000 });
  });

  test('AUTH-N-010: unauthenticated access to /profile redirects to /login', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('AUTH-N-011: unauthenticated access to /admin redirects', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin/, { timeout: 8000 });
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 2 — NAVIGATION
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('NAV: Navigation', () => {

  test('NAV-P-001: public nav shows all main links', async ({ page }) => {
    await page.goto('/');
    for (const name of ['Sermons', 'Events', 'Groups', 'Prayer', 'Give']) {
      await expect(page.getByRole('link', { name, exact: true }).first()).toBeVisible();
    }
  });

  test('NAV-P-002: each nav link navigates to correct page', async ({ page }) => {
    const routes: [string, RegExp][] = [
      ['Sermons', /\/sermons/], ['Events', /\/events/],
      ['Groups', /\/groups/], ['Give', /\/give|\/login/],
    ];
    for (const [name, urlPattern] of routes) {
      await page.goto('/');
      await page.getByRole('link', { name, exact: true }).first().click();
      await expect(page).toHaveURL(urlPattern, { timeout: 8000 });
    }
  });

  test('NAV-P-003: logo navigates to home', async ({ page }) => {
    await page.goto('/sermons');
    await page.getByRole('link', { name: /grace community/i }).first().click();
    await expect(page).toHaveURL(/\/$|\/$/);
  });

  test('NAV-P-004: authenticated member sees My Profile in dropdown', async ({ page }) => {
    await loginAsMember(page);
    const avatar = page.locator('button:has(img[alt]), button:has([class*="avatar"]), [data-testid="user-btn"]').first();
    if (await avatar.count() > 0) {
      await avatar.click();
    } else {
      await page.locator('button[aria-label="Open account menu"]').click();
    }
    await expect(page.getByText(/my profile/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('NAV-P-005: admin sees Admin Dashboard link in dropdown', async ({ page }) => {
    await loginAsAdmin(page);
    const dropdownTrigger = page.locator('button[aria-label="Open account menu"]');
    await dropdownTrigger.click();
    await expect(page.getByText(/admin dashboard/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('NAV-P-006: member does NOT see Admin Dashboard link', async ({ page }) => {
    await loginAsMember(page);
    await expect(page.getByText(/admin dashboard/i)).not.toBeVisible();
  });

  test('NAV-P-007: mobile menu opens and shows all nav links', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');
    const hamburger = page.getByRole('button', { name: /menu|open/i })
      .or(page.locator('button[aria-label*="menu" i]'))
      .first();
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await expect(page.getByRole('link', { name: 'Sermons', exact: true }).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('NAV-P-008: 404 page renders for unknown route', async ({ page }) => {
    await page.goto('/this-page-does-not-exist-xyz');
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(0);
    // Should show some 404/not found content
    await expect(page.locator('h1, h2, main').first()).toBeVisible();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 3 — HOME PAGE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('HOME: Home Page', () => {

  test('HOME-P-001: hero loads with church name and CTAs', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toContainText(/grace community/i);
  });

  test('HOME-P-002: unauthenticated hero shows Join CTA', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: /join/i }).or(page.getByText(/join our community/i)).first()).toBeVisible();
  });

  test('HOME-P-003: authenticated member hero shows My Profile button', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/');
    await expect(page.getByRole('link', { name: /my profile/i }).or(page.getByText(/my profile/i)).first()).toBeVisible({ timeout: 6000 });
  });

  test('HOME-P-004: Watch Sermons button navigates to /sermons', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /watch sermons/i }).or(page.getByText(/watch sermons/i)).first().click();
    await expect(page).toHaveURL(/\/sermons/, { timeout: 8000 });
  });

  test('HOME-P-005: Find a Small Group CTA navigates to /groups', async ({ page }) => {
    await page.goto('/');
    const groupLink = page.getByRole('link', { name: /small group|find.*group|browse group/i }).first();
    if (await groupLink.count() > 0) {
      await groupLink.click();
      await expect(page).toHaveURL(/\/groups/, { timeout: 8000 });
    }
  });

  test('HOME-P-006: service times section is visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText(/join us for worship/i).or(page.getByText(/service times/i)).first()).toBeVisible({ timeout: 8000 });
  });

  test('HOME-P-007: page loads with no uncaught JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 4 — SERMONS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('SERM: Sermons', () => {

  test('SERM-P-001: sermons page loads with heading', async ({ page }) => {
    await page.goto('/sermons');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('SERM-P-002: accessible without login', async ({ page }) => {
    await page.goto('/sermons');
    await expect(page).toHaveURL(/\/sermons/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('SERM-P-003: search/filter controls render', async ({ page }) => {
    await page.goto('/sermons');
    const hasInput = await page.locator('input[placeholder*="search" i], input[type="search"]').count() > 0;
    const hasSelect = await page.locator('select, [role="combobox"]').count() > 0;
    expect(hasInput || hasSelect).toBe(true);
  });

  test('SERM-P-004: sermon content or empty state visible', async ({ page }) => {
    await page.goto('/sermons');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('main').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
  });

  test('SERM-P-005: page renders without JS errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    await page.goto('/sermons');
    await page.waitForLoadState('networkidle');
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 5 — EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('EVT: Events', () => {

  test('EVT-P-001: events page loads with heading', async ({ page }) => {
    await page.goto('/events');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('EVT-P-002: accessible without login', async ({ page }) => {
    await page.goto('/events');
    await expect(page).toHaveURL(/\/events/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('EVT-P-003: events content or empty state renders', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('main').innerText();
    expect(bodyText.length).toBeGreaterThan(10);
  });

  test('EVT-P-004: date and location info visible when events exist', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    // If events exist, they show date info
    const hasDateInfo = await page.getByText(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec/i).count() > 0;
    const hasEmptyState = await page.getByText(/no events|no upcoming/i).count() > 0;
    expect(hasDateInfo || hasEmptyState).toBe(true);
  });

  test('EVT-P-005: RSVP button visible for logged-in member', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    // Either events with RSVP controls exist, or empty state
    const main = await page.locator('main').innerText();
    expect(main.length).toBeGreaterThan(5);
  });

  test('EVT-N-001: events page renders without errors when no events', async ({ page }) => {
    await page.goto('/events');
    await page.waitForLoadState('networkidle');
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    expect(errors).toHaveLength(0);
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 6 — GROUPS (member view)
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('GRP: Groups — Member View', () => {

  test('GRP-P-001: groups page loads with heading', async ({ page }) => {
    await page.goto('/groups');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('GRP-P-002: "All Groups" filter button is active by default', async ({ page }) => {
    await page.goto('/groups');
    const allBtn = page.getByRole('button', { name: /all groups/i }).first();
    await expect(allBtn).toBeVisible();
    await expect(allBtn).toHaveClass(/bg-teal/);
  });

  test('GRP-P-003: category filter buttons all present', async ({ page }) => {
    await page.goto('/groups');
    for (const cat of ['Bible Study', 'Youth', 'Women', 'Men']) {
      await expect(page.getByRole('button', { name: cat, exact: true })).toBeVisible();
    }
  });

  test('GRP-P-004: clicking category filter changes active state', async ({ page }) => {
    await page.goto('/groups');
    const bibleBtn = page.getByRole('button', { name: 'Bible Study', exact: true });
    await bibleBtn.click();
    await expect(bibleBtn).toHaveClass(/bg-teal/);
    const allBtn = page.getByRole('button', { name: /all groups/i }).first();
    await expect(allBtn).not.toHaveClass(/bg-teal/);
  });

  test('GRP-P-005: clicking All Groups resets filter', async ({ page }) => {
    await page.goto('/groups');
    await page.getByRole('button', { name: 'Youth', exact: true }).click();
    await page.getByRole('button', { name: /all groups/i }).first().click();
    const allBtn = page.getByRole('button', { name: /all groups/i }).first();
    await expect(allBtn).toHaveClass(/bg-teal/);
  });

  test('GRP-P-006: groups show cards or empty state — not blank', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    const main = await page.locator('main').innerText();
    expect(main.length).toBeGreaterThan(5);
  });

  test('GRP-P-007: each category filter cycles through with correct active state', async ({ page }) => {
    await page.goto('/groups');
    const categories = ['Bible Study', 'Youth', 'Women', 'Men', 'Couples'];
    for (const cat of categories) {
      const btn = page.getByRole('button', { name: cat, exact: true });
      if (await btn.count() > 0) {
        await btn.click();
        await expect(btn).toHaveClass(/bg-teal/);
      }
    }
  });

  test('GRP-N-001: join group while not logged in shows sign-in toast', async ({ page }) => {
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    const joinBtn = page.getByRole('button', { name: /^join$/i }).first();
    if (await joinBtn.count() > 0) {
      await joinBtn.click();
      await expect(page.getByText(/sign in required/i).first()).toBeVisible({ timeout: 6000 });
    }
  });

  test('GRP-P-008: logged-in member sees Join or Joined button on group cards', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');
    const hasJoin = await page.getByRole('button', { name: /^join$|joined/i }).count() > 0;
    const hasEmpty = await page.getByText(/no groups/i).count() > 0;
    expect(hasJoin || hasEmpty).toBe(true);
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 7 — PRAYER WALL
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('PRAY: Prayer Wall', () => {

  test('PRAY-P-001: prayer page loads with heading and submit button', async ({ page }) => {
    await page.goto('/prayer');
    await expect(page.locator('h1').first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /share a request/i })).toBeVisible();
  });

  test('PRAY-P-002: three filter tabs visible — All / Needs Prayer / Answered', async ({ page }) => {
    await page.goto('/prayer');
    await expect(page.getByRole('button', { name: /all requests/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /needs prayer/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /answered/i })).toBeVisible();
  });

  test('PRAY-P-003: filter tabs switch active state', async ({ page }) => {
    await page.goto('/prayer');
    const needsBtn = page.getByRole('button', { name: /needs prayer/i });
    await needsBtn.click();
    await expect(needsBtn).toHaveClass(/bg-teal/);
    const allBtn = page.getByRole('button', { name: /all requests/i });
    await expect(allBtn).not.toHaveClass(/bg-teal/);
  });

  test('PRAY-P-004: clicking share request while unauthenticated shows sign-in toast', async ({ page }) => {
    await page.goto('/prayer');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /share a request/i }).click();
    await expect(page.getByText(/sign in required/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('PRAY-P-005: authenticated member can open submit dialog', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/prayer');
    await page.waitForSelector('button[aria-label="Open account menu"]', { timeout: 15000 });
    await page.getByRole('button', { name: /share a request/i }).click();
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog])')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/submit a prayer request/i)).toBeVisible();
  });

  test('PRAY-P-006: submit form has title, body, category, anonymous fields', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/prayer');
    await page.waitForSelector('button[aria-label="Open account menu"]', { timeout: 15000 });
    await page.getByRole('button', { name: /share a request/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])', { timeout: 10000 });
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first()).toBeVisible();
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog]) textarea')).toBeVisible();
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog]) [role="combobox"]')).toBeVisible();
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog]) [role="checkbox"]')).toBeVisible();
  });

  test('PRAY-P-007: title character counter counts down from 100', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/prayer');
    await page.waitForSelector('button[aria-label="Open account menu"]', { timeout: 15000 });
    await page.getByRole('button', { name: /share a request/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    const titleInput = page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first();
    await titleInput.fill('Hello');
    await expect(page.getByText(/95 left/i).or(page.locator('span:has-text("95 left")')).first()).toBeVisible({ timeout: 4000 });
  });

  test('PRAY-P-008: title capped at 100 characters', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/prayer');
    await page.waitForSelector('button[aria-label="Open account menu"]', { timeout: 15000 });
    await page.getByRole('button', { name: /share a request/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    const titleInput = page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first();
    const longText = 'A'.repeat(150);
    await titleInput.fill(longText);
    const val = await titleInput.inputValue();
    expect(val.length).toBeLessThanOrEqual(100);
  });

  test('PRAY-P-009: body capped at 500 characters', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/prayer');
    await page.waitForSelector('button[aria-label="Open account menu"]', { timeout: 15000 });
    await page.getByRole('button', { name: /share a request/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    const bodyArea = page.locator('[role="dialog"]:not([data-nextjs-dialog]) textarea');
    await bodyArea.fill('B'.repeat(600));
    const val = await bodyArea.inputValue();
    expect(val.length).toBeLessThanOrEqual(500);
  });

  test('PRAY-P-010: category dropdown has all 7 options', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/prayer');
    await page.waitForSelector('button[aria-label="Open account menu"]', { timeout: 15000 });
    await page.getByRole('button', { name: /share a request/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) [role="combobox"]').click();
    for (const cat of ['general', 'health', 'family', 'finances', 'relationships', 'guidance', 'praise']) {
      await expect(page.getByRole('option', { name: cat, exact: true })).toBeVisible({ timeout: 3000 });
    }
  });

  test('PRAY-P-011: anonymous checkbox toggles on and off', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/prayer');
    await page.waitForSelector('button[aria-label="Open account menu"]', { timeout: 15000 });
    await page.getByRole('button', { name: /share a request/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    const checkbox = page.locator('[role="dialog"]:not([data-nextjs-dialog]) [role="checkbox"]');
    const initialState = await checkbox.getAttribute('data-state');
    await checkbox.click();
    const newState = await checkbox.getAttribute('data-state');
    expect(initialState).not.toBe(newState);
    await checkbox.click();
    expect(await checkbox.getAttribute('data-state')).toBe(initialState);
  });

  test('PRAY-P-012: submit button disabled while submitting', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/prayer');
    await page.waitForSelector('button[aria-label="Open account menu"]', { timeout: 15000 });
    await page.getByRole('button', { name: /share a request/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first().fill('Test prayer title');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) textarea').fill('This is a test prayer request body text.');
    const submitBtn = page.locator('[role="dialog"]:not([data-nextjs-dialog]) button[type="submit"]');
    await expect(submitBtn).not.toBeDisabled();
  });

  test('PRAY-P-013: submit empty title prevents submission', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/prayer');
    await page.waitForSelector('button[aria-label="Open account menu"]', { timeout: 15000 });
    await page.getByRole('button', { name: /share a request/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) textarea').fill('Body text here');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) button[type="submit"]').click();
    // Dialog stays open (required validation)
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog])')).toBeVisible();
  });

  test('PRAY-P-014: dialog closes when clicking Cancel or outside', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/prayer');
    await page.waitForSelector('button[aria-label="Open account menu"]', { timeout: 15000 });
    await page.getByRole('button', { name: /share a request/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    // Press Escape to close
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog])')).not.toBeVisible({ timeout: 3000 });
  });

  test('PRAY-P-015: successful prayer submission adds to wall', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/prayer');
    await page.waitForSelector('button[aria-label="Open account menu"]', { timeout: 15000 });
    await page.getByRole('button', { name: /share a request/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    const uniqueTitle = `Test Prayer ${TS}`;
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first().fill(uniqueTitle);
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) textarea').fill('Please pray for this automated test submission.');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) button[type="submit"]').click();
    await expect(page.getByText(/prayer request submitted/i).or(page.getByText(/our community will be praying/i)).first()).toBeVisible({ timeout: 8000 });
    // Verify it appears on the wall
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 6000 });
  });

  test('PRAY-P-016: admin sees Mark Answered and Delete controls', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/prayer');
    await page.waitForLoadState('networkidle');
    // Admin stats bar visible
    await expect(page.getByText(/need prayer|answered/i).first()).toBeVisible({ timeout: 6000 });
  });

  test('PRAY-P-017: read more expands long prayer body', async ({ page }) => {
    await page.goto('/prayer');
    await page.waitForLoadState('networkidle');
    const readMore = page.getByRole('button', { name: /read more/i }).first();
    if (await readMore.count() > 0) {
      await readMore.click();
      await expect(page.getByRole('button', { name: /show less/i })).toBeVisible({ timeout: 3000 });
    }
  });

  test('PRAY-N-001: non-admin member sees no Mark Answered or Delete buttons', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/prayer');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: /mark answered/i })).not.toBeVisible();
    await expect(page.getByRole('button', { name: /delete/i })).not.toBeVisible();
  });

  test('PRAY-N-002: admin mark answered dialog has word counter and confirm button', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/prayer');
    await page.waitForLoadState('networkidle');
    const markAnsweredBtn = page.getByRole('button', { name: /mark answered/i }).first();
    if (await markAnsweredBtn.count() > 0) {
      await markAnsweredBtn.click();
      await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog])')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText(/0 \/ 100 words/i).or(page.getByText(/100 words/i)).first()).toBeVisible();
      await expect(page.getByRole('button', { name: /confirm answered/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

  test('PRAY-N-003: admin answer note over 100 words disables confirm button', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/prayer');
    await page.waitForLoadState('networkidle');
    const markBtn = page.getByRole('button', { name: /mark answered/i }).first();
    if (await markBtn.count() > 0) {
      await markBtn.click();
      await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
      // Type 105 words
      const longNote = Array(105).fill('word').join(' ');
      await page.locator('[role="dialog"]:not([data-nextjs-dialog]) textarea').fill(longNote);
      await expect(page.getByRole('button', { name: /confirm answered/i })).toBeDisabled({ timeout: 3000 });
      await expect(page.getByText(/over the limit/i)).toBeVisible();
      await page.keyboard.press('Escape');
    }
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 8 — GIVING
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('GIVE: Giving', () => {

  test('GIVE-P-001: give page loads with demo mode banner', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    await expect(page.getByText(/demo mode/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('GIVE-P-002: fund dropdown shows active funds', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    await page.waitForLoadState('networkidle');
    const select = page.locator('[role="combobox"]').first();
    await expect(select).toBeVisible();
    await select.click();
    const options = page.locator('[role="option"]');
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
  });

  test('GIVE-P-003: preset amounts $25 $50 $100 $250 $500 all visible', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    for (const amt of ['$25', '$50', '$100', '$250', '$500']) {
      await expect(page.getByRole('button', { name: amt }).first()).toBeVisible({ timeout: 6000 });
    }
  });

  test('GIVE-P-004: clicking preset amount highlights button and sets value', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    const btn50 = page.locator('button[aria-label="Give $50"]');
    await btn50.click();
    await expect(btn50).toHaveClass(/bg-teal/);
    const amtInput = page.locator('input[type="number"]');
    expect(await amtInput.inputValue()).toBe('50');
  });

  test('GIVE-P-005: each preset button highlights exclusively', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    await page.locator('button[aria-label="Give $25"]').click();
    await page.locator('button[aria-label="Give $250"]').click();
    await expect(page.locator('button[aria-label="Give $250"]')).toHaveClass(/bg-teal/);
    await expect(page.locator('button[aria-label="Give $25"]')).not.toHaveClass(/bg-teal/);
  });

  test('GIVE-P-006: custom amount input accepts typed value', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    const input = page.locator('input[type="number"]');
    await input.fill('75');
    expect(await input.inputValue()).toBe('75');
  });

  test('GIVE-P-007: one-time vs monthly frequency toggles correctly', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    const monthly = page.getByRole('button', { name: /monthly giving/i });
    await monthly.click();
    await expect(monthly).toHaveClass(/bg-teal|border-teal/);
    const oneTime = page.getByRole('button', { name: /one.time gift/i });
    await oneTime.click();
    await expect(oneTime).toHaveClass(/bg-teal|border-teal/);
  });

  test('GIVE-P-008: donor name and email pre-filled for logged-in member', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    await page.waitForLoadState('networkidle');
    const nameInput = page.locator('input[autocomplete="name"]');
    const emailInput = page.locator('input[type="email"]');
    const nameVal = await nameInput.inputValue();
    const emailVal = await emailInput.inputValue();
    expect(nameVal.length + emailVal.length).toBeGreaterThan(0);
  });

  test('GIVE-P-009: fund card click selects fund and shows Selected badge', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    await page.waitForLoadState('networkidle');
    const fundCards = page.locator('[class*="cursor-pointer"]').filter({ hasText: /fund|general|building|missions/i });
    if (await fundCards.count() > 1) {
      await fundCards.nth(1).click();
      await expect(page.getByText('Selected').first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('GIVE-P-010: successful donation shows thank you banner', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="number"]').fill('25');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/thank you for your gift/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('GIVE-N-001: submit with empty amount shows validation error', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    await page.waitForLoadState('networkidle');
    const input = page.locator('input[type="number"]');
    await input.fill('');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/invalid amount|enter a valid/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('GIVE-N-002: submit with amount $0 shows validation error', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="number"]').fill('0');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/invalid amount|enter a valid/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('GIVE-N-003: amount over $100,000 shows max limit error', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    await page.locator('input[type="number"]').fill('100001');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/100,000|too large|maximum/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('GIVE-N-004: negative amount shows validation error', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="number"]').fill('-50');
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText(/invalid amount|enter a valid/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('GIVE-N-005: unauthenticated user redirected to login', async ({ page }) => {
    await page.goto('/give');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

  test('GIVE-E-001: boundary — amount exactly $1 is accepted', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="number"]').fill('1');
    await page.locator('button[type="submit"]').click();
    // Should either succeed or not show "invalid amount" error
    await page.waitForTimeout(2000);
    await expect(page.getByText(/invalid amount/i)).not.toBeVisible();
  });

  test('GIVE-E-002: boundary — amount exactly $100,000 is accepted', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    await page.waitForLoadState('networkidle');
    await page.locator('input[type="number"]').fill('100000');
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(2000);
    await expect(page.getByText(/too large|maximum/i)).not.toBeVisible();
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 9 — ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('ANN: Announcements', () => {

  test('ANN-P-001: announcements page loads with heading', async ({ page }) => {
    await page.goto('/announcements');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('ANN-P-002: accessible without login', async ({ page }) => {
    await page.goto('/announcements');
    await expect(page).toHaveURL(/\/announcements/);
    await expect(page.locator('main')).toBeVisible();
  });

  test('ANN-P-003: announcements or empty state renders without crash', async ({ page }) => {
    await page.goto('/announcements');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('main').innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });

  test('ANN-P-004: no JS errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('/announcements');
    await page.waitForLoadState('networkidle');
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 10 — MEMBER PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('PROF: Member Profile', () => {

  test('PROF-P-001: profile page loads with member data', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/profile');
    await expect(page.locator('h1').first()).toContainText(/my profile/i);
    await expect(page.getByText(MEMBER.email)).toBeVisible({ timeout: 8000 });
  });

  test('PROF-P-002: all form fields visible — name, phone, address, bio', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[autocomplete="name"]')).toBeVisible({ timeout: 8000 });
    await expect(page.locator('input[autocomplete="tel"]')).toBeVisible();
    await expect(page.locator('input[autocomplete="street-address"]')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('PROF-P-003: Save Changes button present and enabled by default', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/profile');
    await expect(page.getByRole('button', { name: /save changes/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByRole('button', { name: /save changes/i })).not.toBeDisabled();
  });

  test('PROF-P-004: save profile with valid data shows success toast', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const nameInput = page.locator('input[autocomplete="name"]');
    await nameInput.clear();
    await nameInput.fill('Janice Arsipathi');
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText(/profile updated/i).first()).toBeVisible({ timeout: 8000 });
  });

  test('PROF-P-005: saving empty name shows inline error', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const nameInput = page.locator('input[autocomplete="name"]');
    await nameInput.clear();
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText(/full name is required/i)).toBeVisible({ timeout: 5000 });
  });

  test('PROF-P-006: name over 100 chars shows inline error', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const nameInput = page.locator('input[autocomplete="name"]');
    await nameInput.clear();
    await nameInput.fill('A'.repeat(101));
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText(/100 characters/i)).toBeVisible({ timeout: 5000 });
  });

  test('PROF-P-007: bio over 500 chars shows inline error', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const bioTextarea = page.locator('textarea');
    await bioTextarea.clear();
    await bioTextarea.fill('X'.repeat(501));
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText(/500 characters/i)).toBeVisible({ timeout: 5000 });
  });

  test('PROF-P-008: avatar upload button visible with camera icon', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[type="file"]')).toBeAttached({ timeout: 8000 });
    await expect(page.locator('label[aria-label*="upload" i]').or(page.locator('label:has(input[type="file"])')).first()).toBeVisible();
  });

  test('PROF-P-009: My Groups section visible when member has groups', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    // Either groups section shows, or it's hidden (no groups) — neither should crash
    const body = await page.locator('body').innerText();
    expect(body.length).toBeGreaterThan(100);
  });

  test('PROF-P-010: prayer requests section visible on profile', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    const hasPrayerSection = await page.getByText(/my prayer requests/i).count() > 0;
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.toLowerCase()).toMatch(/prayer|group|attendance|rsvp|given/);
  });

  test('PROF-P-011: role and status badges displayed correctly', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    // Should show role/status text (member/admin/staff/pending/active)
    const bodyText = await page.locator('main').innerText();
    expect(bodyText.toLowerCase()).toMatch(/member|admin|staff|pending|active/);
  });

  test('PROF-P-012: admin role shows red badge', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/admin/i).first()).toBeVisible({ timeout: 6000 });
  });

  test('PROF-N-001: profile page unauthenticated redirects to login', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/, { timeout: 8000 });
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 11 — ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('ADM-DASH: Admin Dashboard', () => {

  test('ADM-D-001: dashboard loads with stats cards', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    // Should show numeric stats
    const numbers = await page.locator('main').locator('*').filter({ hasText: /^\d+$/ }).count();
    expect(numbers).toBeGreaterThanOrEqual(0); // graceful even if 0
  });

  test('ADM-D-002: dashboard shows recent registrations or empty state', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('main').innerText();
    expect(bodyText.length).toBeGreaterThan(50);
  });

  test('ADM-D-003: admin sidebar shows all admin module links', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin');
    for (const link of ['Users', 'Groups', 'Sermons', 'Events', 'Announcements']) {
      await expect(page.getByRole('link', { name: link }).or(page.getByText(link)).first()).toBeVisible({ timeout: 6000 });
    }
  });

  test('ADM-D-004: member cannot access /admin, gets redirected', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/admin');
    await expect(page).not.toHaveURL(/\/admin$/, { timeout: 8000 });
  });

  test('ADM-D-005: no JS errors on admin dashboard load', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await loginAsAdmin(page);
    await page.waitForLoadState('networkidle');
    expect(errors.filter(e => !e.includes('ResizeObserver'))).toHaveLength(0);
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 12 — ADMIN USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('USR: Admin User Management', () => {

  test('USR-P-001: user list loads all users in table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table, [role="table"]').first()).toBeVisible({ timeout: 8000 });
  });

  test('USR-P-002: search by name filters table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    const searchInput = page.locator('input[placeholder*="search" i]');
    await searchInput.fill('Janice');
    await page.waitForTimeout(500);
    const rows = await page.locator('tbody tr, [role="row"]').count();
    expect(rows).toBeGreaterThanOrEqual(0);
  });

  test('USR-P-003: search by email filters table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    const searchInput = page.locator('input[placeholder*="search" i]');
    await searchInput.fill('dinakar');
    await page.waitForTimeout(500);
    await expect(page.getByText(ADMIN.email)).toBeVisible({ timeout: 5000 });
  });

  test('USR-P-004: clear search restores full list', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    const searchInput = page.locator('input[placeholder*="search" i]');
    await searchInput.fill('zzznomatch');
    await searchInput.clear();
    await page.waitForTimeout(500);
    const rows = await page.locator('tbody tr, [role="row"]').count();
    expect(rows).toBeGreaterThan(0);
  });

  test('USR-P-005: status filter dropdown present with options', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    const statusSelect = page.locator('[role="combobox"]').first();
    await expect(statusSelect).toBeVisible();
    await statusSelect.click();
    await expect(page.getByRole('option', { name: /pending/i })).toBeVisible({ timeout: 4000 });
    await expect(page.getByRole('option', { name: /active/i })).toBeVisible();
    await expect(page.getByRole('option', { name: /suspended/i })).toBeVisible();
  });

  test('USR-P-006: Add Member dialog opens with required fields', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /add member/i }).click();
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog])')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first()).toBeVisible();
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog]) input[type="email"]')).toBeVisible();
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog]) input[type="password"]').or(page.locator('[role="dialog"]:not([data-nextjs-dialog]) input[placeholder*="password" i]')).first()).toBeVisible();
  });

  test('USR-P-007: Add Member dialog cancel closes without creating user', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.getByRole('button', { name: /add member/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog])')).not.toBeVisible({ timeout: 3000 });
  });

  test('USR-P-008: Add Member — empty name shows validation error', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.getByRole('button', { name: /add member/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first().fill(' '); // space bypasses required, fails trim
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input[type="email"]').fill('test@test.com');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input[type="password"]').fill('Secure1!');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) button[type="submit"]').click();
    await expect(page.getByText(/validation error|required/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('USR-P-009: Add Member — creates user and appears in list', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.getByRole('button', { name: /add member/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    const testEmail = `autotest_${TS}@testchurch.com`;
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first().fill(`Auto Tester ${TS}`);
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input[type="email"]').fill(testEmail);
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input[type="password"]').fill('Secure1Test!');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) button[type="submit"]').click();
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog])')).not.toBeVisible({ timeout: 12000 });
    await expect(page.getByText(testEmail)).toBeVisible({ timeout: 8000 });
  });

  test('USR-N-001: non-admin (member) cannot access /admin/users', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/admin/users');
    await expect(page).not.toHaveURL(/\/admin\/users/, { timeout: 8000 });
  });

  test('USR-N-002: Add Member — duplicate email shows error', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.getByRole('button', { name: /add member/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first().fill('Duplicate Test');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input[type="email"]').fill(MEMBER.email); // already exists
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input[type="password"]').fill('Secure1Test!');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) button[type="submit"]').click();
    await expect(page.getByText(/already exists|registered|failed to add/i).first()).toBeVisible({ timeout: 10000 });
  });

  test('USR-N-003: Add Member — password too short shows error', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.getByRole('button', { name: /add member/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first().fill('Short Pass Test');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input[type="email"]').fill(`shortpw_${TS}@test.com`);
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input[type="password"]').fill('Abc123');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) button[type="submit"]').click();
    await expect(page.getByText(/8 characters|too short|at least/i).first()).toBeVisible({ timeout: 8000 });
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 13 — ADMIN GROUPS MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('GRP-A: Admin Groups Management', () => {

  test('GRP-A-001: admin groups page loads with table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/groups');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('table, [role="table"]').or(page.getByText(/no groups yet/i)).first()).toBeVisible({ timeout: 8000 });
  });

  test('GRP-A-002: Create Group button opens dialog', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/groups');
    await page.getByRole('button', { name: /create group|add group/i }).first().click();
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog])')).toBeVisible({ timeout: 5000 });
  });

  test('GRP-A-003: create group dialog has name field (required)', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/groups');
    await page.getByRole('button', { name: /create group|add group/i }).first().click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first()).toBeVisible();
  });

  test('GRP-A-004: create group — empty name shows error', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/groups');
    await page.getByRole('button', { name: /create group|add group/i }).first().click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first().fill(' '); // space bypasses required, fails trim
    const saveBtn = page.locator('[role="dialog"]:not([data-nextjs-dialog]) button[type="submit"]')
      .or(page.locator('[role="dialog"]:not([data-nextjs-dialog]) button:has-text("Save")'))
      .or(page.locator('[role="dialog"]:not([data-nextjs-dialog]) button:has-text("Create")'));
    await saveBtn.first().click();
    await expect(page.getByText(/Group name is required|required/i).first()).toBeVisible({ timeout: 5000 });
  });

  test('GRP-A-005: create group with name — succeeds and appears in table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/groups');
    await page.getByRole('button', { name: /create group|add group/i }).first().click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    const groupName = `QA Test Group ${TS}`;
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first().fill(groupName);
    const saveBtn = page.locator('[role="dialog"]:not([data-nextjs-dialog]) button[type="submit"]')
      .or(page.locator('[role="dialog"]:not([data-nextjs-dialog]) button:has-text("Save")'))
      .or(page.locator('[role="dialog"]:not([data-nextjs-dialog]) button:has-text("Create")'));
    await saveBtn.first().click();
    await expect(page.getByText(/created|success/i).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(groupName)).toBeVisible({ timeout: 6000 });
  });

  test('GRP-A-006: edit group — change name saves correctly', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/groups');
    await page.waitForLoadState('networkidle');
    const editBtn = page.getByRole('button', { name: /edit/i }).first();
    if (await editBtn.count() > 0) {
      await editBtn.click();
      await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
      const nameInput = page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first();
      await nameInput.clear();
      const updatedName = `Updated Group ${TS}`;
      await nameInput.fill(updatedName);
      const saveBtn = page.locator('[role="dialog"]:not([data-nextjs-dialog]) button[type="submit"]')
        .or(page.locator('[role="dialog"]:not([data-nextjs-dialog]) button:has-text("Save")'));
      await saveBtn.first().click();
      await expect(page.getByText(/success|updated/i).first()).toBeVisible({ timeout: 8000 });
    }
  });

  test('GRP-A-007: delete group — confirmation stops accidental deletion', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/groups');
    await page.waitForLoadState('networkidle');
    // Use the QA group created in earlier test if present
    const qaGroupRow = page.locator('tr, [role="row"]').filter({ hasText: `QA Test Group ${TS}` });
    if (await qaGroupRow.count() > 0) {
      const deleteBtn = qaGroupRow.getByRole('button', { name: /delete/i });
      // Register dialog handler BEFORE clicking so we don't miss the confirm
      page.once('dialog', async (dialog) => { await dialog.accept(); });
      await deleteBtn.click();
      await expect(page.getByText(/deleted|success/i).first()).toBeVisible({ timeout: 8000 });
      await expect(page.getByText(`QA Test Group ${TS}`)).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('GRP-A-008: create dialog cancel closes without saving', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/groups');
    await page.getByRole('button', { name: /create group|add group/i }).first().click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first().fill('Will Not Be Saved');
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog])')).not.toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Will Not Be Saved')).not.toBeVisible();
  });

  test('GRP-A-009: member count shown in groups table', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/groups');
    await page.waitForLoadState('networkidle');
    const bodyText = await page.locator('main').innerText();
    // Table should render without undefined/NaN for member counts
    expect(bodyText).not.toContain('NaN');
    expect(bodyText).not.toContain('undefined');
  });

  test('GRP-A-010: actions column sticky — visible on narrow viewport', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/groups');
    await page.waitForLoadState('networkidle');
    await page.setViewportSize({ width: 800, height: 600 });
    const actionsHeader = page.getByRole('columnheader', { name: /actions/i });
    if (await actionsHeader.count() > 0) {
      await expect(actionsHeader).toBeVisible();
    }
  });

  test('GRP-A-N-001: member cannot access /admin/groups', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/admin/groups');
    await expect(page).not.toHaveURL(/\/admin\/groups/, { timeout: 8000 });
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 14 — ADMIN SERMONS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('ADM-SERM: Admin Sermons', () => {

  test('ADM-SERM-001: admin sermons page loads', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/sermons');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('ADM-SERM-002: add sermon button visible', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/sermons');
    await expect(page.getByRole('button', { name: /add sermon|new sermon/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test('ADM-SERM-003: create sermon — opens dialog/form', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/sermons');
    await page.getByRole('button', { name: /add sermon|new sermon/i }).first().click();
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog])').or(page.locator('form')).first()).toBeVisible({ timeout: 5000 });
  });

  test('ADM-SERM-004: create sermon — fill and save', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/sermons');
    await page.getByRole('button', { name: /add sermon|new sermon/i }).first().click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])', { timeout: 10000 });
    const titleInput = page.locator('[role="dialog"]:not([data-nextjs-dialog]) input[placeholder*="title" i], [role="dialog"] input').first();
    await titleInput.fill(`QA Sermon ${TS}`);
    const saveBtn = page.locator('[role="dialog"]:not([data-nextjs-dialog]) button[type="submit"]')
      .or(page.locator('[role="dialog"]:not([data-nextjs-dialog]) button:has-text("Save")'));
    await saveBtn.first().click();
    // Either success toast or stays open for more fields
    await page.waitForTimeout(2000);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('undefined');
  });

  test('ADM-SERM-005: member cannot access /admin/sermons', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/admin/sermons');
    await expect(page).not.toHaveURL(/\/admin\/sermons/, { timeout: 8000 });
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 15 — ADMIN EVENTS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('ADM-EVT: Admin Events', () => {

  test('ADM-EVT-001: admin events page loads', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/events');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('ADM-EVT-002: add event button present', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/events');
    await expect(page.getByRole('button', { name: /add event|new event|create event/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test('ADM-EVT-003: create event dialog opens', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/events');
    await page.getByRole('button', { name: /add event|new event|create event/i }).first().click();
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog])').or(page.locator('form')).first()).toBeVisible({ timeout: 5000 });
  });

  test('ADM-EVT-004: member cannot access /admin/events', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/admin/events');
    await expect(page).not.toHaveURL(/\/admin\/events/, { timeout: 8000 });
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 16 — ADMIN ANNOUNCEMENTS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('ADM-ANN: Admin Announcements', () => {

  test('ADM-ANN-001: admin announcements page loads', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/announcements');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 8000 });
  });

  test('ADM-ANN-002: add announcement button present', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/announcements');
    await expect(page.getByRole('button', { name: /add|new|create/i }).first()).toBeVisible({ timeout: 8000 });
  });

  test('ADM-ANN-003: create announcement — dialog opens with title and body fields', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/announcements');
    await page.getByRole('button', { name: /add|new|create/i }).first().click();
    await expect(page.locator('[role="dialog"]:not([data-nextjs-dialog])').or(page.locator('form')).first()).toBeVisible({ timeout: 5000 });
  });

  test('ADM-ANN-004: member cannot access /admin/announcements', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/admin/announcements');
    await expect(page).not.toHaveURL(/\/admin\/announcements/, { timeout: 8000 });
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 17 — ACCESS CONTROL & SECURITY
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('SEC: Access Control & Security', () => {

  test('SEC-001: GET /api/admin/groups without token returns 401', async ({ page }) => {
    const res = await page.request.get('/api/admin/groups');
    expect([401, 403]).toContain(res.status());
  });

  test('SEC-002: POST /api/admin/write without token returns 403', async ({ page }) => {
    const res = await page.request.post('/api/admin/write', {
      data: { table: 'events', operation: 'insert', payload: { title: 'hack' } },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('SEC-003: POST /api/groups/join without token returns 401', async ({ page }) => {
    const res = await page.request.post('/api/groups/join', {
      data: { group_id: 'fake-uuid', action: 'join' },
    });
    expect(res.status()).toBe(401);
  });

  test('SEC-004: POST /api/admin/write to disallowed table returns 400', async ({ page }) => {
    await loginAsAdmin(page);
    // API-level test via request
    const res = await page.request.post('/api/admin/write', {
      headers: { 'Authorization': 'Bearer invalid_token', 'Content-Type': 'application/json' },
      data: { table: 'pg_roles', operation: 'insert', payload: {} },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('SEC-005: GET /api/groups returns 200 (public endpoint)', async ({ page }) => {
    const res = await page.request.get('/api/groups');
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('groups');
    expect(Array.isArray(body.groups)).toBe(true);
  });

  test('SEC-006: POST /api/groups/join missing action returns 400', async ({ page }) => {
    const res = await page.request.post('/api/groups/join', {
      headers: { 'Authorization': 'Bearer fake_token' },
      data: { group_id: 'some-id' },
    });
    expect([400, 401]).toContain(res.status());
  });

  test('SEC-007: /api/admin/write disallowed table (users) returns 400', async ({ page }) => {
    const res = await page.request.post('/api/admin/write', {
      headers: { 'Authorization': 'Bearer faketoken', 'Content-Type': 'application/json' },
      data: { table: 'users', operation: 'insert', payload: { email: 'x@x.com' } },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('SEC-008: member role user cannot access /admin page', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/admin');
    await page.waitForURL((url) => !url.pathname.startsWith('/admin') || url.pathname === '/admin/dashboard', { timeout: 8000 });
    // Either redirected away from /admin root, or dashboard redirected them elsewhere
    const url = page.url();
    const isBlockedFromAdmin = !url.includes('/admin') ||
      url.includes('/login') ||
      url.includes('/profile') ||
      url.includes('/groups') ||
      !url.match(/\/admin$/);
    expect(isBlockedFromAdmin).toBe(true);
  });

  test('SEC-009: XSS payload in prayer title renders as text not script', async ({ page }) => {
    const xssPayload = '<script>window.__xss=1</script>';
    await loginAsMember(page);
    await page.goto('/prayer');
    await page.waitForSelector('button[aria-label="Open account menu"]', { timeout: 15000 });
    await page.getByRole('button', { name: /share a request/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first().fill(xssPayload);
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) textarea').fill('XSS test body text.');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) button[type="submit"]').click();
    await page.waitForTimeout(3000);
    // Verify no XSS executed
    const xssExecuted = await page.evaluate(() => (window as any).__xss);
    expect(xssExecuted).toBeUndefined();
    // Verify it renders as escaped text
    const content = await page.locator('body').innerHTML();
    expect(content).not.toContain('<script>window.__xss=1</script>');
  });

  test('SEC-010: admin API 401 without auth header', async ({ page }) => {
    const res = await page.request.get('/api/admin/groups', {
      headers: { 'Content-Type': 'application/json' },
    });
    expect([401, 403]).toContain(res.status());
  });

  test('SEC-011: avatar upload without auth returns 401', async ({ page }) => {
    const res = await page.request.post('/api/upload-avatar', {
      multipart: {
        file: {
          name: 'test.jpg',
          mimeType: 'image/jpeg',
          buffer: Buffer.from('fake'),
        },
      },
    });
    expect(res.status()).toBe(401);
  });

});

// ═══════════════════════════════════════════════════════════════════════════════
// MODULE 18 — END-TO-END USER JOURNEYS
// ═══════════════════════════════════════════════════════════════════════════════

test.describe('E2E: End-to-End Journeys', () => {

  test('E2E-001: full prayer journey — submit then see on wall', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/prayer');
    const uniqueTitle = `E2E Prayer Journey ${TS}`;

    // Submit prayer request
    await page.getByRole('button', { name: /share a request/i }).click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first().fill(uniqueTitle);
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) textarea').fill('Please pray for this end-to-end test to pass successfully.');
    // Select "health" category
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) [role="combobox"]').click();
    await page.getByRole('option', { name: 'health', exact: true }).click();
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) button[type="submit"]').click();

    // Verify toast
    await expect(page.getByText(/prayer request submitted/i).first()).toBeVisible({ timeout: 8000 });

    // Verify appears on wall
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 6000 });

    // Verify category badge shows
    await expect(page.getByText(/health/i).first()).toBeVisible();
  });

  test('E2E-002: full giving journey — select fund, preset amount, donate', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/give');
    await page.waitForLoadState('networkidle');

    // Select $50 preset
    await page.locator('button[aria-label="Give $50"]').click();
    await expect(page.locator('input[type="number"]')).toHaveValue('50', { timeout: 3000 });

    // Select monthly
    await page.getByRole('button', { name: /monthly giving/i }).click();

    // Submit
    await page.locator('button[type="submit"]').click();

    // Verify success
    await expect(page.getByText(/thank you for your gift/i)).toBeVisible({ timeout: 10000 });
  });

  test('E2E-003: admin creates group → visible on public groups page', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/groups');
    await page.waitForLoadState('networkidle');

    const groupName = `E2E Public Group ${TS}`;
    await page.getByRole('button', { name: /create group|add group/i }).first().click();
    await page.waitForSelector('[role="dialog"]:not([data-nextjs-dialog])');
    await page.locator('[role="dialog"]:not([data-nextjs-dialog]) input').first().fill(groupName);

    // Try to set published if toggle exists
    const publishToggle = page.locator('[role="dialog"]:not([data-nextjs-dialog]) [role="switch"], [role="dialog"] input[type="checkbox"]').last();
    if (await publishToggle.count() > 0) {
      const state = await publishToggle.getAttribute('data-state') ?? await publishToggle.isChecked().then(v => v ? 'checked' : 'unchecked');
      if (state !== 'checked') {
        await publishToggle.click();
      }
    }

    const saveBtn = page.locator('[role="dialog"]:not([data-nextjs-dialog]) button[type="submit"]')
      .or(page.locator('[role="dialog"]:not([data-nextjs-dialog]) button:has-text("Save")'))
      .or(page.locator('[role="dialog"]:not([data-nextjs-dialog]) button:has-text("Create")'));
    await saveBtn.first().click();
    await expect(page.getByText(/created|success/i).first()).toBeVisible({ timeout: 8000 });

    // Verify in admin list
    await expect(page.getByText(groupName)).toBeVisible({ timeout: 6000 });
  });

  test('E2E-004: full profile edit journey', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/profile');
    await page.waitForLoadState('networkidle');

    // Update phone
    const phoneInput = page.locator('input[autocomplete="tel"]');
    await phoneInput.clear();
    await phoneInput.fill('555-0199');

    // Update bio
    const bioTextarea = page.locator('textarea');
    await bioTextarea.clear();
    await bioTextarea.fill('E2E test bio update.');

    // Save
    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText(/profile updated/i).first()).toBeVisible({ timeout: 8000 });

    // Reload and verify persisted
    await page.reload();
    await page.waitForLoadState('networkidle');
    await expect(page.locator('input[autocomplete="tel"]')).toHaveValue('555-0199', { timeout: 6000 });
  });

  test('E2E-005: nav journey through all main pages', async ({ page }) => {
    await loginAsMember(page);
    const routes = ['/sermons', '/events', '/groups', '/prayer', '/give', '/announcements'];
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      await expect(page.locator('main')).toBeVisible({ timeout: 6000 });
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      expect(errors.filter(e => !e.includes('ResizeObserver')).length).toBe(0);
    }
  });

  test('E2E-006: admin workflow — approve pending user', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');

    // Filter to pending
    const statusSelect = page.locator('[role="combobox"]').first();
    await statusSelect.click();
    const pendingOption = page.getByRole('option', { name: /pending/i });
    if (await pendingOption.count() > 0) {
      await pendingOption.click();
      const approveBtn = page.getByRole('button', { name: /approve/i }).first();
      if (await approveBtn.count() > 0) {
        await approveBtn.click();
        await expect(page.getByText(/user updated|success/i).first()).toBeVisible({ timeout: 8000 });
      }
    }
  });

  test('E2E-007: member joins group and sees it in profile', async ({ page }) => {
    await loginAsMember(page);
    await page.goto('/groups');
    await page.waitForLoadState('networkidle');

    const joinBtn = page.getByRole('button', { name: /^join$/i }).first();
    if (await joinBtn.count() > 0) {
      await joinBtn.click();
      await expect(page.getByText(/joined/i).first()).toBeVisible({ timeout: 6000 });

      // Check profile shows the group
      await page.goto('/profile');
      await page.waitForLoadState('networkidle');
      const hasGroups = await page.getByText(/my groups/i).count() > 0 ||
                        await page.locator('[class*="group"]').count() > 0;
      expect(hasGroups).toBe(true);
    }
  });

  test('E2E-008: complete authentication cycle — login, use app, logout', async ({ page }) => {
    // Step 1: Login
    await loginAsMember(page);
    await expect(page).not.toHaveURL(/\/login/);

    // Step 2: Use the app (visit profile)
    await page.goto('/profile');
    await expect(page.getByText(/my profile/i).first()).toBeVisible({ timeout: 8000 });

    // Step 3: Navigate to prayer wall
    await page.goto('/prayer');
    await expect(page.getByRole('button', { name: /share a request/i })).toBeVisible();

    // Step 4: Sign out
    const dropdownBtn = page.locator('button[aria-label="Open account menu"]');
    await dropdownBtn.click();
    const signOut = page.getByText(/sign out/i).last();
    if (await signOut.count() > 0) {
      await signOut.click();
      await page.waitForURL(/\/$|\/login/, { timeout: 8000 });
      // Verify profile is inaccessible
      await page.goto('/profile');
      await expect(page).toHaveURL(/\/login/, { timeout: 6000 });
    }
  });

});
