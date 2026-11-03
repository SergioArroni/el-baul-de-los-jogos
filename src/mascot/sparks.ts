// What Jogiño scatters when thrown in costume: snow at Christmas, bats at Halloween, confetti
// at Carnaval… Small SVGs flung out from where he is, falling and fading, then removed.
import { gsap } from '../motion';
import type { Costume } from './seasons';

const CONFETTI = ['#e0533f', '#2f5fb0', '#f4c542', '#59a472', '#e2557a', '#7a3fa0'];
const HEART = '<path d="M0 1.2C0-1-3-1.5-3 .8C-3 2.6 0 4 0 4.6C0 4 3 2.6 3 .8C3-1.5 0-1 0 1.2Z" fill="#e2557a"/>';

/** One spark's drawing (in a -6…6 box) for each costume; the colour may vary per spark. */
const SHAPES: Record<Costume, (colour: string) => string> = {
  halloween: () => '<path d="M0-1C1-3 2-3 2.5-1C4-3 6-3 6-1.5C4.5-1 4-0 4 1.5C3 1 1.5 1 0 2.5C-1.5 1-3 1-4 1.5C-4 0-4.5-1-6-1.5C-6-3-4-3-2.5-1C-2-3-1-3 0-1Z" fill="#2b2235"/>',
  navidad: () => '<path d="M0-5V5M-4.3-2.5 4.3 2.5M-4.3 2.5 4.3-2.5" stroke="#9ec3dd" stroke-width="1.4" stroke-linecap="round"/>',
  finDeAno: colour => `<rect x="-1.5" y="-3" width="3" height="6" rx="1" fill="${colour}"/>`,
  reyes: () => '<path d="M0-5Q.8-.8 5 0Q.8.8 0 5Q-.8.8-5 0Q-.8-.8 0-5Z" fill="#e8b830"/>',
  sanValentin: () => HEART,
  carnaval: colour => `<rect x="-1.5" y="-3" width="3" height="6" rx="1" fill="${colour}"/>`,
  cumple: colour => `<rect x="-1.5" y="-3" width="3" height="6" rx="1" fill="${colour}"/>`,
  primavera: () => '<ellipse rx="2.4" ry="4" fill="#f4a3c0"/>',
  verano: () => '<path d="M0-4.5Q3.5 0 3.5 2A3.5 3.5 0 0 1-3.5 2Q-3.5 0 0-4.5Z" fill="#5b9ede"/>',
  otono: colour => `<path d="M-4 4Q-4-4 4-4Q4 4-4 4Z" fill="${colour}"/>`,
};
const AUTUMN = ['#c9661a', '#d9822b', '#a8452a', '#e0a23a'];

let live = 0;
const LIMIT = 40;

/** Flings `count` sparks from (x, y) on the page; `speed` is how hard he was thrown (px/s). */
export function scatter(costume: Costume, x: number, y: number, count: number, speed = 0): void {
  for (let i = 0; i < count && live < LIMIT; i++) {
    const colour = costume === 'otono' ? gsap.utils.random(AUTUMN) : gsap.utils.random(CONFETTI);
    const spark = document.createElement('span');
    spark.className = 'jogino-spark';
    spark.setAttribute('aria-hidden', 'true');
    spark.innerHTML = `<svg viewBox="-6 -6 12 12" width="14" height="14">${SHAPES[costume](colour)}</svg>`;
    document.body.append(spark);
    live++;

    const size = gsap.utils.random(0.7, 1.3);
    const spread = 60 + Math.min(speed, 2000) * 0.05;
    // Snow, petals and leaves drift down slowly; the rest pops out and drops.
    const light = costume === 'navidad' || costume === 'primavera' || costume === 'otono';
    const duration = gsap.utils.random(1, light ? 2.2 : 1.4);
    gsap.set(spark, { x, y, scale: size, rotation: gsap.utils.random(0, 360) });
    gsap.to(spark, {
      keyframes: { y: [y, y - gsap.utils.random(20, light ? 40 : 90), y + gsap.utils.random(60, 140)], easeEach: 'sine.inOut' },
      duration,
    });
    gsap.to(spark, {
      x: x + gsap.utils.random(-spread, spread),
      rotation: `+=${gsap.utils.random(-260, 260)}`,
      opacity: 0,
      duration,
      ease: 'power1.in',
      onComplete: () => {
        spark.remove();
        live--;
      },
    });
  }
}
