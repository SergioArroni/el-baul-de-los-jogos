import { expect, test } from '@playwright/test';
// @ts-expect-error plain JS helper shared with the Node scripts
import { resetData } from '../stack/stack.mjs';
import { openAs } from './helpers';

// The gateway answers /api/catalog with the real catalog module and BGG fixtures (Catan).
test.beforeAll(() => resetData());

test('typing a name suggests catalog games and picking one fills the form', async ({ browser }) => {
  const page = await openAs(browser, 'a');
  await page.getByRole('button', { name: 'Añadir juego' }).click();
  await page.getByLabel('Nombre *').fill('cata');
  await page.getByRole('option', { name: /CATAN/ }).first().click();
  await expect(page.getByLabel('Nombre *')).toHaveValue('CATAN');
  await expect(page.getByLabel('Jugadores (mín.–máx.)')).toHaveValue('3–4');
  await expect(page.getByLabel('Duración en minutos')).toHaveValue('120');
  await expect(page.getByLabel('Dureza (1–5)')).toHaveValue('2');
  await expect(page.getByLabel('Estilos (separados por comas)')).toHaveValue('Estrategia, Negociación');
  // The suggestions close once one is picked (the form's own dropdowns have options too).
  await expect(page.getByRole('listbox', { name: 'Juegos del catálogo' })).toHaveCount(0);
});
