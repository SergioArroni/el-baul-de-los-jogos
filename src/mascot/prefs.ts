// What's saved about Jogiño, read defensively: anything odd means the defaults.
import { isJoginoColor, type JoginoColor } from './colors';
import { isCostumeChoice, type CostumeChoice } from './seasons';

export interface JoginoPrefs {
  color: JoginoColor;
  hidden: boolean;
  /** His costume: the calendar's by default. */
  costume: CostumeChoice;
}

const DEFAULTS: JoginoPrefs = { color: 'madera', hidden: false, costume: 'auto' };

export function readPrefs(raw: string | null): JoginoPrefs {
  try {
    const saved = raw ? JSON.parse(raw) : {};
    return {
      color: isJoginoColor(saved?.color) ? saved.color : DEFAULTS.color,
      hidden: saved?.hidden === true,
      costume: isCostumeChoice(saved?.costume) ? saved.costume : DEFAULTS.costume,
    };
  } catch {
    return { ...DEFAULTS };
  }
}
