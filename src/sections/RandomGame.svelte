<script lang="ts">
  import { tick } from 'svelte';
  import GameCover from '../components/GameCover.svelte';
  import { drawGame, randomCandidates } from '../domain/random';
  import type { Game } from '../domain/types';
  import { gsap, prefersReducedMotion } from '../motion';
  import { app } from '../stores/app.svelte';

  let { onopen }: { onopen: (game: Game) => void } = $props();

  let place = $state('');
  let players = $state<number | null>(null);
  let maxMinutes = $state(0);
  let picked = $state<Game | null>(null);
  let status = $state('');
  let stage: HTMLElement;

  const pool = $derived(randomCandidates(app.games, { place, players: Number(players) || 0, maxMinutes: Number(maxMinutes) || 0 }));
  // Like a shuffled deck: no repeats until every game that fits has come out.
  const seen = new Set<string>();
  $effect(() => {
    void pool;
    seen.clear();
  });

  async function roll() {
    picked = drawGame(pool, seen);
    status = picked ? '' : 'No hay juegos que encajen. Prueba con otro lugar o con más tiempo.';
    await tick();
    const card = stage?.querySelector('.cover');
    if (card && !prefersReducedMotion()) {
      gsap.fromTo(card, { rotationY: 100, scale: 0.8, transformPerspective: 900 }, { rotationY: 0, scale: 1, duration: 0.6, ease: 'back.out(1.6)', clearProps: 'transform' });
    }
  }
</script>

<div class="card random-card">
  <div class="random-head"><h3>🎲 Juego al azar</h3><p>¿No os decidís? Que decida el dado.</p></div>
  <div class="formgrid">
    <div class="field">
      <label for="randomPlace">¿Dónde estáis?</label>
      <select id="randomPlace" bind:value={place}>
        <option value="">En cualquier sitio</option>
        {#each app.places as option (option.id)}<option value={option.name}>{option.name}</option>{/each}
      </select>
    </div>
    <div class="field"><label for="randomPlayers">¿Cuántos sois?</label><input id="randomPlayers" type="number" min="0" max="30" placeholder="Da igual" bind:value={players} /></div>
    <div class="field">
      <label for="randomTime">Tiempo máximo</label>
      <select id="randomTime" bind:value={maxMinutes}>
        <option value={0}>Sin límite</option>
        {#each [20, 30, 45, 60, 90, 120] as minutes (minutes)}<option value={minutes}>{minutes} min</option>{/each}
      </select>
    </div>
  </div>
  <div class="random-stage" bind:this={stage}>
    {#if picked}{#key picked.id}<div class="random-pick"><GameCover game={picked} {onopen} /></div>{/key}{/if}
  </div>
  <p class="notice" role="status">{status}</p>
  <div class="random-actions">
    <small>{pool.length} {pool.length === 1 ? 'juego encaja' : 'juegos encajan'}</small>
    <button class="btn" type="button" onclick={roll} disabled={!pool.length}>{picked ? '🎲 Otro' : '🎲 Tirar el dado'}</button>
  </div>
</div>
