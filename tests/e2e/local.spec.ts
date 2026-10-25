import { expect, test, type Page } from '@playwright/test';

// Local mode keeps everything in the browser, so these tests need no backend.
test.beforeEach(async ({ page }) => {
  // The app must never fall back to the browser's alert/confirm/prompt.
  page.on('dialog', dialog => {
    throw new Error('Native dialog shown: ' + dialog.message());
  });
  await page.goto('/?local=1');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tu colección' })).toBeVisible();
});

const covers = (page: Page) => page.locator('.cover-grid .cover');

test('catalog shows themed shelves and the whole collection', async ({ page }) => {
  await expect(page.getByRole('heading', { name: '⚡ Para una partida rápida' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '🎉 Para cuando sois muchos' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Toda la colección' })).toBeVisible();
  await expect(covers(page)).toHaveCount(42);
});

test('style chips and search filter the catalog', async ({ page }) => {
  await page.getByRole('button', { name: /Cooperativo/ }).click();
  await expect(page.getByRole('heading', { name: /\d+ juegos/ })).toBeVisible();
  for (const text of await covers(page).allInnerTexts()) expect(text).not.toBe('');
  await page.getByRole('button', { name: 'Quitar filtros' }).click();
  await page.getByLabel('Buscar en la colección').fill('carcassonne');
  await expect(page.getByRole('heading', { name: '1 juego' })).toBeVisible();
  await expect(covers(page)).toHaveCount(1);
});

test('a game can be added, edited and deleted from its sheet', async ({ page }) => {
  await page.getByRole('button', { name: 'Añadir juego' }).click();
  await page.getByLabel('Nombre *').fill('carcassonne');
  await page.getByRole('button', { name: 'Guardar juego' }).click();
  await expect(page.getByText('Ya hay un juego con ese nombre en tu colección.')).toBeVisible();
  await page.getByLabel('Nombre *').fill('Azul');
  await page.getByLabel('Jugadores (mín.–máx.)').fill('2–4');
  await page.getByLabel('Estilos (separados por comas)').fill('Abstracto, Familiar');
  await page.getByRole('button', { name: 'Guardar juego' }).click();
  await expect(covers(page)).toHaveCount(43);

  await page.getByLabel('Buscar en la colección').fill('azul');
  await covers(page).first().click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('heading', { name: 'Azul' })).toBeVisible();
  await sheet.getByRole('button', { name: 'Editar' }).click();
  await page.getByLabel('Duración en minutos').fill('45');
  await page.getByRole('button', { name: 'Guardar juego' }).click();
  await expect(covers(page).first()).toContainText('45′');

  await covers(page).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  const confirm = page.getByRole('dialog', { name: '¿Eliminar «Azul»?' });
  await confirm.getByRole('button', { name: 'Cancelar' }).click();
  await expect(covers(page)).toHaveCount(1);
  await covers(page).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('dialog', { name: '¿Eliminar «Azul»?' }).getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByText('No hay juegos con esos filtros.')).toBeVisible();
});

test('changes survive a reload', async ({ page }) => {
  await page.getByRole('button', { name: 'Añadir juego' }).click();
  await page.getByLabel('Nombre *').fill('Juego persistente');
  await page.getByRole('button', { name: 'Guardar juego' }).click();
  await page.reload();
  await page.getByLabel('Buscar en la colección').fill('persistente');
  await expect(covers(page)).toHaveCount(1);
});

test('places can be added once', async ({ page }) => {
  await page.getByRole('button', { name: 'Gestionar lugares' }).click();
  await page.getByRole('button', { name: 'Añadir lugar' }).click();
  await page.getByLabel('Nombre del lugar *').fill('casa lu');
  await page.getByRole('button', { name: 'Guardar lugar' }).click();
  await expect(page.getByText('Ya existe un lugar con ese nombre.')).toBeVisible();
  await page.getByLabel('Nombre del lugar *').fill('Bar Tablero');
  await page.getByRole('button', { name: 'Guardar lugar' }).click();
  await expect(page.getByRole('cell', { name: '📍 Bar Tablero' })).toBeVisible();
});

test('recommendations fit the number of players and the plan', async ({ page }) => {
  await page.getByRole('button', { name: 'Qué jugamos' }).click();
  await page.getByLabel('¿Cuántas personas?').fill('8');
  await page.getByLabel('Tipo de plan').selectOption('Fiesta');
  await page.getByRole('button', { name: 'Encontrar juegos' }).click();
  await expect(page.getByRole('heading', { name: 'Mis sugerencias para 8 personas' })).toBeVisible();
  const cards = page.locator('.reco .card');
  expect(await cards.count()).toBeGreaterThan(0);
  await expect(cards.first()).toContainText('Fiesta');
});

test('friends and groups work together', async ({ page }) => {
  await page.getByRole('button', { name: 'Comunidad' }).click();
  await page.getByRole('button', { name: 'Añadir amigo' }).click();
  await page.getByLabel('Nombre o apodo *').fill('Pepe');
  await page.getByRole('button', { name: 'Guardar amigo' }).click();
  await expect(page.locator('.groupcard', { hasText: 'Pepe' })).toBeVisible();

  await page.getByRole('button', { name: 'Añadir grupo' }).click();
  await page.getByLabel('Nombre del grupo *').fill('Los Balcánicos');
  await page.getByRole('dialog').getByText('Pepe').click();
  await page.getByRole('button', { name: 'Guardar grupo' }).click();
  const group = page.locator('.groupcard', { hasText: 'Los Balcánicos' });
  await expect(group.locator('.member')).toHaveText(['PPepe']);

  await page.locator('.groupcard', { hasText: 'En 1 grupos' }).getByRole('button', { name: 'Eliminar' }).click();
  await page.getByRole('dialog', { name: '¿Eliminar a Pepe?' }).getByRole('button', { name: 'Eliminar' }).click();
  await expect(group).toContainText('Sin amigos añadidos');
});

test('theme choice is applied and remembered', async ({ page }) => {
  await page.getByRole('button', { name: /Abrir opciones/ }).click();
  await page.getByRole('button', { name: 'Oscuro' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});

test('simple games have drawn covers and explain how to play', async ({ page }) => {
  await page.getByLabel('Buscar en la colección').fill('time');
  await expect(covers(page).locator('img.cover-art')).toHaveAttribute('src', '/covers/times-up.svg');
  await covers(page).first().click();
  await expect(page.getByRole('heading', { name: 'Cómo se juega' })).toBeVisible();
  await expect(page.getByText('Ronda 2: solo una palabra por carta.', { exact: false })).toBeVisible();
});

test('a game can be in several places at once', async ({ page }) => {
  await page.getByLabel('Buscar en la colección').fill('carcassonne');
  await covers(page).first().click();
  await page.getByRole('dialog').getByRole('button', { name: 'Editar' }).click();
  const places = page.getByRole('group', { name: 'Lugares donde está el juego' });
  await expect(places.getByRole('checkbox', { name: 'Casa Sergio' })).toBeChecked();
  await places.getByRole('checkbox', { name: 'Casa Lu' }).check();
  await page.getByRole('button', { name: 'Guardar juego' }).click();

  await covers(page).first().click();
  await expect(page.getByRole('dialog')).toContainText('📍 Casa Sergio · Casa Lu');
  await page.getByRole('dialog').getByRole('button', { name: 'Cerrar' }).click();
  await page.getByLabel('Buscar en la colección').fill('');
  await page.getByLabel('Filtrar lugar').selectOption('Casa Lu');
  await expect(covers(page).filter({ hasText: 'Carcassonne' })).toHaveCount(1);
});

test('the dice picks a random game that fits, without repeating', async ({ page }) => {
  await page.getByRole('navigation').getByRole('button', { name: /Qué jugamos/ }).click();
  await page.getByLabel('¿Dónde estáis?').selectOption('Casa Sergio');
  await page.getByRole('button', { name: '🎲 Tirar el dado' }).click();
  const first = await page.locator('.random-pick .cover-title').innerText();
  await page.getByRole('button', { name: '🎲 Otro' }).click();
  await expect(page.locator('.random-pick .cover-title')).not.toHaveText(first);
});
