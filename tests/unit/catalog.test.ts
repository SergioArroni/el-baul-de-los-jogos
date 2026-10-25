import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalogGame, parseSearch, parseThing, searchCatalog, toGameDraft, type CatalogCache, type CatalogGame } from '../../catalog/bgg';

const fixture = (name: string) => readFileSync(new URL(`../fixtures/${name}`, import.meta.url), 'utf8');
const catan = () => parseThing(fixture('bgg-thing.xml'))[0];

/** An in-memory cache and a fake BGG that answers with the fixtures and counts calls. */
function setup({ token = 'test', status = 200 } = {}) {
  const stored = new Map<number, CatalogGame>();
  const calls: string[] = [];
  const cache: CatalogCache = {
    search: async query => [...stored.values()].filter(game => [game.name, ...game.altNames].some(name => name.toLowerCase().includes(query.toLowerCase()))),
    get: async id => stored.get(id) ?? null,
    save: async games => games.forEach(game => stored.set(game.bggId, game)),
  };
  const fakeFetch = (async (url: string) => {
    calls.push(url);
    return new Response(fixture(url.includes('/search') ? 'bgg-search.xml' : 'bgg-thing.xml'), { status });
  }) as unknown as typeof fetch;
  return { deps: { fetch: fakeFetch, token, cache }, stored, calls };
}

describe('BGG catalog', () => {
  it('reads search results, using the alternate name when there is no primary one', () => {
    expect(parseSearch(fixture('bgg-search.xml'))).toEqual([
      { bggId: 13, name: 'CATAN', year: 1995 },
      { bggId: 27710, name: 'Catan Dice Game', year: 2007 },
      { bggId: 999, name: 'Los Colonos de Catán', year: null },
    ]);
  });

  it('reads a game, as BGG gives it', () => {
    expect(catan()).toEqual({
      bggId: 13, name: 'CATAN', year: 1995, altNames: ['Catán', 'Los Colonos de Catán'], minPlayers: 3, maxPlayers: 4, minutes: 120,
      weight: 2.29, categories: ['Economic', 'Negotiation'], mechanics: ['Dice Rolling', 'Trading'],
      image: 'https://cf.geekdo-images.com/catan.jpg', thumbnail: 'https://cf.geekdo-images.com/catan-thumb.jpg',
    });
  });

  it('turns it into a draft for the game form', () => {
    expect(toGameDraft(catan())).toEqual({ bggId: 13, name: 'CATAN', players: '3–4', duration: 120, weight: 2, types: ['Estrategia', 'Negociación'] });
    expect(toGameDraft({ ...catan(), minPlayers: 2, maxPlayers: 2 }).types[0]).toBe('Dos jugadores');
  });

  it('asks BGG once per game and then answers from the cache', async () => {
    const { deps, calls } = setup();
    expect((await catalogGame(13, deps))?.name).toBe('CATAN');
    expect((await catalogGame(13, deps))?.name).toBe('CATAN');
    expect(calls.filter(url => url.includes('/thing'))).toHaveLength(1);
    expect(calls[0]).toBe('https://boardgamegeek.com/xmlapi2/thing?stats=1&id=13');
    expect(await searchCatalog('colonos', { ...deps, token: undefined })).toEqual([expect.objectContaining({ bggId: 13 })]);
  });

  it('without a token, or when BGG is busy, only uses what is cached', async () => {
    const offline = setup({ token: '' });
    expect(await searchCatalog('catan', offline.deps)).toEqual([]);
    expect(offline.calls).toEqual([]);
    const busy = setup({ status: 202 });
    expect(await catalogGame(13, busy.deps)).toBeNull();
    expect(await searchCatalog('catan', busy.deps)).toEqual([]);
  });

  it('searches BGG and merges it with the cache without repeats', async () => {
    const { deps } = setup();
    await catalogGame(13, deps);
    const hits = await searchCatalog('catan', deps);
    expect(hits.map(hit => hit.bggId)).toEqual([13, 27710, 999]);
    expect(await searchCatalog('ca', deps)).toEqual([]);
  });
});
