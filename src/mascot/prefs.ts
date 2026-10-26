// What's saved about Jogiño, read defensively: anything odd means the defaults.
import { isJoginoColor, type JoginoColor } from './colors';

export interface JoginoPrefs {
  color: JoginoColor;
  hidden: boolean;
}

export function readPrefs(raw: string | null): JoginoPrefs {
  try {
    const saved = raw ? JSON.parse(raw) : {};
    return { color: isJoginoColor(saved?.color) ? saved.color : 'madera', hidden: saved?.hidden === true };
  } catch {
    return { color: 'madera', hidden: false };
  }
}
