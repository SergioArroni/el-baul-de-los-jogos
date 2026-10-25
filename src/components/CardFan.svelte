<script lang="ts">
  import { onMount } from 'svelte';
  import { coverUrl, LIBRARY } from '../content/library';
  import { gsap, prefersReducedMotion } from '../motion';

  /** A hand of game covers: dealt in, leaning towards the pointer, lifting the one you point at. */
  interface Props {
    slugs?: string[];
    /** Card width in px; the fan's height follows it. */
    width?: number;
  }

  let { slugs = ['times-up', 'azul', 'hanabi', 'scythe', 'carcassonne', 'mysterium', 'sushi-go'], width = 170 }: Props = $props();

  const cards = $derived(slugs.map(slug => LIBRARY.find(entry => entry.slug === slug)).filter(entry => !!entry));
  let fan: HTMLDivElement;

  onMount(() => {
    const items = gsap.utils.toArray<HTMLElement>(fan.querySelectorAll('.fan-card'));
    const middle = (items.length - 1) / 2;
    const rest = (i: number) => ({ rotation: (i - middle) * 9, y: Math.abs(i - middle) * 4 });

    if (prefersReducedMotion()) {
      items.forEach((card, i) => gsap.set(card, rest(i)));
      return;
    }
    gsap.fromTo(items,
      { rotation: 0, y: 70, opacity: 0 },
      { rotation: i => rest(i).rotation, y: i => rest(i).y, opacity: 1, duration: 1, delay: 0.15, stagger: 0.08, ease: 'back.out(1.4)' });

    // Pointer devices: the hand leans towards the pointer and the card under it rises.
    if (!matchMedia('(pointer: fine)').matches) return;
    let lifted: HTMLElement | null = null;
    const lean = (event: PointerEvent) => {
      const box = fan.getBoundingClientRect();
      const pull = gsap.utils.clamp(-1, 1, (event.clientX - (box.left + box.width / 2)) / box.width);
      items.forEach((card, i) => {
        if (card !== lifted) gsap.to(card, { rotation: rest(i).rotation + pull * 6, duration: 0.8, ease: 'power3.out' });
      });
    };
    const lift = (card: HTMLElement, i: number, up: boolean) => {
      lifted = up ? card : null;
      gsap.to(card, { y: up ? rest(i).y - 34 : rest(i).y, scale: up ? 1.06 : 1, zIndex: up ? 10 : 'auto', duration: 0.35, ease: 'power2.out' });
    };
    const cleanups = items.map((card, i) => {
      const enterCard = () => lift(card, i, true);
      const leaveCard = () => lift(card, i, false);
      card.addEventListener('pointerenter', enterCard);
      card.addEventListener('pointerleave', leaveCard);
      return () => {
        card.removeEventListener('pointerenter', enterCard);
        card.removeEventListener('pointerleave', leaveCard);
      };
    });
    window.addEventListener('pointermove', lean);
    return () => {
      window.removeEventListener('pointermove', lean);
      cleanups.forEach(cleanup => cleanup());
    };
  });
</script>

<div class="card-fan" bind:this={fan} style:--fan-w="{width}px" aria-hidden="true">
  {#each cards as entry (entry.slug)}
    <img class="fan-card" src={coverUrl(entry)} alt="" draggable="false" />
  {/each}
</div>

<style>
  .card-fan {
    position: relative;
    width: calc(var(--fan-w) * 2.6);
    max-width: 100%;
    height: calc(var(--fan-w) * 1.75);
    margin: 0 auto;
  }
  .fan-card {
    position: absolute;
    left: 50%;
    bottom: 0;
    width: var(--fan-w);
    aspect-ratio: 3 / 4;
    margin-left: calc(var(--fan-w) / -2);
    border: 4px solid #fffefa;
    border-radius: 14px;
    box-shadow: var(--card-shadow);
    transform-origin: 50% 150%;
    user-select: none;
  }
</style>
