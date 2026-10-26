import { EXPANSIONS } from '../../src/content/expansions';
import { existsSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LIBRARY, coverUrl, findInLibrary, libraryKey } from '../../src/content/library';
import { seedGames } from '../../src/domain/seed';

describe('game library', () => {
  it('has a drawn cover for every entry', () => {
    for (const entry of LIBRARY) expect(existsSync(`public${coverUrl(entry)}`), entry.slug).toBe(true);
  });

  it('never gives two games the same name', () => {
    const keys = LIBRARY.flatMap(entry => [...new Set(entry.names.map(libraryKey))]);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(LIBRARY.map(entry => entry.slug)).size).toBe(LIBRARY.length);
  });

  it('matches catalog names despite accents, case and notes in parentheses', () => {
    expect(findInLibrary("Time's Up! (dos versiones)")?.slug).toBe('times-up');
    expect(findInLibrary('¿Alguien ha probado este juego? (2 cajas)')?.slug).toBe('alguien-ha-probado');
    expect(findInLibrary('la ERA tramposa')?.slug).toBe('la-polilla-tramposa');
    expect(findInLibrary('Mision secreta')?.slug).toBe('mision-secreta');
    expect(findInLibrary('Catan')).toBeUndefined();
  });

  it('covers every game of the starting collection', () => {
    const missing = seedGames().filter(game => !findInLibrary(game.name)).map(game => game.name);
    expect(missing).toEqual([]);
  });

  it('has no cover without a game or an expansion', () => {
    const slugs = new Set([...LIBRARY, ...EXPANSIONS].map(entry => entry.slug));
    const orphans = readdirSync('public/covers').map(file => file.replace(/\.svg$/, '')).filter(slug => !slugs.has(slug));
    expect(orphans).toEqual([]);
  });

  it('lists the games from the simplest to the most complex', () => {
    const weights = LIBRARY.map(entry => seedGames().find(game => findInLibrary(game.name) === entry)?.weight).filter(weight => weight != null);
    expect(weights).toEqual([...weights].sort((a, b) => a - b));
  });
});
