import { expect, test } from '@playwright/test';

// The landing must stand on its own: no outside servers, and everything readable
// even when the system asks for reduced motion (nothing waits for an animation).
test.beforeEach(async ({ page }) => {
  await page.route(url => !['localhost', '127.0.0.1'].includes(url.hostname), route => route.abort());
});

test('the landing explains the app and leads to sign-up and login', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/inicio');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('¿A qué jugamos hoy?');
  await expect(page.getByRole('link', { name: 'Crear cuenta gratis' }).first()).toHaveAttribute('href', '/login.html?signup=1');
  await expect(page.getByRole('link', { name: 'Ya tengo cuenta' })).toHaveAttribute('href', '/login.html');
  await expect(page.getByRole('heading', { name: 'Cómo se juega, en un minuto' })).toBeAttached();
  await page.getByText('¿Hay app para iPhone?').click();
  await expect(page.getByText('No hay app de iPhone')).toBeVisible();
  expect(errors).toEqual([]);
});

test('with reduced motion everything is visible straight away', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/inicio');
  await expect(page.getByRole('heading', { name: 'Empezad en tres pasos' })).toBeVisible();
  for (const item of await page.locator('.steps li').all()) {
    await item.scrollIntoViewIfNeeded();
    expect(await item.evaluate(node => getComputedStyle(node).opacity)).toBe('1');
  }
});

test('the landing fits a phone without sideways scrolling', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 760 });
  await page.goto('/inicio');
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
});
