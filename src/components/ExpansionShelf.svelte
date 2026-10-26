<script lang="ts">
  import { coverUrl, findInLibrary } from '../content/library';
  import { proposeGame } from '../data/wishlist';
  import { addExpansion, coverOf, expansionsOf, toggleExpansion, type ExpansionView } from '../domain/expansions';
  import type { Game } from '../domain/types';
  import { gsap, prefersReducedMotion } from '../motion';
  import { tap } from '../platform/native';
  import { app } from '../stores/app.svelte';
  import Icon from './Icon.svelte';

  /**
   * A game's expansions inside its sheet: the ones you own in colour, the rest in black and
   * white. Tap one to say you have it (or not); the ones you don't have can go to «Por comprar».
   */
  let { game, readonly = false }: { game: Game; readonly?: boolean } = $props();

  const views = $derived(expansionsOf(game));
  const baseCover = $derived(findInLibrary(game.name));
  let typed = $state('');
  let status = $state('');
  let proposing = $state('');

  function toggle(view: ExpansionView, button: HTMLElement) {
    if (readonly) return;
    app.upsertGame(toggleExpansion(game, view.name));
    tap();
    // Colour comes in (or drains out) with a small hop.
    if (!prefersReducedMotion()) gsap.fromTo(button, { scale: 0.92 }, { scale: 1, duration: 0.45, ease: 'back.out(3)' });
  }

  function add(event: SubmitEvent) {
    event.preventDefault();
    const updated = addExpansion(game, typed);
    if (!updated) return void (status = typed.trim() ? 'Esa expansión ya está.' : 'Escribe el nombre de la expansión.');
    app.upsertGame(updated);
    typed = '';
    status = '';
  }

  async function propose(view: ExpansionView) {
    if (!app.user) return;
    proposing = view.name;
    try {
      await proposeGame({
        user_id: app.user.id, title: `${game.name}: ${view.name}`, url: '', description: `Expansión de ${game.name}.`,
        price: null, publisher: null, players: game.players || null, duration: game.duration ? String(game.duration) : null, notes: null,
      });
      await app.reloadWishlist();
      status = `«${view.name}» está ya en Por comprar.`;
    } catch (error) {
      status = 'No se pudo proponer: ' + (error as Error).message;
    } finally {
      proposing = '';
    }
  }
</script>

{#if views.length || !readonly}
  <section class="expansions" aria-labelledby="expansionsTitle">
    <h3 id="expansionsTitle"><Icon name="layers" /> Expansiones</h3>
    {#if views.length}
      <ul class="expansion-row">
        {#each views as view (view.name)}
          <li class="expansion" class:owned={view.owned}>
            <button
              type="button"
              class="expansion-card"
              aria-pressed={view.owned}
              aria-label="{view.name}: {view.owned ? 'la tienes' : 'no la tienes'}"
              disabled={readonly}
              onclick={event => toggle(view, event.currentTarget)}
            >
              {#if view.slug}
                <img src={coverOf(view.slug)} alt="" loading="lazy" />
              {:else if baseCover}
                <img src={coverUrl(baseCover)} alt="" loading="lazy" /><span class="ribbon">Expansión</span>
              {:else}
                <span class="expansion-blank"><Icon name="layers" size="2rem" /></span>
              {/if}
              {#if view.owned}<span class="owned-mark" aria-hidden="true">✓</span>{/if}
            </button>
            <span class="expansion-name">{view.name}</span>
            {#if !view.owned && !readonly && app.user}
              <button type="button" class="linkbutton expansion-propose" disabled={proposing === view.name} onclick={() => propose(view)}>
                <Icon name="cart" /> Proponer
              </button>
            {/if}
          </li>
        {/each}
      </ul>
      {#if !readonly}<p class="expansion-hint">Toca una para marcar si la tienes.</p>{/if}
    {/if}
    {#if !readonly}
      <form class="expansion-add" onsubmit={add}>
        <label class="visually-hidden" for="expansionName">Añadir otra expansión</label>
        <input id="expansionName" maxlength="60" placeholder="Añadir otra expansión…" bind:value={typed} />
        <button type="submit" class="btn secondary">Añadir</button>
      </form>
    {/if}
    <p class="notice" role="status">{status}</p>
  </section>
{/if}

<style>
  .expansions { margin-top: 18px; }
  h3 { display: flex; align-items: center; gap: 6px; margin: 0 0 10px; font-size: 1rem; }
  h3 :global(.icon) { color: var(--green); }
  .expansion-row { display: grid; grid-auto-flow: column; grid-auto-columns: 96px; gap: 12px; margin: 0; padding: 4px 2px 8px; overflow-x: auto; list-style: none; scroll-snap-type: x proximity; }
  .expansion { display: grid; align-content: start; gap: 5px; justify-items: start; scroll-snap-align: start; }
  .expansion-card { position: relative; width: 96px; aspect-ratio: 3 / 4; padding: 0; overflow: hidden; border: 2px solid var(--line); border-radius: 12px; background: var(--surface); cursor: pointer; }
  .expansion-card:disabled { cursor: default; }
  .expansion-card img, .expansion-blank { display: grid; place-items: center; width: 100%; height: 100%; object-fit: cover; }
  .expansion-blank { color: var(--muted); }
  /* Not owned: in black and white. Owned: in colour, with a tick. */
  .expansion-card img { filter: grayscale(1) contrast(.9) brightness(1.05); opacity: .62; transition: filter .45s var(--ease-out), opacity .45s var(--ease-out); }
  .owned .expansion-card { border-color: var(--green); box-shadow: var(--card-shadow); }
  .owned .expansion-card img { filter: none; opacity: 1; }
  .owned-mark { position: absolute; top: 5px; right: 5px; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: var(--green); color: #fff; font-size: .75rem; font-weight: 800; }
  .ribbon { position: absolute; left: 0; right: 0; bottom: 10px; padding: 2px 0; background: #1d2923cc; color: #fffefa; font-size: .62rem; font-weight: 800; letter-spacing: .06em; text-align: center; text-transform: uppercase; }
  .expansion-name { font-size: .78rem; font-weight: 700; line-height: 1.25; }
  .expansion:not(.owned) .expansion-name { color: var(--muted); }
  .expansion-propose { display: inline-flex; gap: 4px; align-items: center; padding: 0; border: 0; background: none; color: var(--green); font-size: .74rem; font-weight: 700; cursor: pointer; }
  .expansion-hint { margin: 2px 0 10px; color: var(--muted); font-size: .78rem; }
  .expansion-add { display: flex; gap: 8px; }
  .expansion-add input { flex: 1; min-width: 0; min-height: 40px; padding: 8px 12px; border: 1px solid var(--line); border-radius: 10px; background: var(--field); color: var(--ink); }
  @media (prefers-reduced-motion: reduce) { .expansion-card img { transition: none; } }
</style>
