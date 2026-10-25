import { expect, test } from '@playwright/test';
// @ts-expect-error plain JS helper shared with the Node scripts
import { resetData, sql } from '../stack/stack.mjs';
import { go, openAs, users } from './helpers';

// A, B, C and D rate Hanabi and Monopoly alike; B, C and D also love Spirit Island,
// which A doesn't have. The server should suggest it to A without saying who rated it.
test.beforeAll(() => {
  resetData();
  let n = 0;
  const rows: string[] = [];
  const rate = (who: 'a' | 'b' | 'c' | 'd', game: string, rating: number) => {
    const id = `55555555-0000-0000-0000-${String(++n).padStart(12, '0')}`;
    rows.push(`insert into public.plays(id, owner_id, game_name) values ('${id}', '${users[who].id}', '${game}');
      insert into public.play_players(play_id, name, user_id, rating) values ('${id}', '${who}', '${users[who].id}', ${rating});`);
  };
  for (const who of ['a', 'b', 'c', 'd'] as const) {
    rate(who, 'Hanabi', 9);
    rate(who, 'Monopoly', 2);
  }
  for (const who of ['b', 'c', 'd'] as const) rate(who, 'Spirit Island', 9);
  sql(rows.join('\n'), { admin: true });
});

test('people with your taste suggest a game you do not have yet', async ({ browser }) => {
  const page = await openAs(browser, 'a');
  await go(page, 'Qué jugamos');
  await page.getByRole('button', { name: 'Encontrar juegos' }).click();
  const outside = page.locator('.outside');
  await expect(outside.getByRole('heading', { name: 'Fuera de tu baúl' })).toBeVisible();
  await expect(outside).toContainText('Spirit Island');
  await expect(outside).toContainText('3 personas parecidas');
  await expect(outside).not.toContainText('usuario_');
});
