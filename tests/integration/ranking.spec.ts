import { expect, test } from '@playwright/test';
// @ts-expect-error plain JS helper shared with the Node scripts
import { resetData, sql } from '../stack/stack.mjs';
import { go, openAs, users } from './helpers';

test.beforeAll(() => {
  resetData();
  const play = (id: string, game: string) => `('${id}', '${users.a.id}', '${game}')`;
  sql(`
    insert into public.plays(id, owner_id, game_name) values
      ${play('44444444-0000-0000-0000-000000000001', 'Azul')}, ${play('44444444-0000-0000-0000-000000000002', 'Catan')};
    insert into public.play_players(play_id, name, user_id, rating) values
      ('44444444-0000-0000-0000-000000000001', 'a', '${users.a.id}', 9), ('44444444-0000-0000-0000-000000000001', 'b', '${users.b.id}', 8),
      ('44444444-0000-0000-0000-000000000001', 'c', '${users.c.id}', 10),
      ('44444444-0000-0000-0000-000000000002', 'a', '${users.a.id}', 7), ('44444444-0000-0000-0000-000000000002', 'b', '${users.b.id}', 6);`, { admin: true });
});

test('my ratings rank my games, and the global ranking only shows games rated by 3 people', async ({ browser }) => {
  const page = await openAs(browser, 'a');
  await go(page, 'Ranking');
  const rows = page.locator('.ranking-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText('Azul');

  await page.getByRole('button', { name: 'Global' }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows.first()).toContainText('Azul');
  await expect(rows.first()).toContainText('3 notas · 3 personas');
});
