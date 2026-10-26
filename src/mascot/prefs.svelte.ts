// Jogiño's colour and whether he's hidden: a per-device choice, so it lives in the browser.
// Storage can be missing (private mode, blocked site data): then he's simply wooden and visible.
import { readPrefs, type JoginoPrefs } from './prefs';

const KEY = 'el-baul-jogino';

function load(): JoginoPrefs {
  try {
    return readPrefs(localStorage.getItem(KEY));
  } catch {
    return readPrefs(null);
  }
}

/** Shared by every Jogiño on the page, so changing the colour repaints them all. */
export const jogino = $state(load());

export function saveJogino(change: Partial<JoginoPrefs>): void {
  Object.assign(jogino, change);
  try {
    localStorage.setItem(KEY, JSON.stringify(jogino));
  } catch {
    /* not saved: the choice lasts until the page closes */
  }
}
