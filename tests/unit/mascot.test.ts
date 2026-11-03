import { describe, expect, it } from 'vitest';
import { nearestUpright, releaseVelocity, step, type Body } from '../../src/mascot/physics';
import { readPrefs } from '../../src/mascot/prefs';
import { easter, greetingFor, seasonFor, wornCostume } from '../../src/mascot/seasons';

const bounds = { right: 1000, floor: 700 };
const at = (body: Partial<Body>): Body => ({ x: 500, y: 300, vx: 0, vy: 0, angle: 0, spin: 0, ...body });

/** Runs the flight until he rests (or gives up after 20 simulated seconds). */
function fly(body: Body) {
  const hits: string[] = [];
  for (let frame = 0; frame < 1200; frame++) {
    const next = step(body, bounds, 1 / 60);
    body = next.body;
    if (next.hit) hits.push(next.hit);
    if (next.resting) return { body, hits, seconds: frame / 60 };
  }
  throw new Error('Jogiño never came to rest');
}

describe('Jogiño thrown across the screen', () => {
  it('falls, bounces on the floor and comes to rest on it', () => {
    const { body, hits } = fly(at({}));
    expect(body.y).toBe(bounds.floor);
    expect(hits).toContain('floor');
  });

  it('bounces off the walls and never leaves the screen', () => {
    let body = at({ vx: 4000, vy: -3000, spin: 1200 });
    const hits: string[] = [];
    for (let frame = 0; frame < 600; frame++) {
      const next = step(body, bounds, 1 / 60);
      body = next.body;
      if (next.hit) hits.push(next.hit);
      expect(body.x).toBeGreaterThanOrEqual(0);
      expect(body.x).toBeLessThanOrEqual(bounds.right);
      expect(body.y).toBeGreaterThanOrEqual(0);
      expect(body.y).toBeLessThanOrEqual(bounds.floor);
    }
    expect(hits).toContain('wall');
  });

  it('a throw takes its speed from the last moments of the drag', () => {
    const samples = [{ x: 0, y: 0, t: 0 }, { x: 0, y: 0, t: 500 }, { x: 50, y: -20, t: 550 }];
    expect(releaseVelocity(samples)).toEqual({ vx: 1000, vy: -400 });
    expect(releaseVelocity([{ x: 3, y: 3, t: 10 }])).toEqual({ vx: 0, vy: 0 });
  });

  it('stands up by the shortest turn', () => {
    expect(nearestUpright(350)).toBe(360);
    expect(nearestUpright(-170)).toBe(-0);
    expect(nearestUpright(100)).toBe(0);
  });
});

describe('Jogiño preferences', () => {
  it('are wooden and visible unless the person chose otherwise', () => {
    expect(readPrefs(null)).toEqual({ color: 'madera', hidden: false, costume: 'auto' });
    expect(readPrefs('{"color":"negro","hidden":true,"costume":"navidad"}')).toEqual({ color: 'negro', hidden: true, costume: 'navidad' });
    expect(readPrefs('{"color":"dorado","costume":"pirata"}')).toEqual({ color: 'madera', hidden: false, costume: 'auto' });
    expect(readPrefs('not json')).toEqual({ color: 'madera', hidden: false, costume: 'auto' });
  });
});

describe('Jogiño dresses up for the time of year', () => {
  const on = (iso: string) => seasonFor(new Date(iso + 'T12:00:00'));

  it('knows when Easter falls, so Carnaval can move with it', () => {
    expect(easter(2026)).toEqual({ month: 4, day: 5 });
    expect(easter(2027)).toEqual({ month: 3, day: 28 });
    expect(easter(2038)).toEqual({ month: 4, day: 25 });
  });

  it('wears the costume of the special days, and of the season the rest of the year', () => {
    expect(on('2026-10-31')).toBe('halloween');
    expect(on('2026-11-03')).toBe('otono');
    expect(on('2026-12-24')).toBe('navidad');
    expect(on('2026-12-31')).toBe('finDeAno');
    expect(on('2027-01-01')).toBe('finDeAno');
    expect(on('2027-01-04')).toBe('navidad');
    expect(on('2027-01-06')).toBe('reyes');
    expect(on('2027-01-20')).toBeNull();
    expect(on('2026-02-14')).toBe('sanValentin');
    expect(on('2026-04-10')).toBe('primavera');
    expect(on('2026-08-01')).toBe('verano');
    expect([on('2027-05-30'), on('2027-05-31'), on('2027-06-01')]).toEqual(['primavera', 'cumple', 'primavera']);
    expect(on('2026-09-20')).toBe('otono');
  });

  it('Carnaval goes from jueves lardero to the burial of the sardine, a different week each year', () => {
    // 2026: Carnival Tuesday is 17 February; 2027: 9 February.
    expect([on('2026-02-11'), on('2026-02-12'), on('2026-02-14'), on('2026-02-18'), on('2026-02-19')]).toEqual(['sanValentin', 'carnaval', 'sanValentin', 'carnaval', null]);
    expect([on('2027-02-03'), on('2027-02-04'), on('2027-02-10'), on('2027-02-11')]).toEqual([null, 'carnaval', 'carnaval', 'sanValentin']);
  });

  it('follows the calendar unless the person picked a costume or none', () => {
    const halloween = new Date('2026-10-31T12:00:00');
    expect(wornCostume('auto', halloween)).toBe('halloween');
    expect(wornCostume('verano', halloween)).toBe('verano');
    expect(wornCostume('ninguno', halloween)).toBeNull();
    expect(greetingFor(halloween)).toBe('¡Truco o trato! Soy Jogiño.');
    expect(greetingFor(new Date('2027-01-20T12:00:00'))).toBe('¡Hola, soy Jogiño!');
  });
});
