// How Jogiño flies when thrown: gravity, bounces off the screen edges, and friction once he
// slides along the floor. Pure functions over plain numbers, so they're easy to test.

export interface Body {
  /** Top-left corner, in px. */
  x: number;
  y: number;
  /** px/s */
  vx: number;
  vy: number;
  /** Rotation in degrees and its speed in degrees/s. */
  angle: number;
  spin: number;
}

/** How far the top-left corner can go: the screen minus Jogiño's own size. */
export interface Bounds {
  right: number;
  floor: number;
}

export const GRAVITY = 2600;
const BOUNCE = 0.5;
const MAX_SPEED = 4200;
/** Slower than this when touching the floor, he stops bouncing. */
const SETTLE_SPEED = 220;
const FLOOR_FRICTION = 7;

export type Hit = 'wall' | 'ceiling' | 'floor' | null;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Speed of release from the last pointer positions (px, ms): the throw. */
export function releaseVelocity(samples: { x: number; y: number; t: number }[]): { vx: number; vy: number } {
  const last = samples.at(-1);
  const first = samples.find(sample => last && last.t - sample.t <= 90) ?? last;
  if (!first || !last || last.t === first.t) return { vx: 0, vy: 0 };
  const seconds = (last.t - first.t) / 1000;
  return {
    vx: clamp((last.x - first.x) / seconds, -MAX_SPEED, MAX_SPEED),
    vy: clamp((last.y - first.y) / seconds, -MAX_SPEED, MAX_SPEED),
  };
}

/** One frame of flight. `resting` once he lies on the floor and has (almost) stopped. */
export function step(body: Body, bounds: Bounds, dt: number): { body: Body; hit: Hit; resting: boolean } {
  let { x, y, vx, vy, angle, spin } = body;
  let hit: Hit = null;
  vy += GRAVITY * dt;
  x += vx * dt;
  y += vy * dt;
  angle += spin * dt;

  if (x < 0 || x > bounds.right) {
    x = clamp(x, 0, bounds.right);
    vx = -vx * BOUNCE;
    spin = -spin * 0.6;
    hit = 'wall';
  }
  if (y < 0) {
    y = 0;
    vy = -vy * BOUNCE;
    hit = 'ceiling';
  }
  if (y >= bounds.floor) {
    y = bounds.floor;
    if (vy > SETTLE_SPEED) {
      vy = -vy * BOUNCE;
      hit = 'floor';
    } else {
      vy = 0;
    }
    // Sliding on the floor: friction slows the slide and the spin.
    const keep = Math.max(0, 1 - FLOOR_FRICTION * dt);
    vx *= keep;
    spin *= keep;
  }
  const resting = y === bounds.floor && vy === 0 && Math.abs(vx) < 25;
  return { body: { x, y, vx, vy, angle, spin }, hit, resting };
}

/** The upright angle closest to where he ended up, so standing up never takes a full turn. */
export const nearestUpright = (angle: number): number => Math.round(angle / 360) * 360;
