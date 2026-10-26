<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import { tick } from 'svelte';
  import { coverUrl, type LibraryEntry } from '../content/library';
  import { flipList, gsap, prefersReducedMotion } from '../motion';

  /**
   * "¿Cómo se jugaba a esto?" made playable: turn a cover over to see what the game is about,
   * shuffle the table, and (with a mouse) the card under the pointer tilts towards it.
   */
  interface Props {
    entries: LibraryEntry[];
    /** Where "how it's played" leads: the sign-up. */
    signup: string;
  }

  let { entries, signup }: Props = $props();

  // The table starts with the cards it's given; from then on its order is its own (shuffled).
  // svelte-ignore state_referenced_locally
  let deck = $state([...entries]);
  let open = $state<string | null>(null);
  let table: HTMLDivElement;
  const shown = $derived(deck.find(entry => entry.slug === open));
  const order = flipList(() => table, '.scatter-card');
  const name = (entry: LibraryEntry) => entry.names[0];

  async function shuffle() {
    order.capture();
    deck = gsap.utils.shuffle([...deck]);
    await tick();
    order.play();
  }

  // Mouse only, and not when the system asks for less motion: touch screens just turn cards over.
  const canTilt = () => matchMedia('(pointer: fine)').matches && !prefersReducedMotion();
  function tilt(event: PointerEvent) {
    if (!canTilt()) return;
    const card = event.currentTarget as HTMLElement;
    const box = card.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width - 0.5;
    const y = (event.clientY - box.top) / box.height - 0.5;
    gsap.to(card.querySelector('.card-tilt'), { rotationY: x * 18, rotationX: -y * 18, y: -6, duration: 0.4, ease: 'power2.out' });
  }
  function settle(event: PointerEvent) {
    if (!canTilt()) return;
    gsap.to((event.currentTarget as HTMLElement).querySelector('.card-tilt'), { rotationY: 0, rotationX: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.6)' });
  }
</script>

<div class="scatter" bind:this={table}>
  {#each deck as entry (entry.slug)}
    <button
      class="scatter-card"
      class:open={open === entry.slug}
      type="button"
      aria-pressed={open === entry.slug}
      aria-label="{name(entry)}: {open === entry.slug ? 'tapar la carta' : 'ver de qué va'}"
      onclick={() => (open = open === entry.slug ? null : entry.slug)}
      onpointermove={tilt}
      onpointerleave={settle}
    >
      <span class="card-tilt">
        <span class="card-flip">
          <img class="card-face" src={coverUrl(entry)} alt="" loading="lazy" draggable="false" />
          <span class="card-face card-back"><small>¿De qué va?</small><strong>{name(entry)}</strong></span>
        </span>
      </span>
    </button>
  {/each}
</div>

<div class="table-foot">
  <p class="table-caption" aria-live="polite">
    {#if shown?.rules}
      <strong>{name(shown)}:</strong> {shown.rules.goal} <a href={signup}>Ver cómo se juega →</a>
    {:else if shown}
      <strong>{name(shown)}</strong>: su explicación llegará pronto.
    {:else}
      Toca una carta para ver de qué va.
    {/if}
  </p>
  <button class="btn" type="button" onclick={shuffle}><Icon name="shuffle" /> Barajar</button>
</div>

<style>
  .scatter-card {
    display: block;
    width: 100%;
    aspect-ratio: 3 / 4;
    padding: 0;
    border: 0;
    background: none;
    cursor: pointer;
    perspective: 700px;
    container-type: inline-size;
    -webkit-tap-highlight-color: transparent;
  }
  .scatter-card:focus-visible { outline: 3px solid color-mix(in srgb, var(--green) 55%, transparent); outline-offset: 4px; border-radius: 14px; }
  .card-tilt, .card-flip { position: relative; display: block; width: 100%; height: 100%; transform-style: preserve-3d; }
  .card-flip { transition: transform .6s var(--ease-out); }
  .open .card-flip { transform: rotateY(180deg); }
  .card-face {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    border: 3px solid #fffefa;
    border-radius: 12px;
    box-shadow: var(--card-shadow);
    backface-visibility: hidden;
  }
  .card-back {
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 6px;
    padding: 10%;
    background: radial-gradient(120% 90% at 70% 80%, #2c5a43 0%, transparent 60%), var(--table);
    color: var(--table-ink);
    text-align: center;
    transform: rotateY(180deg);
  }
  .card-back small { color: var(--gold); font-size: clamp(.55rem, 9cqi, .75rem); font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
  .card-back strong { font: 600 clamp(.75rem, 15cqi, 1.25rem)/1.1 var(--font-display); overflow-wrap: anywhere; }

  .table-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px 24px;
    width: min(100% - 32px, 920px);
    margin: 26px auto 0;
  }
  .table-caption { min-height: 3.2em; max-width: 44rem; margin: 0; color: var(--muted); font-size: 1rem; line-height: 1.6; text-align: left; }
  .table-caption strong { color: var(--ink); }
  .table-caption a { color: var(--green); font-weight: 700; white-space: nowrap; }
  .table-foot .btn { flex: none; }

  @media (max-width: 740px) {
    .table-foot { flex-direction: column; align-items: stretch; }
  }
  @media (prefers-reduced-motion: reduce) {
    .card-flip { transition: none; }
  }
</style>
