import { expect, test } from '@playwright/test';
// @ts-expect-error plain JS helper shared with the Node scripts
import { resetData, sql } from '../stack/stack.mjs';
import { go, openAs, users } from './helpers';

test.beforeAll(() => resetData());

test('a game can be proposed without a link and says how keen you are', async ({ browser }) => {
  const page = await openAs(browser, 'a');
  await go(page, 'Por comprar');

  await page.getByRole('button', { name: 'Proponer juego' }).click();
  await page.getByLabel('Nombre del juego *').fill('Cascadia');
  await page.getByLabel('Descripción *').fill('Losetas y animales, muy tranquilo.');
  await page.getByRole('button', { name: 'Añadir a la lista' }).click();
  await expect(page.getByText('Elige tus ganas de jogo.')).toBeVisible();

  await page.getByLabel('Ganas de jogo *').selectOption({ label: 'Yo le daba' });
  await page.getByRole('button', { name: 'Añadir a la lista' }).click();

  const card = page.locator('.card', { hasText: 'Cascadia' });
  await expect(card).toContainText('Ganas: Yo le daba');
  await expect(card.getByRole('link', { name: 'Ver ficha / tienda' })).toHaveCount(0);
});

test('each person has three meeples, and the database refuses a fourth', async ({ browser }) => {
  sql(`insert into public.wishlist_games(user_id, title, url) values
    ('${users.b.id}', 'Ark Nova', ''), ('${users.b.id}', 'Dixit', ''), ('${users.b.id}', 'Wingspan', ''), ('${users.b.id}', 'Root', '');`, { admin: true });
  const page = await openAs(browser, 'a');
  await go(page, 'Por comprar');
  await expect(page.getByText('Te quedan 3 meeples')).toBeVisible();
  for (const title of ['Ark Nova', 'Dixit', 'Wingspan']) {
    await page.locator('.card', { hasText: title }).getByRole('button', { name: 'Poner mi meeple' }).click();
    await expect(page.locator('.card', { hasText: title }).getByRole('button', { name: 'Quitar mi meeple' })).toBeVisible();
  }
  await expect(page.getByText('Te quedan 0 meeples')).toBeVisible();
  await expect(page.locator('.card', { hasText: 'Root' }).getByRole('button', { name: 'Sin meeples libres' })).toBeDisabled();

  // Even skipping the app, the database says no.
  const root = sql(`select id from public.wishlist_games where title = 'Root';`, { admin: true }).trim();
  expect(() => sql(`insert into public.wishlist_votes(game_id, user_id) values ('${root}', '${users.a.id}');`, { admin: true })).toThrow(/Solo tienes 3 meeples/);
});
