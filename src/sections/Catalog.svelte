<script lang="ts">
  import { untrack } from 'svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import GameCover from '../components/GameCover.svelte';
  import Icon from '../components/Icon.svelte';
  import { typeIcon } from '../domain/art';
  import { mergeCandidates, mergeInto, type MergeCandidate } from '../domain/expansions';
  import { movePlaysToBase } from '../data/plays';
  import { buildShelves, byName, filterGames, noFilters, topTypes, type CatalogFilters } from '../domain/catalog';
  import type { Game } from '../domain/types';
  import { deal, flipList } from '../motion';
  import { app, type Tab } from '../stores/app.svelte';
  import { askConfirm } from '../stores/confirm.svelte';
  import GameDetail from './GameDetail.svelte';
  import GameForm from './GameForm.svelte';

  let { navigate, onplay }: { navigate: (tab: Tab) => void; onplay: (gameName: string) => void } = $props();

  let filters = $state<CatalogFilters>({ search: '', type: '', players: 0, place: '' });
  let detail = $state<Game | null>(null);
  let editing = $state<{ open: boolean; game?: Game }>({ open: false });

  const filtering = $derived(!noFilters(filters));
  const results = $derived(filtering ? filterGames(app.games, filters) : []);
  const shelves = $derived(filtering ? [] : buildShelves(app.games, app.stats.games, app.plays.length > 0));
  const types = $derived.by(() => {
    const list = topTypes(app.games);
    return filters.type && !list.includes(filters.type) ? [...list, filters.type] : list;
  });

  // When the filters change, the cards slide to their new places instead of jumping.
  let resultsGrid = $state<HTMLElement>();
  const flip = flipList(() => resultsGrid, '.cover');
  $effect.pre(() => {
    void results;
    untrack(() => flip.capture());
  });
  $effect(() => {
    void results;
    flip.play();
  });

  const clearFilters = () => (filters = { search: '', type: '', players: 0, place: '' });

  // Expansions saved as games of their own whose base game is also here: offer to move them in.
  const merges = $derived(mergeCandidates(app.games));
  let mergeStatus = $state('');

  async function merge({ expansion, base, name }: MergeCandidate) {
    const ok = await askConfirm({
      title: `¿Meter «${expansion.name}» dentro de ${base.name}?`,
      text: `Dejará de salir como juego aparte y aparecerá en color entre las expansiones de ${base.name}. Tus partidas de «${expansion.name}» pasan a ser de ${base.name} jugando con ${name}.`,
      confirmLabel: 'Meterla dentro',
    });
    if (!ok) return;
    app.upsertGame(mergeInto(base, expansion, name));
    app.deleteGame(expansion.id);
    mergeStatus = `«${name}» está ahora dentro de ${base.name}.`;
    if (app.user && !app.playsMissing) {
      try {
        await movePlaysToBase(expansion.name, base.name, name, app.user.id);
        await app.reloadPlays();
      } catch (error) {
        mergeStatus = `Hecho, pero sus partidas siguen con el nombre antiguo: ${(error as Error).message}`;
      }
    }
  }

  async function remove(game: Game) {
    detail = null;
    const ok = await askConfirm({ title: `¿Eliminar «${game.name}»?`, text: 'Se quitará de tu colección.', confirmLabel: 'Eliminar', danger: true });
    if (ok) app.deleteGame(game.id);
  }
</script>

<section class="panel active">
  <div class="sectionhead">
    <div><h1>Tu colección</h1><p>Busca un juego por nombre, tipo, jugadores o lugar.</p></div>
    <button class="btn" onclick={() => (editing = { open: true })}><span aria-hidden="true">＋</span> Añadir juego</button>
  </div>

  <div class="overview">
    <div class="overview-item"><strong>{app.games.length}</strong><span>juegos</span></div>
    <span class="overview-divider"></span>
    <div class="overview-item"><strong>{app.groups.length}</strong><span>grupos</span></div>
    <span class="overview-divider"></span>
    <div class="overview-item"><strong>{app.places.length}</strong><span>lugares</span></div>
    <span class="overview-spacer"></span>
    <button class="btn ghost small" type="button" onclick={() => navigate('places')}>Gestionar lugares</button>
  </div>

  <div class="toolbar catalog-tools">
    <label class="searchbox"><span aria-hidden="true">⌕</span>
      <input class="search" type="search" placeholder="Buscar juego, mecánica o nota…" aria-label="Buscar en la colección" bind:value={filters.search} />
    </label>
    <select aria-label="Filtrar número de jugadores" bind:value={filters.players}>
      <option value={0}>Cualquier grupo</option><option value={2}>Funciona a 2</option><option value={4}>4 o más</option>
      <option value={6}>6 o más</option><option value={8}>8 o más</option>
    </select>
    <select aria-label="Filtrar lugar" bind:value={filters.place}>
      <option value="">Todos los lugares</option>
      {#each app.places as place (place.id)}<option value={place.name}>{place.name}</option>{/each}
    </select>
  </div>

  <div class="type-chips" role="group" aria-label="Filtrar por estilo">
    <button type="button" class="type-chip" aria-pressed={!filters.type} onclick={() => (filters.type = '')}>Todos</button>
    {#each types as type (type)}
      <button type="button" class="type-chip" aria-pressed={filters.type === type} onclick={() => (filters.type = filters.type === type ? '' : type)}>
        {#if typeIcon(type)}<Icon name={typeIcon(type)!} />{/if} {type}
      </button>
    {/each}
  </div>

  {#if merges.length && !filtering}
    <div class="card merge-offer">
      <h2><Icon name="layers" /> Expansiones guardadas como juego aparte</h2>
      <p>Ahora las expansiones van dentro de su juego. Puedes moverlas, con sus partidas:</p>
      <ul>
        {#each merges as candidate (candidate.expansion.id)}
          <li>
            <span><strong>{candidate.expansion.name}</strong> → dentro de {candidate.base.name}</span>
            <button type="button" class="btn secondary small" onclick={() => merge(candidate)}>Meterla dentro</button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}
  {#if mergeStatus}<p class="notice" role="status">{mergeStatus}</p>{/if}

  {#if !app.games.length}
    <EmptyState>Tu baúl está vacío. Pulsa «Añadir juego» para guardar el primero.</EmptyState>
  {:else if filtering}
    <section class="shelf">
      <div class="shelf-head">
        <h2>{results.length} {results.length === 1 ? 'juego' : 'juegos'}</h2>
        <button class="btn ghost small" type="button" onclick={clearFilters}>Quitar filtros</button>
      </div>
      {#if results.length}
        <div class="cover-grid" bind:this={resultsGrid}>{#each results as game (game.id)}<GameCover {game} onopen={g => (detail = g)} />{/each}</div>
      {:else}
        <EmptyState>No hay juegos con esos filtros. Prueba a cambiar la búsqueda.</EmptyState>
      {/if}
    </section>
  {:else}
    {#each shelves as shelf (shelf.title)}
      <section class="shelf">
        <div class="shelf-head"><h2><Icon name={shelf.icon} /> {shelf.title}</h2><span>{shelf.games.length}</span></div>
        <div class="shelf-row" use:deal={{ once: "shelf:" + shelf.title, limit: 8 }}>{#each shelf.games as game (game.id)}<GameCover {game} onopen={g => (detail = g)} />{/each}</div>
      </section>
    {/each}
    <section class="shelf">
      <div class="shelf-head"><h2>Toda la colección</h2><span>{app.games.length}</span></div>
      <div class="cover-grid" use:deal={{ once: "catalog" }}>{#each [...app.games].sort(byName) as game (game.id)}<GameCover {game} onopen={g => (detail = g)} />{/each}</div>
    </section>
  {/if}

  <p class="notice">
    {app.user ? 'Colección sincronizada con tu cuenta en todos tus dispositivos.' : 'Los datos se guardan en este navegador. Inicia sesión para sincronizarlos con tus otros dispositivos.'}
  </p>
</section>

<GameDetail
  game={detail}
  onclose={() => (detail = null)}
  onedit={game => { detail = null; editing = { open: true, game }; }}
  ondelete={remove}
  onplay={game => { detail = null; onplay(game.name); }}
/>
<GameForm open={editing.open} game={editing.game} onclose={() => (editing = { open: false })} />
