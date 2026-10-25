import { playerRange, supports } from './players';
import { averageRating, type GameStat } from './stats';
import { monthsBetween, type Taste } from './taste';
import { formatDecimal, nameKey } from './text';
import type { Game, Group } from './types';

export interface RecommendOptions {
  players: number;
  group?: Group;
  mood: string;
  weight: number;
  duration: number;
  place: string;
  /** Stats of the selected group's plays, keyed by game name. */
  groupGames?: Map<string, GameStat>;
  /** What you (or the group) seem to like, from your ratings (see learnTaste). */
  taste?: Taste;
  /** Today's date (ISO), to notice games you haven't played in a while. */
  today?: string;
}

export interface Recommendation {
  game: Game;
  score: number;
  /** Short note about the game's history with the selected group. */
  groupNote: string;
  /** Why it is suggested, in plain words (at most two). */
  reasons: string[];
}

/** Scores every game for the plan and returns the best eight. */
export function recommend(games: Game[], options: RecommendOptions): Recommendation[] {
  const { players, group, mood, weight, duration, place, groupGames = new Map(), taste, today } = options;
  const we = group ? 'Os' : 'Te';
  const likes = group ? (group.likes ?? '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean) : [];
  return games
    .map(game => {
      let score = 0;
      const played = groupGames.get(nameKey(game.name));
      const avg = averageRating(played);
      if (avg != null) score += (avg - 5) / 1.5;
      else if (group && !played) score += 1;
      if (supports(game, players)) score += 3;
      else if (playerRange(game.players).length) score -= 8;
      if (mood && game.types.includes(mood)) score += 5;
      if (weight && game.weight) score += Math.max(0, 4 - Math.abs(game.weight - weight));
      if (duration && game.duration) score += game.duration <= duration ? 2 : -3;
      if (place && !game.locations.includes(place)) score -= 20;
      if (likes.length && game.types.some(type => likes.includes(type.toLowerCase()))) score += 3;
      const reasons: string[] = [];
      let weightReason = '';
      if (taste) {
        const key = nameKey(game.name);
        // Styles you rate well pull a game up; the best matching style explains it.
        const [style, affinity] = game.types
          .map(type => [type, taste.styles.get(type)] as const)
          .filter((pair): pair is readonly [string, number] => pair[1] != null)
          .sort((a, b) => b[1] - a[1])[0] ?? [];
        if (affinity != null) {
          score += Math.max(-3, Math.min(3, affinity)) * 0.9;
          if (affinity >= 1.5) reasons.push(`${we} gustan los juegos de ${style.toLowerCase()}`);
        }
        if (taste.weight && game.weight && !weight) {
          const gap = Math.abs(game.weight - taste.weight);
          score += Math.max(-1.5, 1.5 - gap);
          if (gap < 0.6) weightReason = 'Dureza parecida a la de vuestros favoritos';
        }
        // Someone really didn't enjoy it: better not to suggest it.
        if ((taste.worst.get(key) ?? 10) <= 3) score -= 6;
        // A little push for what hasn't been played (or not for a long time).
        const lastPlayed = taste.last.get(key);
        if (!lastPlayed) {
          score += 1;
          reasons.push('Aún no lo habéis estrenado');
        } else if (today) {
          const months = monthsBetween(lastPlayed, today);
          if (months >= 3) {
            score += 1.2;
            reasons.push(`Hace ${months} meses que no lo jugáis`);
          }
        }
      }
      const groupNote = !group ? ''
        : avg != null ? `Nota del grupo: ${formatDecimal(avg)}/10`
        : played ? `Jugado ${played.count} ${played.count === 1 ? 'vez' : 'veces'} con el grupo`
        : 'Sin estrenar con el grupo';
      // The weight is the least telling reason: only if there's room.
      if (weightReason) reasons.push(weightReason);
      return { game, score, groupNote, reasons: reasons.slice(0, 2) };
    })
    .filter(item => item.score > -2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}
