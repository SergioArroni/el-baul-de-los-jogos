import { expect, test, type Page } from '@playwright/test';
// @ts-expect-error plain JS helper shared with the Node scripts
import { resetData, sql } from '../stack/stack.mjs';
import { go, openAs, users, waitSynced } from './helpers';

// Privacy is enforced by the database (sql/profiles-privacy.sql); these steps check what
// another account really gets back. Each step depends on the previous one.
test.describe.configure({ mode: 'serial' });
test.beforeAll(() => {
  resetData();
  sql(`
    insert into public.games(user_id, app_id, data) values ('${users.b.id}', 'b1', '{"id":"b1","name":"Azul","players":"2–4","types":[],"locations":["Casa B"]}');
    insert into public.plays(id, owner_id, game_name, played_on) values ('22222222-2222-2222-2222-222222222222', '${users.b.id}', 'Azul', '2026-10-20');
    insert into public.play_players(play_id, name, user_id, winner, rating) values
      ('22222222-2222-2222-2222-222222222222', 'usuario_b', '${users.b.id}', true, 9);`, { admin: true });
});

async function openProfile(page: Page, nickname: string) {
  await go(page, 'Comunidad');
  await page.getByLabel('Buscar personas por apodo').fill(nickname);
  await page.getByRole('button', { name: '@' + nickname }).click();
  await expect(page.getByRole('heading', { name: '@' + nickname })).toBeVisible();
}

test('a stranger finds B but sees nothing until B adds them', async ({ browser }) => {
  const page = await openAs(browser, 'a');
  await openProfile(page, 'usuario_b');
  await expect(page.getByText('@usuario_b solo enseña su colección a las personas que ha añadido como amigos.')).toBeVisible();
  await expect(page.getByText('@usuario_b solo enseña sus estadísticas a las personas que ha añadido como amigos.')).toBeVisible();
  await expect(page.locator('.cover')).toHaveCount(0);
});

test('B adds A as a friend from A\'s profile', async ({ browser }) => {
  const page = await openAs(browser, 'b');
  await openProfile(page, 'usuario_a');
  await page.getByRole('button', { name: 'Añadir como amigo' }).click();
  await expect(page.getByText('✓ En tus amigos')).toBeVisible();
  await waitSynced(page);
});

test('now A sees B\'s collection and statistics', async ({ browser }) => {
  const page = await openAs(browser, 'a');
  await openProfile(page, 'usuario_b');
  await expect(page.getByText('Te ha añadido')).toBeVisible();
  await expect(page.locator('.cover', { hasText: 'Azul' })).toBeVisible();
  await expect(page.locator('.stat-tile', { hasText: 'El que más le gusta' })).toContainText('Azul');
  await page.locator('.cover', { hasText: 'Azul' }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: 'Azul' })).toBeVisible();
  await expect(sheet.getByRole('button', { name: 'Editar' })).toHaveCount(0);
});

test('B makes the collection private and A stops seeing it', async ({ browser }) => {
  const b = await openAs(browser, 'b');
  await b.locator('.profile-trigger').click();
  await b.getByRole('button', { name: 'Mi perfil' }).click();
  await b.getByLabel('Mi colección').selectOption({ label: 'Privada' });
  await b.getByRole('button', { name: 'Guardar privacidad' }).click();
  await expect(b.getByText('Privacidad guardada.')).toBeVisible();

  const a = await openAs(browser, 'a');
  await openProfile(a, 'usuario_b');
  await expect(a.getByText('@usuario_b tiene su colección en privado.')).toBeVisible();
  await expect(a.locator('.cover')).toHaveCount(0);
  await expect(a.locator('.stat-tile', { hasText: 'Partidas' })).toContainText('1');
});
