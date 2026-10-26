// Expansions live inside their base game: which ones a game has, which you own, and
// recognising expansions that were saved as a game of their own so they can move in.
import { EXPANSIONS, type ExpansionEntry } from '../content/expansions';
import { findInLibrary, libraryKey } from '../content/library';
import type { Game } from './types';

export interface ExpansionView {
  name: string;
  /** Drawn cover in public/covers/; missing for expansions added by hand. */
  slug?: string;
  owned: boolean;
}

const MAX_NAME = 60;
const baseSlug = (gameName: string) => findInLibrary(gameName)?.slug;
const sameName = (a: string, b: string) => libraryKey(a) === libraryKey(b);

export const coverOf = (slug: string): string => `/covers/${slug}.svg`;

/** The known expansions of a game (in the list's order) and then any added by hand. */
export function expansionsOf(game: Pick<Game, 'name' | 'expansions'>): ExpansionView[] {
  const owned = game.expansions ?? [];
  const base = baseSlug(game.name);
  const known = base ? EXPANSIONS.filter(entry => entry.base === base) : [];
  const isKnown = (name: string) => known.some(entry => entry.names.some(other => sameName(other, name)));
  return [
    ...known.map(entry => ({ name: entry.names[0], slug: entry.slug, owned: owned.some(name => entry.names.some(other => sameName(other, name))) })),
    ...owned.filter(name => !isKnown(name)).map(name => ({ name, owned: true })),
  ];
}

export const ownedExpansions = (game: Pick<Game, 'name' | 'expansions'>): number => expansionsOf(game).filter(view => view.owned).length;

/** Owns it or not: returns the game with that expansion added or taken out. */
export function toggleExpansion(game: Game, name: string): Game {
  const owned = game.expansions ?? [];
  const has = owned.some(other => sameName(other, name));
  return { ...game, expansions: has ? owned.filter(other => !sameName(other, name)) : [...owned, name] };
}

/** An expansion that isn't in our list, typed by hand. Null when the name is empty or already there. */
export function addExpansion(game: Game, typed: string): Game | null {
  const name = typed.trim().slice(0, MAX_NAME);
  if (!name || expansionsOf(game).some(view => view.owned && sameName(view.name, name))) return null;
  const known = expansionsOf(game).find(view => sameName(view.name, name));
  return { ...game, expansions: [...(game.expansions ?? []), known?.name ?? name] };
}

/**
 * The expansion a full game name refers to, however it was written: its own library name
 * ("Scythe: El auge de Fenris"), "base: expansion" or "base - expansion", or just its name.
 */
export function expansionNamed(gameName: string): ExpansionEntry | undefined {
  const slug = baseSlug(gameName);
  const byLibrary = slug && EXPANSIONS.find(entry => entry.slug === slug);
  if (byLibrary) return byLibrary;
  const parts = gameName.split(/\s*:\s*|\s+[–-]\s+/);
  if (parts.length > 1) {
    const base = baseSlug(parts[0]);
    const rest = parts.slice(1).join(' ');
    const found = base && EXPANSIONS.find(entry => entry.base === base && entry.names.some(name => sameName(name, rest)));
    if (found) return found;
  }
  return EXPANSIONS.find(entry => entry.names.some(name => sameName(name, gameName)));
}

export interface MergeCandidate {
  /** The expansion, saved today as a game of its own. */
  expansion: Game;
  base: Game;
  /** The name it will have inside the base game. */
  name: string;
}

/** Expansions in the collection as separate games whose base game is also there. */
export function mergeCandidates(games: Game[]): MergeCandidate[] {
  return games.flatMap(game => {
    const entry = expansionNamed(game.name);
    const base = entry && games.find(other => other.id !== game.id && baseSlug(other.name) === entry.base);
    return entry && base ? [{ expansion: game, base, name: entry.names[0] }] : [];
  });
}

/** The base game with the expansion inside (and wherever the expansion's copy was). */
export function mergeInto(base: Game, expansion: Game, name: string): Game {
  const owned = base.expansions ?? [];
  return {
    ...base,
    expansions: owned.some(other => sameName(other, name)) ? owned : [...owned, name],
    locations: [...new Set([...base.locations, ...expansion.locations])],
  };
}
