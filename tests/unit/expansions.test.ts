import { describe, expect, it } from 'vitest';
import { EXPANSIONS } from '../../src/content/expansions';
import { addExpansion, expansionNamed, expansionsOf, mergeCandidates, mergeInto, ownedExpansions, toggleExpansion } from '../../src/domain/expansions';
import type { Game } from '../../src/domain/types';
import { formatGame } from '../../mcp/server';
import { existsSync } from 'node:fs';

const game = (name: string, extra: Partial<Game> = {}): Game => ({ id: name, name, players: '1–5', types: [], weight: null, duration: null, locations: [], notes: '', ...extra });

describe('a game and its expansions', () => {
  it('lists the known expansions, in colour only the ones you own', () => {
    const scythe = game('Scythe', { expansions: ['The Rise of Fenris'] });
    const views = expansionsOf(scythe);
    expect(views.map(view => view.name)).toEqual(['Invasores de tierras lejanas', 'El auge de Fenris', 'The Wind Gambit', 'Encuentros']);
    expect(views.filter(view => view.owned).map(view => view.name)).toEqual(['El auge de Fenris']);
    expect(ownedExpansions(scythe)).toBe(1);
  });

  it('keeps expansions added by hand after the known ones', () => {
    const scythe = addExpansion(game('Scythe'), '  Mapa modular  ')!;
    expect(expansionsOf(scythe).at(-1)).toEqual({ name: 'Mapa modular', owned: true });
    expect(addExpansion(scythe, 'mapa MODULAR')).toBeNull();
    expect(addExpansion(scythe, '   ')).toBeNull();
    // Typing a known one by its other name marks the known one.
    expect(expansionsOf(addExpansion(scythe, 'Encounters')!).find(view => view.name === 'Encuentros')?.owned).toBe(true);
  });

  it('toggles owning an expansion', () => {
    const once = toggleExpansion(game('Dominion'), 'Intriga');
    expect(once.expansions).toEqual(['Intriga']);
    expect(toggleExpansion(once, 'intriga').expansions).toEqual([]);
  });

  it('a game without known expansions has none until you add one', () => {
    expect(expansionsOf(game('Hanabi'))).toEqual([]);
  });
});

describe('recognising expansions saved as games of their own', () => {
  it('by library name, "base: expansion", "base - expansion" or just its name', () => {
    expect(expansionNamed('Scythe: El auge de Fenris')?.slug).toBe('scythe-fenris');
    expect(expansionNamed('Dominion: Terramar')?.slug).toBe('dominion-terramar');
    expect(expansionNamed('Carcassonne - La princesa y el dragón')?.slug).toBe('carcassonne-princesa');
    expect(expansionNamed('Cities of Splendor')?.slug).toBe('cities-of-splendor');
    expect(expansionNamed('Munchkin 2: Hacha descomunal')?.slug).toBe('munchkin-2');
    expect(expansionNamed('Scythe')).toBeUndefined();
    expect(expansionNamed('Trivial Pursuit - Señor de los Anillos')).toBeUndefined();
  });

  it('offers to move them only when their base game is in the collection', () => {
    const games = [game('Dominion (juego base)'), game('Dominion: Terramar'), game('Scythe: El auge de Fenris')];
    const offers = mergeCandidates(games);
    expect(offers.map(o => [o.expansion.name, o.base.name, o.name])).toEqual([['Dominion: Terramar', 'Dominion (juego base)', 'Terramar']]);
  });

  it('moving one keeps it inside the base game, wherever its copy was', () => {
    const base = game('Scythe', { locations: ['Casa Sergio'] });
    const merged = mergeInto(base, game('Scythe: El auge de Fenris', { locations: ['Casa Lu'] }), 'El auge de Fenris');
    expect(merged.expansions).toEqual(['El auge de Fenris']);
    expect(merged.locations).toEqual(['Casa Sergio', 'Casa Lu']);
    expect(mergeInto(merged, game('x'), 'El auge de Fenris').expansions).toEqual(['El auge de Fenris']);
  });
});

describe('expansions everywhere else', () => {
  it('every listed expansion has its cover drawn', () => {
    for (const entry of EXPANSIONS) expect(existsSync(`public/covers/${entry.slug}.svg`), entry.slug).toBe(true);
  });

  it('Claude and ChatGPT are told which expansions you own', () => {
    expect(formatGame(game('Scythe', { expansions: ['El auge de Fenris'] }))).toContain('con las expansiones El auge de Fenris');
  });
});
