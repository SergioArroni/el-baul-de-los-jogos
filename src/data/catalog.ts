// The BGG-based catalog, through our server (api/catalog.ts): suggestions while typing a
// game's name and a ready-to-use draft when one is picked.
import type { CatalogHit, GameDraft } from '../../catalog/bgg';
import { apiUrl } from '../platform/native';
import { accessToken } from './client';

export type { CatalogHit, GameDraft };

async function ask<T>(query: string): Promise<T | null> {
  const response = await fetch(apiUrl('/api/catalog?' + query), { headers: { Authorization: 'Bearer ' + (await accessToken()) } }).catch(() => null);
  return response?.ok ? ((await response.json()) as T) : null;
}

/** Games whose name contains the text; [] when the catalog isn't available. */
export const searchCatalog = async (text: string): Promise<CatalogHit[]> =>
  (await ask<{ hits: CatalogHit[] }>('q=' + encodeURIComponent(text)))?.hits ?? [];

export const catalogDraft = async (bggId: number): Promise<GameDraft | null> =>
  (await ask<{ game: GameDraft }>('id=' + bggId))?.game ?? null;
