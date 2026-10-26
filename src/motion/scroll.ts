// Scroll-driven motion for the landing: smooth scrolling (Lenis), headings revealed
// word by word (SplitText) and anything tied to the scroll position (ScrollTrigger).
// The app doesn't import this file, so it doesn't carry its weight.
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { gsap, prefersReducedMotion } from './index';

gsap.registerPlugin(ScrollTrigger, SplitText);

export { ScrollTrigger };

/** Lenis smooth scrolling, driven by GSAP's clock so ScrollTrigger stays in sync. Returns a stop function. */
export function smoothScroll(): () => void {
  if (prefersReducedMotion()) return () => {};
  const lenis = new Lenis({ autoRaf: false, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  return () => {
    gsap.ticker.remove(tick);
    lenis.destroy();
  };
}

/** Svelte action: the heading rises word by word (or letter by letter) when it scrolls into view. */
export function splitReveal(node: HTMLElement, options: { by?: 'words' | 'chars'; delay?: number } = {}) {
  if (prefersReducedMotion()) return {};
  let split: SplitText | undefined;
  const by = options.by ?? 'words';
  void document.fonts.ready.then(() => {
    split = SplitText.create(node, { type: by === 'chars' ? 'words,chars' : 'words', mask: by });
    // Each mask is one line tall, and display headings have tight lines: give it room above
    // and below (without moving anything) so accents and the tails of g, j, y aren't cut.
    gsap.set(split.masks, { paddingBlock: '.2em', marginBlock: '-.2em' });
    gsap.from(by === 'chars' ? split.chars : split.words, {
      yPercent: 110, duration: 0.8, stagger: by === 'chars' ? 0.025 : 0.06, ease: 'power4.out', delay: options.delay ?? 0,
      scrollTrigger: { trigger: node, start: 'top 88%', once: true },
      // Once risen, back to plain text: no masks left to clip it, and it wraps normally again.
      onComplete: () => split?.revert(),
    });
  });
  return { destroy: () => split?.revert() };
}
