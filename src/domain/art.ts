import type { IconName } from '../components/icons';
import type { Game } from './types';

// Box-art look per game: the first matching style picks the icon and gradient,
// and the name picks one of four background patterns, so covers stay stable.
export const TYPE_ART: [type: string, icon: IconName, from: string, to: string][] = [
  ['Roles ocultos', 'mask', '#2d2b55', '#6a45a8'],
  ['Cooperativo', 'rings', '#147a70', '#34b89a'],
  ['Dos jugadores', 'swords', '#6b3192', '#bf55aa'],
  ['Fiesta', 'party', '#d9465f', '#f19a48'],
  ['Estrategia', 'pawn', '#2f4396', '#6a60d4'],
  ['Aventura', 'map', '#9c5a1b', '#dc9f36'],
  ['Cartas', 'cards', '#a32c3c', '#df6156'],
  ['Deducción', 'search', '#234c76', '#4a8dc2'],
  ['Palabras', 'letters', '#0f6875', '#2eaebd'],
  ['Familiar', 'house', '#357f42', '#86bb4c'],
  ['Humor', 'laugh', '#bf7710', '#ecbc38'],
  ['Dados', 'dice', '#853626', '#d6704b'],
];

export interface GameArt {
  icon: IconName;
  from: string;
  to: string;
  pattern: 0 | 1 | 2 | 3;
}

export function gameArt(game: Pick<Game, 'name' | 'types'>): GameArt {
  const match = TYPE_ART.find(([type]) => (game.types ?? []).includes(type));
  let hash = 0;
  for (const char of game.name ?? '') hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return {
    icon: match?.[1] ?? 'dice',
    from: match?.[2] ?? '#3d5a50',
    to: match?.[3] ?? '#78998a',
    pattern: (hash % 4) as GameArt['pattern'],
  };
}

export const typeIcon = (type: string): IconName | undefined => TYPE_ART.find(([name]) => name === type)?.[1];
