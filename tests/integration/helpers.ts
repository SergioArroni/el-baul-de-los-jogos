import { expect, type Browser, type Page } from '@playwright/test';
// @ts-expect-error plain JS helper shared with the Node scripts
import { sign, USERS } from '../stack/stack.mjs';

export type UserKey = 'a' | 'b' | 'c' | 'd';
export const users = USERS as Record<UserKey, { id: string; email: string; nickname: string }>;

/** Opens the app already signed in as one of the test accounts (a session in localStorage, like after login). */
export async function openAs(browser: Browser, who: UserKey): Promise<Page> {
  const user = users[who];
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('dialog', dialog => {
    throw new Error('Native dialog shown: ' + dialog.message());
  });
  const token = sign({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated' });
  const session = {
    access_token: token, refresh_token: 'test', token_type: 'bearer', expires_in: 86400,
    expires_at: Math.floor(Date.now() / 1000) + 86400,
    user: { id: user.id, email: user.email, aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {} },
  };
  // Only on the first page: after a sign-out (or deleting the account) the session must stay gone.
  await context.addInitScript(value => {
    if (sessionStorage.getItem('test-session-seeded')) return;
    localStorage.setItem('sb-localhost-auth-token', value);
    sessionStorage.setItem('test-session-seeded', '1');
  }, JSON.stringify(session));
  await page.goto('/');
  await expect(page.locator('.syncstatus')).toHaveText('Sincronizado', { timeout: 15_000 });
  return page;
}

export const waitSynced = (page: Page) => expect(page.locator('.syncstatus')).toHaveText('Sincronizado');

export async function go(page: Page, tab: string): Promise<void> {
  await page.getByRole('navigation').getByRole('button', { name: tab }).click();
}
