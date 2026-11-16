import type { Game, Place } from './types';

// Starting collection for new accounts and local mode: name, players, styles, weight, minutes, place, notes.
const INITIAL_GAMES: [string, string, string, number, number, string, string][] = [
  ['Sussed? De todo un poco', '3–10', 'Fiesta,Conversación', 1, 20, 'home', 'Para conocerse y hablar.'],
  ['Trio', '3–6', 'Cartas,Deducción,Familiar', 2, 15, 'home', 'Memoria y deducción.'],
  ['Game Off', '2–?', 'Fiesta,Cartas,Humor', 1, 30, 'home', 'Confirmar máximo de jugadores.'],
  ['La era tramposa', '3–5', 'Cartas,Faroleo,Fiesta', 1, 25, 'home', "El título de la caja podría ser L'arna tramposa; confirmar nombre."],
  ['Get on Board: New York & London', '2–5', 'Estrategia,Familiar', 2, 30, 'home', 'Planificación de rutas.'],
  ['Munchkin', '3–6', 'Cartas,Humor,Competitivo', 2, 90, 'home', 'Aventuras, negociación y traiciones.'],
  ['La Isla Prohibida', '2–4', 'Cooperativo,Aventura', 2, 30, 'home', 'Colaborativo.'],
  ['Little Secret', '3–9', 'Roles ocultos,Palabras,Fiesta', 2, 20, 'home', 'Deducción social.'],
  ["Time's Up! (dos versiones)", '4–12', 'Fiesta,Equipos,Humor', 1, 40, 'home', 'Tienes dos versiones; se cuenta como un solo juego.'],
  ['Splendor Duel', '2', 'Dos jugadores,Estrategia', 3, 30, 'home', 'Diseñado específicamente para dos.'],
  ['La Tripulación', '2–5', 'Cooperativo,Cartas', 3, 20, 'home', 'Comunicación limitada.'],
  ['Boomerang: Europa', '2–4', 'Cartas,Estrategia', 2, 30, 'home', 'Draft y colecciones.'],
  ['Spoilers', '4–10', 'Fiesta,Cultura pop', 1, 30, 'home', ''],
  ['¿Alguien ha probado este juego? (2 cajas)', '3–10', 'Fiesta,Humor', 1, 20, 'home', 'Dos cajas/ediciones visibles; confirmar si son distintas.'],
  ['Telón de acero', '2', 'Dos jugadores,Estrategia', 4, 30, 'home', ''],
  ['La Vacuna Española', '3–8', 'Fiesta,Humor', 1, 20, 'home', ''],
  ['Misión Secreta', '3–?', 'Fiesta,Roles ocultos', 1, 20, 'home', 'Datos de jugadores por confirmar.'],
  ['Mimika', '4–?', 'Fiesta,Equipos,Humor', 1, 30, 'home', 'Mímica.'],
  ['Codex', '?', 'Estrategia', 3, 60, 'home', 'Edición y número de jugadores por confirmar.'],
  ['The Impostor King', '?', 'Roles ocultos,Fiesta', 2, 30, 'home', 'Datos por confirmar.'],
  ['El Cubilete', '?', 'Dados,Fiesta', 1, 20, 'home', 'Versión exacta por confirmar.'],
  ['Juego de beber sin nombre', '?', 'Fiesta,Bebidas', 1, 30, 'home', 'Nombre y reglas por identificar.'],
  ['Carcassonne', '2–5', 'Familiar,Estrategia', 2, 40, 'home', ''],
  ['Reinos de Papel', '2–5', 'Cartas,Estrategia', 3, 30, 'home', ''],
  ['Código Secreto Dúo', '2', 'Dos jugadores,Cooperativo,Palabras', 2, 15, 'home', ''],
  ['Agricola', '1–4', 'Estrategia', 5, 120, 'home', 'Gestión de recursos y colocación de trabajadores.'],
  ['Puerto Rico', '2–5', 'Estrategia', 4, 120, 'home', 'Gestión de recursos.'],
  ['Red Outpost', '2–4', 'Estrategia', 3, 60, 'home', ''],
  ['Magic Maze', '1–8', 'Cooperativo,Tiempo real', 2, 15, 'home', 'Comunicación limitada y caos divertido.'],
  ['Diplomacy', '2–7', 'Estrategia,Negociación', 5, 360, 'home', 'Alianzas y traiciones; partida larga.'],
  ['Scram!', '3–8', 'Fiesta,Humor', 1, 30, 'home', ''],
  ['Throw Throw Burrito', '2–6', 'Fiesta,Reflejos', 1, 15, 'home', ''],
  ['La Batalla por Rokugan', '2–5', 'Estrategia,Conflicto', 4, 90, 'home', 'Control de territorios.'],
  ['Chao Pescao', '?', 'Fiesta,Cartas', 1, 20, 'home', 'Datos por confirmar.'],
  ['Orquesta Negra: Hitler debe morir', '1–5', 'Cooperativo,Histórico', 3, 90, 'home', ''],
  ['Dominion (juego base)', '2–4', 'Estrategia,Cartas', 3, 30, 'home', 'Juego base; tienes la expansión Terramar.'],
  ['Dominion: Terramar', '2–4', 'Estrategia,Cartas', 3, 30, 'home', 'Expansión de Dominion; registrar junto al juego base.'],
  ['Dungeons & Dragons: La aventura fantástica', '2–4', 'Aventura,Familiar', 2, 60, 'home', ''],
  ['Scythe', '1–5', 'Estrategia', 5, 120, 'home', 'Tienes la expansión El auge de Fenris.'],
  ['Scythe: El auge de Fenris', '1–5', 'Estrategia,Campaña', 5, 120, 'home', 'Expansión de Scythe.'],
  ['Brink', '2–5', 'Estrategia', 3, 30, 'home', 'Mecánicas por confirmar.'],
  ['Los Castillos de Borgoña', '2–4', 'Estrategia,Dados', 4, 90, 'away', 'Está en casa de tu hermana; hay que recogerlo.'],
];

export const INITIAL_PLACES: Place[] = [
  { id: 'place-sergio', name: 'Casa Sergio' },
  { id: 'place-enzo', name: 'Casa Enzo' },
  { id: 'place-alberto', name: 'Casa Alberto' },
  { id: 'place-daypo', name: 'Casa Daypo' },
  { id: 'place-lu', name: 'Casa Lu' },
];

/** Old saves used "home"/"away" instead of a place name. */
/** A game as saved: older saves have a single `location` instead of `locations`. */
export type StoredGame = Omit<Game, 'locations'> & { locations?: string[]; location?: string };

/** The first versions saved place codes instead of names. */
const placeName = (name: string): string => (name === 'home' ? 'Casa Sergio' : name === 'away' ? '' : name.trim());

/** Brings a saved game to the current shape: a list of places, without repeats or blanks. */
export function normalizeGamePlace(game: StoredGame): Game {
  const { location, locations, ...rest } = game;
  const names = Array.isArray(locations) ? locations : location ? [location] : [];
  return { ...rest, locations: [...new Set(names.map(placeName).filter(Boolean))] };
}

/** True when the saved game had the old shape, so the collection should be saved again. */
export const needsPlaceMigration = (stored: StoredGame, game: Game): boolean =>
  'location' in stored || JSON.stringify(stored.locations) !== JSON.stringify(game.locations);

export const seedGames = (): Game[] =>
  INITIAL_GAMES.map(([name, players, types, weight, duration, location, notes], index) =>
    normalizeGamePlace({ id: 'seed' + index, name, players, types: types.split(','), weight, duration, location, notes }));

/**
 * The starting places for a collection that has none yet. Once there are places they are
 * left alone: a default one that was deleted must not come back.
 */
export const withDefaultPlaces = (places: Place[]): Place[] =>
  places.length ? [...places] : INITIAL_PLACES.map(place => ({ ...place }));
