import { expect, test } from '@playwright/test';

test('a visitor without a session lands on /inicio, not on the login', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/inicio$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('¿A qué jugamos hoy?');
});
