<script lang="ts">
  import { groupMembers, playGroupKey } from '../domain/groups';
  import { recommend, type Recommendation } from '../domain/recommend';
  import { playStats } from '../domain/stats';
  import type { Group } from '../domain/types';
  import { app } from '../stores/app.svelte';
  import RandomGame from './RandomGame.svelte';

  let { onedit }: { onedit: (gameId: string) => void } = $props();

  const moods = ['Fiesta', 'Cooperativo', 'Estrategia', 'Dos jugadores', 'Roles ocultos', 'Familiar', 'Humor', 'Aventura', 'Cartas'];
  let players = $state(4);
  let groupId = $state('');
  let mood = $state('');
  let weight = $state(0);
  let duration = $state(0);
  let place = $state('');
  let results = $state<{ list: Recommendation[]; players: number; group?: Group } | null>(null);

  const group = $derived(app.groups.find(g => g.id === groupId));
  const members = $derived(group ? groupMembers(group, app.friends) : []);

  /** Choosing a group fills in how many you are (its members plus you). */
  function pickGroup() {
    const count = members.length ? members.length + 1 : group?.size;
    if (count) players = count;
  }

  function find() {
    const groupGames = group ? playStats(app.plays.filter(p => playGroupKey(p) === app.groupKey(group))).games : undefined;
    results = { list: recommend(app.games, { players, group, groupGames, mood, weight, duration, place }), players, group };
  }
</script>

<section class="panel active">
  <div class="sectionhead"><div><h2>¿Qué jugamos?</h2><p>Indica cuántos sois y qué os apetece; te sugeriré juegos de tu colección.</p></div></div>
  <RandomGame onopen={game => onedit(game.id)} />
  <div class="card" style="margin-top:15px">
    <div class="formgrid">
      <div class="field"><label for="recPlayers">¿Cuántas personas?</label><input id="recPlayers" type="number" min="1" max="30" bind:value={players} /></div>
      <div class="field">
        <label for="recGroup">Grupo</label>
        <select id="recGroup" value={groupId} onchange={e => { groupId = e.currentTarget.value; pickGroup(); }}>
          <option value="">Sin grupo concreto</option>
          {#each app.groups as g (app.groupKey(g))}<option value={g.id}>{g.name}</option>{/each}
        </select>
        {#if group}
          <small>{members.length ? members.map(m => m.name).join(', ') + ' y tú. ' : ''}Tendré en cuenta sus gustos, sus notas y lo que aún no habéis estrenado.</small>
        {/if}
      </div>
      <div class="field">
        <label for="recMood">Tipo de plan</label>
        <select id="recMood" bind:value={mood}><option value="">Cualquiera</option>{#each moods as m (m)}<option>{m}</option>{/each}</select>
      </div>
      <div class="field">
        <label for="recWeight">Nivel de complejidad</label>
        <select id="recWeight" bind:value={weight}>
          <option value={0}>Cualquiera</option>
          {#each ['Muy ligero', 'Ligero', 'Medio', 'Duro', 'Muy duro'] as label, i (label)}<option value={i + 1}>{label}</option>{/each}
        </select>
      </div>
      <div class="field">
        <label for="recDuration">Duración preferida</label>
        <select id="recDuration" bind:value={duration}>
          <option value={0}>Cualquiera</option><option value={30}>Hasta 30 min</option><option value={60}>Hasta 1 hora</option><option value={120}>Hasta 2 horas</option>
        </select>
      </div>
      <div class="field">
        <label for="recPlace">¿Dónde vais a jugar?</label>
        <select id="recPlace" bind:value={place}>
          <option value="">Cualquier lugar</option>
          {#each app.places as p (p.id)}<option value={p.name}>{p.name}</option>{/each}
        </select>
      </div>
    </div>
    <div class="formactions"><button class="btn" onclick={find}>Encontrar juegos</button></div>
  </div>

  {#if results}
    {#if results.list.length}
      <div class="reco">
        <h3>Mis sugerencias para {results.players} {results.players === 1 ? 'persona' : 'personas'}{results.group ? ' · ' + results.group.name : ''}</h3>
        <p class="details">Son sugerencias orientativas: revisa los jugadores máximos si aparece un dato pendiente de confirmar.</p>
        <div class="grid">
          {#each results.list as { game, groupNote } (game.id)}
            <article class="card">
              <div class="cardtop">
                <div class="emoji">{game.types.includes('Cooperativo') ? '🤝' : game.types.includes('Fiesta') ? '🎉' : '🎲'}</div>
                <div><h3>{game.name}</h3><div class="sub">{game.players} jugadores · {game.duration ?? '?'} min</div></div>
              </div>
              <div class="tags">{#each game.types as type (type)}<span class="tag">{type}</span>{/each}</div>
              {#if groupNote}<span class="reco-note">{groupNote}</span>{/if}
              <p class="details">📍 {game.locations.join(' · ') || 'Lugar por asignar'}</p>
              <button class="btn secondary" onclick={() => onedit(game.id)}>Ver / editar ficha</button>
            </article>
          {/each}
        </div>
      </div>
    {:else}
      <div class="empty">No he encontrado una combinación clara. Prueba con otro número o plan.</div>
    {/if}
  {/if}
</section>
