<script lang="ts">
  import { untrack } from 'svelte';
  import { coverUrl, findInLibrary } from '../content/library';
  import { loadGlobalRanking } from '../data/ranking';
  import { playGroupKey } from '../domain/groups';
  import { bayesianRanking, ratingsByGame, type RankRow } from '../domain/ranking';
  import { formatDecimal } from '../domain/text';
  import { deal } from '../motion';
  import { app } from '../stores/app.svelte';

  type View = 'mine' | 'group' | 'global';
  const VIEWS: [View, string][] = [['mine', 'Mis notas'], ['group', 'Por grupo'], ['global', 'Global']];

  let view = $state<View>('mine');
  let groupKey = $state('');
  /** undefined: not loaded yet; null: the database function isn't there yet. */
  let global = $state<RankRow[] | null | undefined>(undefined);
  let status = $state('');

  $effect(() => {
    if (!groupKey && app.groups.length) groupKey = app.groupKey(app.groups[0]);
  });
  $effect(() => {
    if (view === 'global' && global === undefined && app.user) untrack(loadGlobal);
  });

  async function loadGlobal() {
    try {
      global = await loadGlobalRanking();
    } catch (error) {
      status = (error as Error).message;
      global = [];
    }
  }

  const rows = $derived.by(() => {
    if (view === 'mine') return ratingsByGame(app.plays, player => player.user_id === app.user?.id);
    if (view === 'group') return ratingsByGame(app.plays.filter(play => playGroupKey(play) === groupKey));
    return global ?? [];
  });
  const ranked = $derived(bayesianRanking(rows));
  const medal = (i: number) => ['🥇', '🥈', '🥉'][i] ?? String(i + 1);
  const ratings = (n: number) => `${n} ${n === 1 ? 'nota' : 'notas'}`;

  const empty = $derived(
    view === 'mine' ? 'Aún no has puntuado ninguna partida. Ponle nota al registrarla y aparecerá aquí.'
    : view === 'group' ? (app.groups.length ? 'Este grupo todavía no tiene partidas con nota.' : 'Crea un grupo en Comunidad para ver su ranking.')
    : global === null ? 'El ranking global aún no está activado en el servidor.'
    : global === undefined ? 'Cargando…'
    : 'Todavía no hay juegos valorados por 3 personas o más.');
</script>

<section class="panel active">
  <div class="sectionhead">
    <div><h2>Ranking</h2><p>Los juegos mejor valorados: los tuyos, los de cada grupo y los de toda la comunidad.</p></div>
  </div>

  {#if !app.user}
    <div class="empty">Inicia sesión para ver los rankings de tus partidas.</div>
  {:else}
    <div class="ranking-views" role="group" aria-label="Qué ranking ver">
      {#each VIEWS as [value, label] (value)}
        <button type="button" class="type-chip" aria-pressed={view === value} onclick={() => (view = value)}>{label}</button>
      {/each}
      {#if view === 'group' && app.groups.length}
        <select aria-label="Grupo" bind:value={groupKey}>
          {#each app.groups as group (app.groupKey(group))}<option value={app.groupKey(group)}>{group.name}</option>{/each}
        </select>
      {/if}
    </div>
    <p class="notice">
      {#if view === 'global'}Notas de todas las cuentas, solo de juegos valorados por 3 personas o más y sin decir quién puso cada una.{:else}Ordenado por media bayesiana: un juego necesita varias notas buenas para subir.{/if}
    </p>
    <p class="notice" role="status">{status}</p>

    {#if ranked.length}
      {#key view + groupKey + ranked.length}
        <ol class="ranking-list" use:deal={{ limit: 12 }}>
          {#each ranked as row, i (row.name)}
            {@const entry = findInLibrary(row.name)}
            <li class="ranking-row" class:podium={i < 3}>
              <span class="rank">{medal(i)}</span>
              {#if entry}<img class="rank-cover" src={coverUrl(entry)} alt="" loading="lazy" />{:else}<span class="rank-cover rank-cover-empty" aria-hidden="true">🎲</span>{/if}
              <div class="rank-info">
                <strong>{row.name}</strong>
                <span>{ratings(row.count)}{view !== 'mine' ? ` · ${row.people} ${row.people === 1 ? 'persona' : 'personas'}` : ''}</span>
                <span class="rank-bar" aria-hidden="true"><span style:width="{row.score * 10}%"></span></span>
              </div>
              <span class="rank-score" title="Media real: {formatDecimal(row.average)}">★ {formatDecimal(row.score)}</span>
            </li>
          {/each}
        </ol>
      {/key}
    {:else}
      <div class="empty">{empty}</div>
    {/if}
  {/if}
</section>
