import { describe, expect, it } from 'vitest';
import { gameArt } from '../../src/domain/art';
import { buildShelves, filterGames, noFilters, topTypes } from '../../src/domain/catalog';
import { groupKey, groupMembers, groupWithMembers, playGroupKey, splitGroupKey } from '../../src/domain/groups';
import { maxPlayers, playerRange, supports } from '../../src/domain/players';
import { recommend } from '../../src/domain/recommend';
import { signedOutPage } from '../../src/domain/routes';
import { needsPlaceMigration, normalizeGamePlace, seedGames, withDefaultPlaces } from '../../src/domain/seed';
import { median, playStats, realDuration } from '../../src/domain/stats';
import { diffRows, snapshotOf } from '../../src/domain/sync';
import { learnTaste, monthsBetween } from '../../src/domain/taste';
import { isValidNickname, localToday, nameKey, nicknameSuggestion, safeHttpUrl, withSuffix } from '../../src/domain/text';
import type { Friend, Game, Group, Play } from '../../src/domain/types';

const game = (over: Partial<Game> = {}): Game => ({
  id: 'g', name: 'Juego', players: '2–4', types: [], weight: 2, duration: 30, locations: [], notes: '', ...over,
});

const play = (over: Partial<Play> = {}): Play => ({
  id: 'p', owner_id: 'u1', group_owner: null, group_key: null, group_name: null, game_name: 'Catan',
  played_on: '2026-10-01', place: null, notes: null, created_at: '', play_players: [], ...over,
});

describe('players', () => {
  it('reads ranges written in many ways', () => {
    expect(playerRange('3–10')).toEqual([3, 10]);
    expect(playerRange('2–?')).toEqual([2]);
    expect(playerRange('?')).toEqual([]);
    expect(maxPlayers({ players: '4–12' })).toBe(12);
  });
  it('checks whether a game supports a group size', () => {
    expect(supports({ players: '3–6' }, 4)).toBe(true);
    expect(supports({ players: '3–6' }, 7)).toBe(false);
    expect(supports({ players: '2' }, 2)).toBe(true);
    expect(supports({ players: '?' }, 4)).toBe(false);
    expect(supports({ players: '?' }, 0)).toBe(true);
  });
});

describe('text', () => {
  it('builds nicknames the sign-up form accepts', () => {
    expect(nicknameSuggestion('Tío Juan')).toBe('tio_juan');
    expect(nicknameSuggestion('Pépe!')).toBe('pepe');
    expect(nicknameSuggestion('Al')).toBe('al_jogos');
    expect(nicknameSuggestion('😀')).toBe('amigo_jogos');
    expect(isValidNickname(nicknameSuggestion('Un nombre larguísimo que no cabe en el apodo'))).toBe(true);
    expect(withSuffix('pepe', 0)).toBe('pepe_100');
    expect(withSuffix('a'.repeat(24), 0.999).length).toBeLessThanOrEqual(24);
  });
  it('compares names ignoring case and spaces', () => {
    expect(nameKey('  CATAN ')).toBe(nameKey('catan'));
  });
  it('only accepts http links', () => {
    expect(safeHttpUrl('https://tienda.es/x')).toBe('https://tienda.es/x');
    expect(safeHttpUrl('javascript:alert(1)')).toBe('');
    expect(safeHttpUrl('no es url')).toBe('');
  });
  it('uses the local date, not UTC', () => {
    expect(localToday(new Date('2026-10-21T08:00:00'))).toBe('2026-10-21');
  });
});

describe('stats', () => {
  const plays = [
    play({ game_name: 'Catan', played_on: '2026-10-12', play_players: [
      { id: '1', play_id: 'p', name: 'Ana', user_id: 'a', points: 10, winner: true, rating: 9 },
      { id: '2', play_id: 'p', name: 'Pepe', user_id: null, points: 7, winner: false, rating: 8 },
    ] }),
    play({ game_name: ' catan', played_on: '2026-10-01', play_players: [
      { id: '3', play_id: 'p', name: 'Ana', user_id: 'a', points: null, winner: true, rating: null },
    ] }),
    play({ game_name: 'Dixit', play_players: [
      { id: '4', play_id: 'p', name: 'Pepe', user_id: null, points: null, winner: true, rating: 6 },
    ] }),
  ];
  it('groups plays by game name and averages ratings', () => {
    const stats = playStats(plays);
    const catan = stats.games.get('catan')!;
    expect(catan.count).toBe(2);
    expect(catan.sum / catan.ratings).toBe(8.5);
    expect(catan.last).toBe('2026-10-12');
    expect(stats.mostPlayed?.name).toBe('Catan');
    expect(stats.bestRated.map(g => g.name)).toEqual(['Catan', 'Dixit']);
  });
  it('ranks winners by account, or by name when they have no account', () => {
    expect(playStats(plays).winners.map(w => [w.name, w.count])).toEqual([['Ana', 2], ['Pepe', 1]]);
  });
});

describe('art', () => {
  it('is stable for the same game and follows the main style', () => {
    expect(gameArt({ name: 'Trio', types: ['Cartas'] })).toEqual(gameArt({ name: 'Trio', types: ['Cartas'] }));
    expect(gameArt({ name: 'X', types: ['Fiesta', 'Roles ocultos'] }).emoji).toBe('🕵️');
    expect(gameArt({ name: 'X', types: ['Desconocido'] }).emoji).toBe('🎲');
  });
});

describe('groups', () => {
  const friends: Friend[] = [{ id: 'f1', name: 'Ana', userId: 'a' }, { id: 'f2', name: 'Pepe' }];
  const group: Group = { id: 'g1', name: 'Los Balcánicos', size: null, friendIds: ['f1', 'f2', 'gone'], likes: '', notes: '' };
  it('resolves members and keeps a snapshot for shared copies', () => {
    expect(groupMembers(group, friends)).toEqual([{ name: 'Ana', userId: 'a' }, { name: 'Pepe', userId: null }]);
    expect(groupWithMembers(group, friends).members).toHaveLength(2);
    expect(groupMembers({ ...group, _shared: true, members: [{ name: 'Z', userId: null }] }, [])).toEqual([{ name: 'Z', userId: null }]);
  });
  it('builds keys that identify a group across accounts', () => {
    expect(groupKey(group, 'me')).toBe('me:g1');
    expect(groupKey({ ...group, _ownerId: 'owner' }, 'me')).toBe('owner:g1');
    expect(playGroupKey({ group_owner: 'owner', group_key: 'g1' })).toBe('owner:g1');
    expect(playGroupKey({ group_owner: null, group_key: null })).toBe('');
    expect(splitGroupKey('owner:g:1')).toEqual({ owner: 'owner', id: 'g:1' });
  });
});

describe('catalog', () => {
  const games = [
    game({ id: '1', name: 'Zombis', types: ['Fiesta'], players: '3–10', duration: 20 }),
    game({ id: '2', name: 'Agricola', types: ['Estrategia'], weight: 5, duration: 120, locations: ['Casa Lu'] }),
    game({ id: '3', name: 'Burrito', types: ['Fiesta'], players: '2–6', duration: 15, locations: ['Casa Enzo', 'Casa Lu'] }),
    game({ id: '4', name: 'Diplomacy', types: ['Estrategia'], weight: 5, players: '2–7', duration: 360 }),
  ];
  it('filters by search, style, players and place, sorted by name', () => {
    expect(filterGames(games, { search: '', type: 'Fiesta', players: 0, place: '' }).map(g => g.name)).toEqual(['Burrito', 'Zombis']);
    expect(filterGames(games, { search: 'agri', type: '', players: 0, place: '' })).toHaveLength(1);
    expect(filterGames(games, { search: '', type: '', players: 8, place: '' }).map(g => g.name)).toEqual(['Zombis']);
    expect(filterGames(games, { search: '', type: '', players: 0, place: 'Casa Lu' }).map(g => g.id)).toEqual(['2', '3']);
    expect(noFilters({ search: '  ', type: '', players: 0, place: '' })).toBe(true);
  });
  it('lists the most common styles first', () => {
    expect(topTypes(games)).toEqual(['Fiesta', 'Estrategia']);
  });
  it('builds themed shelves and skips the ones with a single game', () => {
    const shelves = buildShelves(games, playStats([play({ game_name: 'Zombis' })]).games, true);
    const titles = shelves.map(s => s.title);
    expect(titles).toContain('⚡ Para una partida rápida');
    expect(titles).toContain('🧠 Para pensar a fondo');
    expect(titles).toContain('📦 Sin estrenar');
    expect(titles).not.toContain('⭐ Vuestros favoritos');
  });
});

describe('recommend', () => {
  const games = [
    game({ id: '1', name: 'Catan', players: '3–4', types: ['Estrategia'] }),
    game({ id: '2', name: 'Dixit', players: '3–8', types: ['Fiesta'] }),
    game({ id: '3', name: 'Duo', players: '2', types: ['Dos jugadores'] }),
  ];
  it('drops games that do not fit the group size', () => {
    const names = recommend(games, { players: 5, mood: '', weight: 0, duration: 0, place: '' }).map(r => r.game.name);
    expect(names).toEqual(['Dixit']);
  });
  it('prefers games the group rated well and explains why', () => {
    const group: Group = { id: 'g', name: 'G', size: null, friendIds: [], likes: '', notes: '' };
    const groupGames = playStats([play({ game_name: 'Catan', play_players: [
      { id: 'x', play_id: 'p', name: 'A', user_id: null, points: null, winner: false, rating: 10 },
    ] })]).games;
    const result = recommend(games, { players: 3, group, groupGames, mood: '', weight: 0, duration: 0, place: '' });
    expect(result[0].game.name).toBe('Catan');
    expect(result[0].groupNote).toBe('Nota del grupo: 10/10');
    expect(result[1].groupNote).toBe('Sin estrenar con el grupo');
  });
});

describe('sync', () => {
  it('only reports rows that were added, changed or removed', () => {
    const before = snapshotOf([{ id: 'a', v: 1 }, { id: 'b', v: 1 }, { id: 'c', v: 1 }]);
    const diff = diffRows(before, [{ id: 'a', v: 1 }, { id: 'b', v: 2 }, { id: 'd', v: 1 }]);
    expect(diff.removed).toEqual(['c']);
    expect(diff.changed.map(r => r.id)).toEqual(['b', 'd']);
    expect(diffRows(diff.current, [{ id: 'a', v: 1 }, { id: 'b', v: 2 }, { id: 'd', v: 1 }]).changed).toEqual([]);
  });
});

describe('seed', () => {
  it('turns old saves with one place (or a place code) into a list of places', () => {
    const { locations: _, ...old } = game();
    expect(normalizeGamePlace({ ...old, location: 'Casa Enzo' }).locations).toEqual(['Casa Enzo']);
    expect(normalizeGamePlace({ ...old, location: 'home' }).locations).toEqual(['Casa Sergio']);
    expect(normalizeGamePlace({ ...old, location: 'away' }).locations).toEqual([]);
    expect(normalizeGamePlace({ ...old, location: '' }).locations).toEqual([]);
    expect(normalizeGamePlace(old).locations).toEqual([]);
    expect('location' in normalizeGamePlace({ ...old, location: 'Casa Lu' })).toBe(false);
  });

  it('keeps several places without repeats or blanks', () => {
    expect(normalizeGamePlace(game({ locations: ['Casa Enzo', ' Casa Lu ', 'Casa Enzo', ''] })).locations).toEqual(['Casa Enzo', 'Casa Lu']);
  });

  it('only asks to save again when the stored shape changed', () => {
    const { locations: _, ...old } = game();
    const legacy = { ...old, location: 'Casa Lu' };
    expect(needsPlaceMigration(legacy, normalizeGamePlace(legacy))).toBe(true);
    const current = game({ locations: ['Casa Lu'] });
    expect(needsPlaceMigration(current, normalizeGamePlace(current))).toBe(false);
  });

  it('keeps default places without duplicates', () => {
    expect(seedGames()).toHaveLength(42);
    expect(withDefaultPlaces([{ id: 'x', name: 'casa lu' }]).map(p => p.name)).toHaveLength(5);
    expect(withDefaultPlaces([])).toHaveLength(5);
  });
});

describe('signed-out visitors', () => {
  it('see the landing on the web, and the login in the APK or from an email link', () => {
    expect(signedOutPage(false, '')).toBe('/inicio');
    expect(signedOutPage(true, '')).toBe('login.html');
    expect(signedOutPage(false, '#access_token=x&type=recovery')).toBe('login.html#access_token=x&type=recovery');
  });
});

describe('real play time', () => {
  const timed = (minutes: number | null, name = 'Azul') => play({ game_name: name, duration_minutes: minutes });

  it('takes the middle value, so one endless play does not drag it', () => {
    expect(median([30, 40, 600])).toBe(40);
    expect(median([30, 40, 50, 60])).toBe(45);
    expect(median([])).toBeNull();
  });

  it('only shows a real time with at least three timed plays of that game', () => {
    expect(realDuration([timed(40), timed(50), timed(null)], 'Azul')).toBeNull();
    expect(realDuration([timed(40), timed(50), timed(70), timed(20, 'Catan')], 'azul')).toBe(50);
  });
});

describe('learning your taste', () => {
  const rated = (name: string, rating: number, user = 'me', played_on = '2026-10-01') =>
    play({ id: name + user + rating, game_name: name, played_on, play_players: [{ id: 'x', play_id: 'p', name: user, user_id: user, points: null, winner: false, rating }] });
  const collection = [
    game({ id: '1', name: 'Hanabi', types: ['Cooperativo'], weight: 2 }),
    game({ id: '2', name: 'Magic Maze', types: ['Cooperativo'], weight: 2 }),
    game({ id: '3', name: 'Diplomacy', types: ['Estrategia'], weight: 5 }),
    game({ id: '4', name: 'Agricola', types: ['Estrategia'], weight: 5 }),
  ];

  it('learns which styles and weight you rate well, counting only the chosen people', () => {
    const taste = learnTaste([rated('Hanabi', 9), rated('Diplomacy', 3), rated('Diplomacy', 10, 'stranger')], collection, new Set(['me']));
    expect(taste.styles.get('Cooperativo')).toBe(3.5);
    expect(taste.styles.get('Estrategia')).toBe(-2.5);
    expect(taste.weight).toBe(2);
    expect(taste.worst.get('diplomacy')).toBe(3);
  });

  it('suggests games like the ones you love, and explains why', () => {
    const taste = learnTaste([rated('Hanabi', 9), rated('Diplomacy', 3)], collection, new Set(['me']));
    const result = recommend(collection, { players: 3, mood: '', weight: 0, duration: 0, place: '', taste, today: '2026-10-25' });
    expect(result[0].game.name).toBe('Magic Maze');
    expect(result[0].reasons).toContain('Te gustan los juegos de cooperativo');
    expect(result[0].reasons).toContain('Aún no lo habéis estrenado');
    expect(result.at(-1)?.game.name).not.toBe('Magic Maze');
    expect(result.map(r => r.game.name)).not.toContain('Diplomacy');
  });

  it('brings back games you have not played in months', () => {
    const taste = learnTaste([rated('Hanabi', 8, 'me', '2026-05-01')], collection, null);
    const hanabi = recommend(collection, { players: 3, mood: '', weight: 0, duration: 0, place: '', taste, today: '2026-10-25' }).find(r => r.game.name === 'Hanabi');
    expect(hanabi?.reasons).toContain('Hace 5 meses que no lo jugáis');
    expect(monthsBetween('2026-01-31', '2026-02-28')).toBe(0);
  });
});

describe('collaborative filtering', () => {
  const collection = [game({ id: '1', name: 'Spirit Island' }), game({ id: '2', name: 'Uno' }), game({ id: '3', name: 'Azul' })];
  const crowd = new Map([
    ['spirit island', { name: 'Spirit Island', predicted: 8.4, neighbours: 4 }],
    ['uno', { name: 'Uno', predicted: 2.5, neighbours: 3 }],
  ]);

  it('pushes up what people with your taste love, and says so first', () => {
    const result = recommend(collection, { players: 3, mood: '', weight: 0, duration: 0, place: '', crowd });
    expect(result[0].game.name).toBe('Spirit Island');
    expect(result[0].reasons[0]).toBe('A gente con tus gustos le encanta (★ 8,4)');
    expect(result.at(-1)?.game.name).toBe('Uno');
  });
});
