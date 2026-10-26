import { expect, test } from '@playwright/test';
// @ts-expect-error plain JS helper shared with the Node scripts
import { resetData } from '../stack/stack.mjs';
import { go, openAs, waitSynced } from './helpers';

// One story told in order: A links B, shares a group, logs a play; B gets the notice,
// sees the group and rates the play. Each step depends on the previous one.
test.describe.configure({ mode: 'serial' });
test.beforeAll(() => resetData());

test('A links B by nickname, invites someone new and shares a group', async ({ browser }) => {
  const page = await openAs(browser, 'a');
  await go(page, 'Comunidad');

  await page.getByRole('button', { name: 'Añadir amigo' }).click();
  await page.getByLabel('Nombre o apodo *').fill('usuario_b');
  await page.getByRole('button', { name: 'Guardar amigo' }).click();
  await expect(page.locator('.groupcard', { hasText: 'usuario_b' })).toContainText('Usa la app');

  await page.getByRole('button', { name: 'Añadir amigo' }).click();
  await page.getByLabel('Nombre o apodo *').fill('Tío Juan');
  await page.getByRole('button', { name: 'Guardar amigo' }).click();
  await expect(page.getByText('«Tío Juan» todavía no usa El Baúl de los Jogos.')).toBeVisible();
  await page.getByRole('button', { name: 'Invitar', exact: true }).click();
  await expect(page.getByText('Le propondremos el apodo tio_juan')).toBeVisible();
  await page.getByRole('button', { name: 'Listo' }).click();
  await expect(page.locator('.groupcard', { hasText: 'Tío Juan' })).toContainText('Invitación pendiente');

  await page.getByRole('button', { name: 'Añadir grupo' }).click();
  await page.getByLabel('Nombre del grupo *').fill('Los Balcánicos');
  await page.getByRole('dialog').getByText('usuario_b').click();
  await page.getByRole('dialog').getByText('Tío Juan').click();
  await page.getByRole('button', { name: 'Guardar grupo' }).click();
  await waitSynced(page);

  const group = page.locator('.groupcard', { hasText: 'Los Balcánicos' });
  await group.getByRole('button', { name: 'Compartir' }).click();
  const share = page.getByRole('dialog', { name: 'Compartir «Los Balcánicos»' });
  await expect(share.getByText('Hemos marcado los miembros del grupo que tienen cuenta.')).toBeVisible();
  await expect(share.getByRole('checkbox')).toBeChecked();
  await share.getByRole('button', { name: 'Guardar' }).click();
  await expect(share).toBeHidden();
});

test('B gets the friend notice and sees the shared group', async ({ browser }) => {
  const page = await openAs(browser, 'b');
  await expect(page.locator('.tab-badge')).toHaveText('1');
  await go(page, 'Comunidad');
  await expect(page.locator('.request-card')).toContainText('@usuario_a te ha añadido como amigo.');
  const group = page.locator('.groupcard', { hasText: 'Los Balcánicos' });
  await expect(group).toContainText('Compartido por @usuario_a');
  await expect(group.locator('.member')).toHaveText(['UTú', 'TTío Juan']);

  await page.getByRole('button', { name: 'Añadir también' }).click();
  await expect(page.locator('.request-card')).toHaveCount(0);
  await expect(page.locator('.tab-badge')).toHaveCount(0);
  await waitSynced(page);
});

test('A logs a play in the group with points, winner and a rating', async ({ browser }) => {
  const page = await openAs(browser, 'a');
  await go(page, 'Partidas');
  await page.getByRole('button', { name: 'Abrir grupo' }).click();
  await page.getByRole('button', { name: 'Registrar partida' }).click();
  const form = page.getByRole('dialog', { name: 'Registrar partida' });
  await expect(form.locator('.play-score-row')).toHaveCount(3);
  await form.getByLabel('Juego *').fill('Carcassonne');
  await form.getByRole('button', { name: 'Guardar partida' }).click();
  await expect(form.getByText('Indica cuánto duró la partida')).toBeVisible();
  await form.getByLabel('¿Cuánto duró? (min) *').fill('50');
  await form.getByLabel('Puntos de usuario_a').fill('52');
  await form.getByLabel('Puntos de usuario_b').fill('47');
  await form.locator('.play-score-row').first().locator('.winner-toggle').click();
  await form.getByLabel('Tu nota').selectOption('8');
  await form.getByRole('button', { name: 'Guardar partida' }).click();
  await expect(form).toBeHidden();

  const card = page.locator('.card', { hasText: 'Carcassonne' });
  await expect(card).toContainText('Yo 🏆');
  await expect(card).toContainText('Nota media 8/10');
  await expect(page.locator('.stat-tile', { hasText: 'Quién gana más' })).toContainText('1 victoria');
});

test('B rates the play from their own account', async ({ browser }) => {
  const page = await openAs(browser, 'b');
  await go(page, 'Partidas');
  await page.getByRole('button', { name: 'Ver partidas' }).click();
  const card = page.locator('.card', { hasText: 'Carcassonne' });
  await expect(card.getByRole('button', { name: 'Editar' })).toHaveCount(0);
  await card.getByLabel('Tu nota').selectOption('9');
  await expect(card).toContainText('Nota media 8,5/10');
});

test("editing the play keeps the other players' ratings", async ({ browser }) => {
  const page = await openAs(browser, 'a');
  await go(page, 'Partidas');
  await page.getByRole('button', { name: 'Ver partidas' }).click();
  await page.locator('.card', { hasText: 'Carcassonne' }).getByRole('button', { name: 'Editar' }).click();
  const form = page.getByRole('dialog', { name: 'Editar partida' });
  await form.getByLabel('Puntos de Tío Juan').fill('33');
  await form.getByRole('button', { name: 'Guardar partida' }).click();
  await expect(form).toBeHidden();
  const card = page.locator('.card', { hasText: 'Carcassonne' });
  await expect(card).toContainText('33 pts');
  await expect(card).toContainText('★ 9');
});

test('the play shows in the catalog sheet and in "¿Qué jugamos?"', async ({ browser }) => {
  const page = await openAs(browser, 'a');
  await expect(page.getByRole('heading', { name: '⭐ Vuestros favoritos' })).toHaveCount(0);
  await page.getByLabel('Buscar en la colección').fill('carcassonne');
  await page.locator('.cover-grid .cover').first().click();
  await expect(page.locator('.detail-stats')).toContainText('★ 8,5');

  await page.keyboard.press('Escape');
  await go(page, 'Qué jugamos');
  await page.getByLabel('Grupo').selectOption({ label: 'Los Balcánicos' });
  await expect(page.getByLabel('¿Cuántas personas?')).toHaveValue('3');
  await page.getByRole('button', { name: 'Encontrar juegos' }).click();
  await expect(page.locator('.reco-pick').first()).toContainText('Nota del grupo: 8,5/10');
});
