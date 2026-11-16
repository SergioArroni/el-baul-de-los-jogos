import { expect, test } from '@playwright/test';
// @ts-expect-error plain JS helper shared with the Node scripts
import { resetData, sql } from '../stack/stack.mjs';
import { openAs, users, waitSynced } from './helpers';

test.beforeAll(() => resetData());

test('two devices editing at once keep each other’s changes', async ({ browser }) => {
  const first = await openAs(browser, 'c');
  const second = await openAs(browser, 'c');

  // Device 2 deletes a game and adds another…
  await second.getByLabel('Buscar en la colección').fill('trio');
  await second.locator('.cover-grid .cover').first().click();
  await second.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await second.getByRole('dialog', { name: '¿Eliminar «Trio»?' }).getByRole('button', { name: 'Eliminar' }).click();
  await waitSynced(second);
  await second.getByRole('button', { name: 'Añadir juego' }).click();
  await second.getByLabel('Nombre *').fill('Azul');
  await second.getByRole('button', { name: 'Guardar juego' }).click();
  await waitSynced(second);

  // …while device 1, which still has the old list in memory, edits a third one.
  await first.getByLabel('Buscar en la colección').fill('munchkin');
  await first.locator('.cover-grid .cover').first().click();
  await first.getByRole('dialog').getByRole('button', { name: 'Editar' }).click();
  await first.getByLabel('Notas / expansiones / grupo ideal').fill('Editado en el dispositivo 1');
  await first.getByRole('button', { name: 'Guardar juego' }).click();
  await waitSynced(first);

  const names = sql(`select data->>'name' from public.games where user_id = '${users.c.id}' order by 1;`).trim().split('\n');
  expect(names).not.toContain('Trio');
  expect(names).toContain('Azul');
  expect(names).toHaveLength(42);
  const notes = sql(`select data->>'notes' from public.games where user_id = '${users.c.id}' and data->>'name' = 'Munchkin';`).trim();
  expect(notes).toBe('Editado en el dispositivo 1');
});

test('a change made without connection is saved when the connection is back', async ({ browser }) => {
  const page = await openAs(browser, 'c');
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Gestionar lugares' }).click();
  await page.getByRole('button', { name: 'Añadir lugar' }).click();
  await page.getByLabel('Nombre del lugar *').fill('Casa sin wifi');
  await page.getByRole('button', { name: 'Guardar lugar' }).click();
  await expect(page.locator('.syncstatus')).toHaveText('Sin conexión · se guardará al volver');

  await page.context().setOffline(false);
  await waitSynced(page);
  await expect.poll(() => sql(`select count(*) from public.places where user_id = '${users.c.id}' and data->>'name' = 'Casa sin wifi'`, { admin: true }).trim()).toBe('1');
});
