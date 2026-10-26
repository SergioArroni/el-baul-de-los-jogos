import type { IconName } from '../components/icons';
import { maxPlayers, supports } from './players';
import { averageRating, type GameStat } from './stats';
import { nameKey } from './text';
import type { Game } from './types';

export interface CatalogFilters {
  search: string;
  type: string;
  players: number;
  place: string;
}

export const noFilters = (filters: CatalogFilters): boolean =>
  !filters.search.trim() && !filters.type && !filters.players && !filters.place;

export const byName = (a: Game, b: Game): number => a.name.localeCompare(b.name, 'es');

export function filterGames(games: Game[], filters: CatalogFilters): Game[] {
  const search = filters.search.trim().toLowerCase();
  return games
    .filter(game =>
      (game.name + ' ' + game.types.join(' ') + ' ' + game.notes).toLowerCase().includes(search) &&
      (!filters.type || game.types.includes(filters.type)) &&
      supports(game, filters.players) &&
      (!filters.place || game.locations.includes(filters.place)))
    .sort(byName);
}

/** Most common styles first, so the chips show what the collection actually has. */
export function topTypes(games: Game[], limit = 12): string[] {
  const counts = new Map<string, number>();
  for (const game of games) for (const type of game.types) counts.set(type, (counts.get(type) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([type]) => type);
}

export interface Shelf {
  title: string;
  icon: IconName;
  games: Game[];
}

/** Themed rows for the catalog; shelves with fewer than two games are skipped. */
export function buildShelves(games: Game[], stats: Map<string, GameStat>, hasPlays: boolean): Shelf[] {
  const avg = (game: Game) => averageRating(stats.get(nameKey(game.name))) ?? 0;
  const shelves: Shelf[] = [
    { title: 'Vuestros favoritos', icon: 'star', games: games.filter(g => avg(g) >= 7).sort((a, b) => avg(b) - avg(a)) },
    { title: 'Para una partida rápida', icon: 'bolt', games: games.filter(g => g.duration && g.duration <= 30).sort((a, b) => (a.duration ?? 0) - (b.duration ?? 0)) },
    { title: 'Para cuando sois muchos', icon: 'players', games: games.filter(g => maxPlayers(g) >= 6).sort((a, b) => maxPlayers(b) - maxPlayers(a)) },
    { title: 'Para pensar a fondo', icon: 'pawn', games: games.filter(g => (g.weight ?? 0) >= 4).sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)) },
  ];
  if (hasPlays) shelves.push({ title: 'Sin estrenar', icon: 'box', games: games.filter(g => !stats.has(nameKey(g.name))).sort(byName) });
  return shelves.filter(shelf => shelf.games.length > 1);
}
