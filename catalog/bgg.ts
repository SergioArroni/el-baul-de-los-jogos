// BoardGameGeek catalog: search and game details from BGG's XML API v2, kept in our own
// table so each game is asked for once. Server-side only: the BGG token never reaches the
// browser. BGG's terms: non-commercial use, credit "Powered by BGG", don't alter its data
// (we store it as it comes; the mapping to our styles is only a suggestion for the form).
import { XMLParser } from 'fast-xml-parser';

export interface CatalogHit {
  bggId: number;
  name: string;
  year: number | null;
}

export interface CatalogGame extends CatalogHit {
  /** Other names on BGG, such as the Spanish edition's. */
  altNames: string[];
  minPlayers: number | null;
  maxPlayers: number | null;
  minutes: number | null;
  /** BGG's average weight, 1–5. */
  weight: number | null;
  categories: string[];
  mechanics: string[];
  image: string | null;
  thumbnail: string | null;
}

/** What the "Añadir juego" form needs, in the app's own format. */
export interface GameDraft {
  bggId: number;
  name: string;
  players: string;
  duration: number | null;
  weight: number | null;
  types: string[];
}

interface XmlValue { value?: string; type?: string; id?: string }
interface XmlItem {
  id?: string;
  name?: XmlValue[];
  yearpublished?: XmlValue;
  minplayers?: XmlValue;
  maxplayers?: XmlValue;
  playingtime?: XmlValue;
  link?: XmlValue[];
  image?: string;
  thumbnail?: string;
  statistics?: { ratings?: { averageweight?: XmlValue } };
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  isArray: name => ['item', 'name', 'link'].includes(name),
});
const positive = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
};
const items = (xml: string): XmlItem[] => parser.parse(xml)?.items?.item ?? [];
const primaryName = (item: XmlItem) => (item.name ?? []).find(name => name.type === 'primary')?.value ?? item.name?.[0]?.value ?? '';

/** BGG search results (`/xmlapi2/search`). */
export function parseSearch(xml: string): CatalogHit[] {
  return items(xml)
    .map(item => ({ bggId: Number(item.id), name: primaryName(item), year: positive(item.yearpublished?.value) }))
    .filter(hit => hit.bggId > 0 && hit.name);
}

/** BGG game details (`/xmlapi2/thing?stats=1`). */
export function parseThing(xml: string): CatalogGame[] {
  return items(xml).map(item => {
    const links = (type: string) => (item.link ?? []).filter(link => link.type === type).map(link => link.value ?? '').filter(Boolean);
    return {
      bggId: Number(item.id),
      name: primaryName(item),
      altNames: (item.name ?? []).filter(name => name.type === 'alternate').map(name => name.value ?? '').filter(Boolean),
      year: positive(item.yearpublished?.value),
      minPlayers: positive(item.minplayers?.value),
      maxPlayers: positive(item.maxplayers?.value),
      minutes: positive(item.playingtime?.value),
      weight: positive(item.statistics?.ratings?.averageweight?.value),
      categories: links('boardgamecategory'),
      mechanics: links('boardgamemechanic'),
      image: item.image?.trim() || null,
      thumbnail: item.thumbnail?.trim() || null,
    };
  }).filter(game => game.bggId > 0 && game.name);
}

/** BGG categories and mechanics that match the app's own styles. */
const STYLES: Record<string, string> = {
  'Party Game': 'Fiesta', 'Card Game': 'Cartas', 'Deduction': 'Deducción', 'Dice': 'Dados', 'Bluffing': 'Faroleo',
  'Word Game': 'Palabras', 'Trivia': 'Preguntas', 'Adventure': 'Aventura', 'Exploration': 'Aventura', 'Fantasy': 'Aventura',
  "Children's Game": 'Familiar', 'Economic': 'Estrategia', 'Territory Building': 'Estrategia', 'Wargame': 'Estrategia',
  'Abstract Strategy': 'Abstracto', 'Humor': 'Humor', 'Real-time': 'Tiempo real', 'Negotiation': 'Negociación',
  'Cooperative Game': 'Cooperativo', 'Hidden Roles': 'Roles ocultos', 'Team-Based Game': 'Equipos',
  'Legacy Game': 'Campaña', 'Scenario / Mission / Campaign Game': 'Campaña', 'Deck, Bag, and Pool Building': 'Cartas',
  'Worker Placement': 'Estrategia', 'Dexterity': 'Habilidad',
};

export function toGameDraft(game: CatalogGame): GameDraft {
  const { minPlayers: min, maxPlayers: max } = game;
  const players = min && max ? (min === max ? String(min) : `${min}–${max}`) : min ? `${min}+` : '';
  const types = [...new Set([...game.mechanics, ...game.categories].map(tag => STYLES[tag]).filter(Boolean))].slice(0, 4);
  if (players === '2') types.unshift('Dos jugadores');
  return {
    bggId: game.bggId,
    name: game.name,
    players,
    duration: game.minutes,
    weight: game.weight ? Math.min(5, Math.max(1, Math.round(game.weight))) : null,
    types: [...new Set(types)],
  };
}

/** Where games already looked up are kept (a Supabase table in production). */
export interface CatalogCache {
  search(query: string): Promise<CatalogHit[]>;
  get(bggId: number): Promise<CatalogGame | null>;
  save(games: CatalogGame[]): Promise<void>;
}

export interface CatalogDeps {
  fetch: typeof fetch;
  /** BGG application token; without it, only what is already cached is available. */
  token?: string;
  cache: CatalogCache;
}

const BGG = 'https://boardgamegeek.com/xmlapi2';
const ask = (deps: CatalogDeps, path: string) => deps.fetch(BGG + path, { headers: { Authorization: `Bearer ${deps.token}` } });

/** Games whose name matches: what we already have, plus BGG's answer when there's a token. */
export async function searchCatalog(query: string, deps: CatalogDeps): Promise<CatalogHit[]> {
  const text = query.trim();
  if (text.length < 3) return [];
  const cached = await deps.cache.search(text);
  if (cached.length >= 8 || !deps.token) return cached.slice(0, 10);
  const response = await ask(deps, `/search?type=boardgame&query=${encodeURIComponent(text)}`).catch(() => null);
  // BGG busy, rate-limited or not authorised: answer with what we have.
  if (!response || response.status !== 200) return cached.slice(0, 10);
  const found = parseSearch(await response.text());
  const seen = new Set(cached.map(hit => hit.bggId));
  return [...cached, ...found.filter(hit => !seen.has(hit.bggId))].slice(0, 10);
}

/** One game's details: from our table, or from BGG (then kept for next time). */
export async function catalogGame(bggId: number, deps: CatalogDeps): Promise<CatalogGame | null> {
  const cached = await deps.cache.get(bggId);
  if (cached || !deps.token) return cached;
  const response = await ask(deps, `/thing?stats=1&id=${bggId}`).catch(() => null);
  // 202 means BGG queued the request: treat it as "not now".
  if (!response || response.status !== 200) return null;
  const [game] = parseThing(await response.text());
  if (!game) return null;
  await deps.cache.save([game]);
  return game;
}
