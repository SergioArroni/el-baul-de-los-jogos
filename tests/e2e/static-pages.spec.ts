import { expect, test } from '@playwright/test';

// Inside the APK there may be no network: the plain pages must not depend on outside
// servers (CDNs, Google Fonts) just to show up and be ready to sign in.
test.beforeEach(async ({ page }) => {
  await page.route(url => !['localhost', '127.0.0.1'].includes(url.hostname), route => route.abort());
});

test('login page works with every outside server blocked', async ({ page }) => {
  await page.goto('/login.html');
  await expect(page.getByRole('heading', { name: 'Qué bueno verte.' })).toBeVisible();
  await expect(page.getByText('El acceso no está disponible')).toBeHidden();
  expect(await page.evaluate(() => typeof (window as { supabase?: { createClient?: unknown } }).supabase?.createClient)).toBe('function');
  await page.evaluate(() => document.fonts.ready);
  expect(await page.evaluate(() => document.fonts.check('600 32px Fraunces'))).toBe(true);
  await page.getByRole('button', { name: 'Crear una' }).click();
  await expect(page.getByRole('heading', { name: 'Crea tu cuenta.' })).toBeVisible();
});

test('admin page loads its scripts with every outside server blocked', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/admin.html');
  expect(await page.evaluate(() => typeof (window as { supabase?: { createClient?: unknown } }).supabase?.createClient)).toBe('function');
  expect(errors).toEqual([]);
});

test('the public page explains how to delete an account', async ({ page }) => {
  await page.goto('/borrar-cuenta.html');
  await expect(page.getByRole('heading', { name: 'Borrar tu cuenta' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Entrar para borrar mi cuenta' })).toHaveAttribute('href', '/login.html');
});
