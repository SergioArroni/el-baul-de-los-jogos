// Shared motion for every page (app, login, landing), built on GSAP. Everything goes
// through prefersReducedMotion(): people who ask their system for less motion get the
// final state straight away. Scroll-driven effects live in ./scroll.ts (landing only),
// so the app only carries the GSAP core and Flip.
import { gsap } from 'gsap';
import { Flip } from 'gsap/Flip';

gsap.registerPlugin(Flip);

export { gsap };

export const prefersReducedMotion = (): boolean =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Svelte action: the element rises into place the first time it scrolls into view. */
export function reveal(node: HTMLElement, options: { y?: number; delay?: number } = {}) {
  if (prefersReducedMotion() || typeof IntersectionObserver !== 'function') return {};
  gsap.set(node, { opacity: 0, y: options.y ?? 26 });
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    gsap.to(node, { opacity: 1, y: 0, duration: 0.7, delay: options.delay ?? 0, ease: 'power3.out', clearProps: 'opacity,transform' });
  }, { threshold: 0.12 });
  observer.observe(node);
  return { destroy: () => observer.disconnect() };
}

/** Each deal plays once per browser session and key, so returning to a tab doesn't repeat it. */
function firstTime(key: string | undefined): boolean {
  if (!key) return true;
  try {
    if (sessionStorage.getItem('dealt:' + key)) return false;
    sessionStorage.setItem('dealt:' + key, '1');
  } catch {
    /* storage blocked: just play it */
  }
  return true;
}

/**
 * Svelte action: deals the element's children like cards from a deck, one after
 * another with a little spin. Only the first `limit` cards move, so long lists stay quick.
 */
export function deal(node: HTMLElement, options: { selector?: string; once?: string; limit?: number } = {}) {
  if (prefersReducedMotion() || !firstTime(options.once)) return {};
  const cards = gsap.utils.toArray<HTMLElement>(node.querySelectorAll(options.selector ?? ':scope > *')).slice(0, options.limit ?? 18);
  // CSS transitions on transform (hover effects) would fight GSAP: off while dealing.
  gsap.set(cards, { transition: 'none' });
  gsap.from(cards, {
    opacity: 0, y: 46, scale: 0.88, rotation: () => gsap.utils.random(-9, 9),
    duration: 0.6, stagger: 0.045, ease: 'back.out(1.5)', clearProps: 'opacity,transform,transition',
  });
  return {};
}

/** Svelte action: the number counts up to its value once it is on screen (and on every change). */
export function countUp(node: HTMLElement, value: number) {
  const format = (n: number) => Math.round(n).toLocaleString('es-ES');
  let observer: IntersectionObserver | undefined;
  function run(target: number) {
    observer?.disconnect();
    if (prefersReducedMotion() || typeof IntersectionObserver !== 'function') return void (node.textContent = format(target));
    node.textContent = format(0);
    observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer?.disconnect();
      const counter = { n: 0 };
      gsap.to(counter, { n: target, duration: 1.2, ease: 'power2.out', onUpdate: () => (node.textContent = format(counter.n)) });
    }, { threshold: 0.5 });
    observer.observe(node);
  }
  run(value);
  return { update: run, destroy: () => observer?.disconnect() };
}

/**
 * Smoothly moves a list's items to their new places when it changes (filters, sorting):
 * call capture() before the update and play() after. Svelte keeps the same DOM node per
 * key, which is what GSAP Flip needs to match before and after.
 */
export function flipList(container: () => HTMLElement | undefined, selector: string) {
  let state: Flip.FlipState | null = null;
  return {
    capture() {
      const root = container();
      state = root && !prefersReducedMotion() ? Flip.getState(root.querySelectorAll(selector)) : null;
    },
    play() {
      if (!state) return;
      const moving = state.targets;
      gsap.set(moving, { transition: 'none' });
      Flip.from(state, {
        duration: 0.45, ease: 'power2.inOut', nested: true,
        onComplete: () => void gsap.set(moving, { clearProps: 'transition' }),
        onEnter: entering => gsap.fromTo(entering, { opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1, duration: 0.35, clearProps: 'opacity,transform' }),
      });
      state = null;
    },
  };
}

// Where the last card was tapped, so the dialog it opens can grow out of it.
let origin: DOMRect | null = null;
export const rememberOrigin = (element: Element): void => void (origin = element.getBoundingClientRect());

/** Svelte action for dialogs: grows and turns out of the last tapped card, or pops in. */
export function cardEnter(node: HTMLElement) {
  const from = origin;
  origin = null;
  if (prefersReducedMotion()) return {};
  const target = node.getBoundingClientRect();
  const start = from && target.width
    ? {
        x: from.left + from.width / 2 - (target.left + target.width / 2),
        y: from.top + from.height / 2 - (target.top + target.height / 2),
        scale: Math.max(0.2, from.width / target.width),
        rotationY: -28,
      }
    : { y: 30, scale: 0.94, rotationY: 0 };
  gsap.from(node, { ...start, opacity: 0.2, transformPerspective: 1100, duration: 0.5, ease: 'power3.out', clearProps: 'opacity,transform' });
  return {};
}

/** Svelte action: drops the element in with a bounce, when `play` is true (a meeple just placed). */
export function drop(node: HTMLElement, play: boolean) {
  if (play && !prefersReducedMotion()) {
    gsap.from(node, { y: -80, rotation: -30, opacity: 0, duration: 0.75, ease: 'bounce.out', clearProps: 'opacity,transform' });
  }
  return {};
}

/** Svelte action: a short fade-in for a section that just replaced another. */
export function enter(node: HTMLElement) {
  if (!prefersReducedMotion()) gsap.from(node, { opacity: 0, y: 12, duration: 0.35, ease: 'power2.out', clearProps: 'opacity,transform' });
  return {};
}
