import { expect, test } from '@playwright/test';
// @ts-expect-error plain JS helper shared with the Node scripts
import { resetData, sql } from '../stack/stack.mjs';
import { openAs, users, waitSynced } from './helpers';

// A has Scythe and, saved as a game of its own, its expansion El auge de Fenris, with a play.
test.beforeAll(() => {
  resetData();
  const a = users.a.id;
  sql(`
    insert into public.games(user_id, app_id, data) values
      ('${a}', 'sc', '{"id":"sc","name":"Scythe","players":"1–5","types":["Estrategia"],"duration":120,"locations":[],"notes":""}'),
      ('${a}', 'fe', '{"id":"fe","name":"Scythe: El auge de Fenris","players":"1–5","types":["Estrategia"],"duration":120,"locations":[],"notes":""}');
    insert into public.plays(id, owner_id, game_name) values ('66666666-0000-0000-0000-000000000001', '${a}', 'Scythe: El auge de Fenris');
  `, { admin: true });
});

test('moving an expansion inside its game also moves your plays of it', async ({ browser }) => {
  const page = await openAs(browser, 'a');
  const offer = page.locator('.merge-offer');
  await offer.getByRole('button', { name: 'Meterla dentro' }).click();
  await page.locator('.confirm-dialog').getByRole('button', { name: 'Meterla dentro' }).click();
  await expect(offer).toBeHidden();
  await waitSynced(page);
  await expect.poll(() => sql(`select game_name || ' ' || array_to_string(expansions, ',') from public.plays where owner_id = '${users.a.id}'`, { admin: true }).trim())
    .toBe('Scythe El auge de Fenris');
  await expect.poll(() => sql(`select count(*) from public.games where user_id = '${users.a.id}'`, { admin: true }).trim()).toBe('1');
});

test('a play records which of your expansions you played with', async ({ browser }) => {
  const page = await openAs(browser, 'a');
  await page.locator('.cover', { hasText: 'Scythe' }).first().click();
  await page.getByRole('button', { name: 'Registrar partida' }).click();
  const form = page.getByRole('dialog', { name: 'Registrar partida' });
  await form.getByLabel('El auge de Fenris').check();
  await form.getByLabel('¿Cuánto duró? (min) *').fill('130');
  await form.getByRole('button', { name: 'Guardar partida' }).click();
  await expect(form).toBeHidden();
  await expect.poll(() => sql(`select count(*) from public.plays where owner_id = '${users.a.id}' and expansions = array['El auge de Fenris']`, { admin: true }).trim()).toBe('2');
});
