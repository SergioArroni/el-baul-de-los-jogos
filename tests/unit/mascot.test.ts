import { describe, expect, it } from 'vitest';
import { nearestUpright, releaseVelocity, step, type Body } from '../../src/mascot/physics';
import { readPrefs } from '../../src/mascot/prefs';

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
    expect(readPrefs(null)).toEqual({ color: 'madera', hidden: false });
    expect(readPrefs('{"color":"negro","hidden":true}')).toEqual({ color: 'negro', hidden: true });
    expect(readPrefs('{"color":"dorado"}')).toEqual({ color: 'madera', hidden: false });
    expect(readPrefs('not json')).toEqual({ color: 'madera', hidden: false });
  });
});
