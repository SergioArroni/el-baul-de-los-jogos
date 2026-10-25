<script lang="ts">
  import { catalogDraft, searchCatalog, type CatalogHit, type GameDraft } from '../data/catalog';
  import { app } from '../stores/app.svelte';

  /** Suggestions from the BGG catalog under a name field; picking one fills the form. */
  let { query, onpick }: { query: string; onpick: (draft: GameDraft) => void } = $props();

  let hits = $state<CatalogHit[]>([]);
  let status = $state('');
  let picked = '';
  let timer: ReturnType<typeof setTimeout> | undefined;

  $effect(() => {
    const text = query.trim();
    clearTimeout(timer);
    if (!app.user || text.length < 3 || text === picked) return void (hits = []);
    timer = setTimeout(async () => {
      const found = await searchCatalog(text);
      if (text === query.trim()) hits = found;
    }, 300);
    return () => clearTimeout(timer);
  });

  async function pick(hit: CatalogHit) {
    status = 'Rellenando la ficha…';
    const draft = await catalogDraft(hit.bggId);
    status = draft ? '' : 'No se pudo traer la ficha de ese juego. Rellénala a mano.';
    hits = [];
    if (draft) {
      picked = draft.name;
      onpick(draft);
    }
  }
</script>

{#if hits.length}
  <div class="catalog-suggest">
    <ul role="listbox" aria-label="Juegos del catálogo">
      {#each hits as hit (hit.bggId)}
        <li><button type="button" role="option" aria-selected="false" onclick={() => pick(hit)}>{hit.name}{#if hit.year}<span>{hit.year}</span>{/if}</button></li>
      {/each}
    </ul>
    <a class="bgg-credit" href="https://boardgamegeek.com" target="_blank" rel="noopener noreferrer">Datos de BoardGameGeek · Powered by BGG</a>
  </div>
{/if}
{#if status}<small class="catalog-status" role="status">{status}</small>{/if}
