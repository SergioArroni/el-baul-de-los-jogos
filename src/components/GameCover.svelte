<script lang="ts">
  import { coverUrl, findInLibrary } from '../content/library';
  import { gameArt } from '../domain/art';
  import { averageRating } from '../domain/stats';
  import { formatDecimal, nameKey } from '../domain/text';
  import type { Game } from '../domain/types';
  import { rememberOrigin } from '../motion';
  import { app } from '../stores/app.svelte';

  let { game, onopen }: { game: Game; onopen: (game: Game) => void } = $props();

  const art = $derived(gameArt(game));
  const entry = $derived(findInLibrary(game.name));
  const rating = $derived(averageRating(app.stats.games.get(nameKey(game.name))));
</script>

<button type="button" class="cover pattern-{art.pattern}" style:--c1={art.from} style:--c2={art.to} onclick={event => { rememberOrigin(event.currentTarget); onopen(game); }}>
  {#if entry}<img class="cover-art" src={coverUrl(entry)} alt="" loading="lazy" />{/if}
  <span class="cover-meta">
    <span>👥 {game.players || '?'}</span>
    {#if game.duration}<span>⏱ {game.duration}′</span>{/if}
  </span>
  {#if !entry}<span class="cover-emoji" aria-hidden="true">{art.emoji}</span>{/if}
  <span>
    <span class="cover-title">{game.name}</span>
    <span class="cover-foot">
      <span class="cover-weight" title="Dureza {game.weight ?? '?'}/5">
        {#each [1, 2, 3, 4, 5] as dot (dot)}<i class:on={dot <= (game.weight ?? 0)}></i>{/each}
      </span>
      {#if rating != null}<span class="cover-rating">★ {formatDecimal(rating)}</span>{/if}
    </span>
  </span>
</button>
