// Jogiño's paint: a wooden meeple, natural by default or painted like the ones in a game box.
// Each colour is a gradient (light top, darker bottom) plus the colour of the wood grain.

export const JOGINO_COLORS = ['madera', 'rojo', 'azul', 'verde', 'negro', 'blanco'] as const;
export type JoginoColor = (typeof JOGINO_COLORS)[number];

export interface Paint {
  label: string;
  light: string;
  dark: string;
  grain: string;
  /** How strong the grain shows (dark paint needs light grain). */
  grainOpacity: number;
}

export const PAINT: Record<JoginoColor, Paint> = {
  madera: { label: 'Madera', light: '#ecc58f', dark: '#c98d52', grain: '#7a4a1f', grainOpacity: 0.16 },
  rojo: { label: 'Rojo', light: '#de5a43', dark: '#a92e27', grain: '#4d0f0b', grainOpacity: 0.2 },
  azul: { label: 'Azul', light: '#5b8ede', dark: '#2a4f9e', grain: '#0d1f4a', grainOpacity: 0.2 },
  verde: { label: 'Verde', light: '#59a472', dark: '#2a6843', grain: '#0b2a18', grainOpacity: 0.2 },
  negro: { label: 'Negro', light: '#4d4946', dark: '#211f1e', grain: '#ffffff', grainOpacity: 0.09 },
  blanco: { label: 'Blanco', light: '#f8f4ea', dark: '#ddd2bf', grain: '#8c7656', grainOpacity: 0.16 },
};

export const isJoginoColor = (value: unknown): value is JoginoColor =>
  typeof value === 'string' && (JOGINO_COLORS as readonly string[]).includes(value);
