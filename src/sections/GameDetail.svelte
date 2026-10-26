<script lang="ts">
  import ExpansionShelf from '../components/ExpansionShelf.svelte';
  import Icon, { type IconName } from '../components/Icon.svelte';
  import Modal from '../components/Modal.svelte';
  import { coverUrl, findInLibrary } from '../content/library';
  import { gameArt } from '../domain/art';
  import { averageRating, realDuration } from '../domain/stats';
  import { formatDecimal, formatShortDate, nameKey } from '../domain/text';
  import type { Game } from '../domain/types';
  import { app } from '../stores/app.svelte';

  interface Props {
    game: Game | null;
    onclose: () => void;
    /** Someone else's game: only the details and how to play, no actions. */
    readonly?: boolean;
    onedit?: (game: Game) => void;
    ondelete?: (game: Game) => void;
    onplay?: (game: Game) => void;
  }

  let { game, onclose, readonly = false, onedit, ondelete, onplay }: Props = $props();

  // The saved version, so changes made from the sheet (its expansions) show at once.
  const current = $derived(game ? (app.games.find(g => g.id === game.id) ?? game) : null);
  const art = $derived(game ? gameArt(game) : null);
  const entry = $derived(game ? findInLibrary(game.name) : undefined);
  const rules = $derived(entry?.rules);
  const stat = $derived(game ? app.stats.games.get(nameKey(game.name)) : undefined);
  const rating = $derived(averageRating(stat));
  const realMinutes = $derived(game ? realDuration(app.plays, game.name) : null);
  const canPlay = $derived(!!app.user && !app.playsMissing);
  const facts = $derived(game ? [
    { icon: 'players', text: game.players || 'Jugadores por confirmar' },
    { icon: 'clock', text: game.duration ? `${game.duration} min` : 'Duración por confirmar' },
    { icon: 'pawn', text: game.weight ? `Dureza ${game.weight}/5` : 'Dureza por confirmar' },
    { icon: 'pin', text: game.locations.join(' · ') || 'Lugar por asignar' },
  ] satisfies { icon: IconName; text: string }[] : []);
</script>

<Modal open={!!game} title={game?.name ?? ''} {onclose} dialogClass="detail-dialog" labelId="detailTitle">
  {#snippet header()}
    <div class="detail-hero pattern-{art?.pattern}" style:--c1={art?.from} style:--c2={art?.to}>
      {#if entry}
        <img class="cover-art hero-blur" src={coverUrl(entry)} alt="" />
        <img class="hero-art" src={coverUrl(entry)} alt="" />
      {:else}
        <span class="cover-emoji" aria-hidden="true">{#if art}<Icon name={art.icon} size="1em" />{/if}</span>
      {/if}
      <button class="x" type="button" aria-label="Cerrar" onclick={onclose}>×</button>
    </div>
  {/snippet}
  {#if game}
    <div class="detail-body">
      <h2 id="detailTitle">{game.name}</h2>
      {#if realMinutes}<p class="real-time"><Icon name="clock" /> {game.duration ? `${game.duration} min en la caja · ` : ''}<strong>{realMinutes} min de verdad</strong></p>{/if}
      <div class="tags">
        {#each facts as fact (fact.icon)}<span class="tag"><Icon name={fact.icon} /> {fact.text}</span>{/each}
        {#each game.types as type (type)}<span class="tag green">{type}</span>{/each}
      </div>
      {#if game.notes}<p class="details">{game.notes}</p>{/if}
      {#if current}<ExpansionShelf game={current} {readonly} />{/if}
      {#if rules}
        <section class="how-to" aria-labelledby="howToTitle">
          <h3 id="howToTitle">Cómo se juega</h3>
          <p><strong>Objetivo.</strong> {rules.goal}</p>
          {#if rules.setup}<p><strong>Preparación.</strong> {rules.setup}</p>{/if}
          <p><strong>Cómo va la partida</strong></p>
          <ol>{#each rules.turn as step (step)}<li>{step}</li>{/each}</ol>
          <p><strong>Final.</strong> {rules.end}</p>
          {#if rules.tip}<p class="how-to-tip"><Icon name="bulb" /> {rules.tip}</p>{/if}
          {#if rules.caveat}<p class="notice">{rules.caveat}</p>{/if}
        </section>
      {:else if entry}
        <p class="notice">Aún no tenemos una explicación fiable de este juego: mejor mirar el reglamento de la caja.</p>
      {/if}
      {#if canPlay && !readonly}
        <div class="detail-stats">
          {#if stat}
            <div><strong>{stat.count}</strong><span>{stat.count === 1 ? 'partida' : 'partidas'}</span></div>
            <div><strong>{formatShortDate(stat.last)}</strong><span>última vez</span></div>
            <div><strong>{rating != null ? '★ ' + formatDecimal(rating) : '–'}</strong><span>nota media</span></div>
          {:else}
            <p class="notice">Aún no lo habéis jugado. ¡Estrenadlo!</p>
          {/if}
        </div>
      {/if}
    </div>
    {#if !readonly}
      <div class="formactions">
        <button type="button" class="btn ghost" onclick={() => ondelete?.(game)}>Eliminar</button>
        <button type="button" class="btn secondary" onclick={() => onedit?.(game)}>Editar</button>
        {#if canPlay}<button type="button" class="btn" onclick={() => onplay?.(game)}>Registrar partida</button>{/if}
      </div>
    {/if}
  {/if}
</Modal>
