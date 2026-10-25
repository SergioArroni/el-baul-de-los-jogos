<script lang="ts">
  import { countUp } from '../motion';
  import Avatar from '../components/Avatar.svelte';
  import { ratePlay } from '../data/plays';
  import { tap } from '../platform/native';
  import { playGroupKey } from '../domain/groups';
  import { playStats } from '../domain/stats';
  import { formatDate, formatDecimal, nameKey } from '../domain/text';
  import type { Play } from '../domain/types';
  import { app } from '../stores/app.svelte';

  let { onplay }: { onplay: (options: { play?: Play; group?: string }) => void } = $props();

  let status = $state('');

  /** One entry per group: the user's groups plus any group seen in plays (e.g. a play you were invited to). */
  const entries = $derived.by(() => {
    const map = new Map<string, string>();
    for (const group of app.groups) map.set(app.groupKey(group), group.name);
    for (const play of app.plays) {
      const key = playGroupKey(play);
      if (!map.has(key)) map.set(key, key ? play.group_name ?? 'Otro grupo' : 'Sin grupo');
    }
    return [...map].map(([key, name]) => ({ key, name, plays: app.plays.filter(p => playGroupKey(p) === key) }));
  });
  const view = $derived(app.playView === null ? null : entries.find(e => e.key === app.playView) ?? { key: app.playView, name: 'Sin grupo', plays: [] });
  const stats = $derived(view ? playStats(view.plays) : null);
  const unplayed = $derived(stats ? app.games.filter(g => !stats.games.has(nameKey(g.name))) : []);
  const me = $derived(app.user?.id);
  const who = (p: { name: string; user_id?: string | null; userId?: string | null }) => ((p.user_id ?? p.userId) === me ? 'Yo' : p.name);

  function sortedPlayers(play: Play) {
    return [...play.play_players].sort((a, b) => Number(b.winner) - Number(a.winner) || (b.points ?? -Infinity) - (a.points ?? -Infinity));
  }

  function average(play: Play): number | null {
    const rated = play.play_players.filter(x => x.rating);
    return rated.length ? rated.reduce((sum, x) => sum + (x.rating ?? 0), 0) / rated.length : null;
  }

  async function rate(play: Play, value: string) {
    status = '';
    try {
      await ratePlay(play.id, value ? Number(value) : null);
      tap();
      await app.reloadPlays();
    } catch (error) {
      status = 'No se pudo guardar la nota: ' + (error as Error).message;
    }
  }
</script>

<section class="panel active">
  <div class="sectionhead">
    <div><h2>Partidas</h2><p>Apunta a qué jugáis en cada grupo, quién gana y qué nota le da cada uno.</p></div>
    {#if app.user && !app.playsMissing}<button class="btn" onclick={() => onplay({ group: app.playView ?? '' })}>＋ Registrar partida</button>{/if}
  </div>
  <p class="notice" role="status">{status}</p>

  {#if !app.user}
    <div class="empty">Inicia sesión para registrar partidas.</div>
  {:else if app.playsMissing}
    <div class="empty">Para activar las partidas, ejecuta <strong>sql/community-plays.sql</strong> en el SQL Editor de Supabase.</div>
  {:else if !view}
    {#if entries.length}
      <div class="grid">
        {#each entries as entry (entry.key)}
          {@const last = entry.plays[0]}
          {@const top = playStats(entry.plays).mostPlayed}
          <article class="groupcard">
            <h3>👥 {entry.name}</h3>
            <p>{entry.plays.length} {entry.plays.length === 1 ? 'partida' : 'partidas'}{#if last} · Última: {last.game_name} ({formatDate(last.played_on)}){/if}</p>
            {#if top && top.count > 1}<div class="tags"><span class="tag green">Más jugado: {top.name}</span></div>{/if}
            <div class="actions"><button class="btn secondary" onclick={() => (app.playView = entry.key)}>{entry.plays.length ? 'Ver partidas' : 'Abrir grupo'}</button></div>
          </article>
        {/each}
      </div>
    {:else}
      <div class="empty">Crea un grupo en Comunidad o registra tu primera partida.</div>
    {/if}
  {:else}
    <div class="play-view-head"><button class="btn ghost small" onclick={() => (app.playView = null)}>← Grupos</button><h3>{view.name}</h3></div>
    {#if view.plays.length && stats}
      <div class="stats-grid">
        <div class="stat-tile"><small>Partidas</small><strong use:countUp={view.plays.length}>{view.plays.length}</strong></div>
        {#if stats.mostPlayed}
          <div class="stat-tile"><small>Más jugado</small><strong>{stats.mostPlayed.name}</strong><span class="sub">{stats.mostPlayed.count} {stats.mostPlayed.count === 1 ? 'vez' : 'veces'}</span></div>
        {/if}
        <div class="stat-tile">
          <small>Quién gana más</small>
          {#if stats.winners.length}
            <ol>{#each stats.winners as winner (winner.userId ?? winner.name)}<li><Avatar userId={winner.userId} name={winner.name} size="tiny" /><span>{who(winner)}</span><span>{winner.count} {winner.count === 1 ? 'victoria' : 'victorias'}</span></li>{/each}</ol>
          {:else}<strong>Sin ganadores apuntados</strong>{/if}
        </div>
        <div class="stat-tile">
          <small>Mejor valorados</small>
          {#if stats.bestRated.length}
            <ol>{#each stats.bestRated as game (game.name)}<li><span>{game.name}</span><span>★ {formatDecimal(game.avg)}</span></li>{/each}</ol>
          {:else}<strong>Aún sin notas</strong>{/if}
        </div>
        {#if unplayed.length}
          <div class="stat-tile wide">
            <small>Sin estrenar en este grupo</small><strong>{unplayed.length} {unplayed.length === 1 ? 'juego' : 'juegos'}</strong>
            <div class="tags">{#each unplayed.slice(0, 6) as game (game.id)}<span class="tag">{game.name}</span>{/each}{#if unplayed.length > 6}<span class="tag">y {unplayed.length - 6} más</span>{/if}</div>
          </div>
        {/if}
      </div>
      <div class="grid">
        {#each view.plays as play (play.id)}
          {@const mine = play.owner_id === me}
          {@const myRow = play.play_players.find(x => x.user_id === me)}
          {@const avg = average(play)}
          <article class="card">
            <div class="cardtop"><div class="emoji">🎲</div><div><h3>{play.game_name}</h3><div class="sub">{formatDate(play.played_on)}{play.place ? ' · 📍 ' + play.place : ''}</div></div></div>
            <ul class="play-players">
              {#each sortedPlayers(play) as player (player.id)}
                <li>
                  <Avatar userId={player.user_id} name={player.name} size="tiny" />
                  <span class="play-name">{who(player)}{player.winner ? ' 🏆' : ''}</span>
                  {#if player.points != null}<span class="play-points">{Number(player.points).toLocaleString('es-ES')} pts</span>{/if}
                  {#if player.rating}<span class="play-rating">★ {player.rating}</span>{/if}
                </li>
              {/each}
            </ul>
            {#if avg != null}<div class="tags"><span class="tag green">Nota media {formatDecimal(avg)}/10</span></div>{/if}
            {#if play.notes}<p class="details">{play.notes}</p>{/if}
            {#if myRow || mine}
              <div class="cardfoot">
                {#if myRow}
                  <label class="rate-field">Tu nota
                    <select value={myRow.rating ?? ''} onchange={e => rate(play, e.currentTarget.value)}>
                      <option value="">–</option>
                      {#each Array.from({ length: 10 }, (_, i) => i + 1) as n (n)}<option value={n}>{n}</option>{/each}
                    </select>
                  </label>
                {/if}
                {#if mine}<button class="btn secondary" onclick={() => onplay({ play })}>Editar</button>{/if}
              </div>
            {/if}
          </article>
        {/each}
      </div>
    {:else}
      <div class="empty">Todavía no hay partidas en este grupo. Pulsa «Registrar partida» para apuntar la primera.</div>
    {/if}
  {/if}
</section>
