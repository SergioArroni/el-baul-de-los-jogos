import { normalizeGamePlace, seedGames, withDefaultPlaces } from '../domain/seed';
import type { Friend, Game, Group, Place } from '../domain/types';

// Browser copy of the collection: used in local mode and as an offline cache.
const KEYS = { games: 'ludoteca_games', groups: 'ludoteca_groups', friends: 'ludoteca_friends', places: 'ludoteca_places' };

export interface Collection {
  games: Game[];
  groups: Group[];
  friends: Friend[];
  places: Place[];
}

function read<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null') as T | null;
  } catch {
    return null;
  }
}

export function loadLocal(): Collection {
  const games = read<Game[]>(KEYS.games);
  return {
    games: (Array.isArray(games) ? games : seedGames()).map(normalizeGamePlace),
    groups: read<Group[]>(KEYS.groups) ?? [],
    friends: read<Friend[]>(KEYS.friends) ?? [],
    places: withDefaultPlaces(read<Place[]>(KEYS.places) ?? []),
  };
}

export function saveLocal(collection: Collection): void {
  try {
    localStorage.setItem(KEYS.games, JSON.stringify(collection.games));
    localStorage.setItem(KEYS.groups, JSON.stringify(collection.groups));
    localStorage.setItem(KEYS.friends, JSON.stringify(collection.friends));
    localStorage.setItem(KEYS.places, JSON.stringify(collection.places));
  } catch (error) {
    console.warn('No se pudo guardar la copia local:', error);
  }
}

/** Forgets this browser's copy of the collection and profile (after deleting the account). */
export function clearLocal(): void {
  try {
    for (const key of [...Object.values(KEYS), 'ludoteca_nickname', 'ludoteca_avatar']) localStorage.removeItem(key);
  } catch {
    /* storage blocked: nothing to forget */
  }
}

export const localSetting = {
  get: (key: string): string => {
    try {
      return localStorage.getItem(key) ?? '';
    } catch {
      return '';
    }
  },
  set: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* private mode: the setting just won't persist */
    }
  },
};
