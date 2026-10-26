<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import { coverUrl, findInLibrary } from '../content/library';
  import EmptyState from '../components/EmptyState.svelte';
  import GameCover from '../components/GameCover.svelte';
  import { loadSimilarTaste } from '../data/crowd';
  import { groupMembers, playGroupKey } from '../domain/groups';
  import { CROWD_LOVES, recommend, type CrowdPick, type Recommendation } from '../domain/recommend';
  import { playStats } from '../domain/stats';
  import { learnTaste } from '../domain/taste';
  import { formatDecimal, localToday, nameKey } from '../domain/text';
  import type { Game, Group } from '../domain/types';
  import { deal } from '../motion';
  import { app } from '../stores/app.svelte';
  import GameDetail from './GameDetail.svelte';
  import RandomGame from './RandomGame.svelte';

  let { onedit, onplay }: { onedit: (gameId: string) => void; onplay: (game: string) => void } = $props();

  /** The suggestion whose card is open (the same sheet as in the catalog). */
  let detail = $state<Game | null>(null);

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

  // Loaded once: what people with tastes like yours rated well (anonymous, from the server).
  let crowd: Promise<Map<string, CrowdPick> | null> | null = null;
  let outside = $state<CrowdPick[]>([]);

  async function find() {
    if (app.user) crowd ??= loadSimilarTaste().catch(() => null);
    const crowdPicks = (await crowd) ?? undefined;
    const owned = new Set(app.games.map(game => nameKey(game.name)));
    outside = crowdPicks ? [...crowdPicks.entries()].filter(([key, pick]) => !owned.has(key) && pick.predicted >= CROWD_LOVES).map(([, pick]) => pick).slice(0, 5) : [];
    const groupPlays = group ? app.plays.filter(p => playGroupKey(p) === app.groupKey(group)) : app.plays;
    const groupGames = group ? playStats(groupPlays).games : undefined;
    // Whose ratings teach the taste: the group's members with an account, or just you.
    const people = new Set([app.user?.id, ...members.map(member => member.userId)].filter((id): id is string => !!id));
    const taste = app.plays.length ? learnTaste(groupPlays, app.games, people.size ? people : null) : undefined;
    results = { list: recommend(app.games, { players, group, groupGames, mood, weight, duration, place, taste, today: localToday(), crowd: crowdPicks }), players, group };
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
        <!-- Dealt again on every search, like the catalog's covers. -->
        {#key results}
          <ol class="reco-picks" use:deal>
            {#each results.list as { game, groupNote, reasons }, rank (game.id)}
              <li class="reco-pick">
                <span class="reco-rank" aria-label="Sugerencia {rank + 1}">{rank + 1}</span>
                <GameCover {game} onopen={g => (detail = g)} />
                {#if groupNote}<span class="reco-note">{groupNote}</span>{/if}
                {#each reasons as reason (reason)}<span class="reco-reason">✦ {reason}</span>{/each}
                <span class="reco-place"><Icon name="pin" /> {game.locations.join(' · ') || 'Lugar por asignar'}</span>
              </li>
            {/each}
          </ol>
        {/key}
      </div>
    {:else}
      <EmptyState>No he encontrado una combinación clara. Prueba con otro número o plan.</EmptyState>
    {/if}
    {#if outside.length}
      <div class="reco outside">
        <h3>Fuera de tu baúl</h3>
        <p class="details">Juegos que no tienes y que gustan mucho a gente con tus gustos. Podéis proponerlos en «Por comprar».</p>
        <ul class="outside-list">
          {#each outside as pick (pick.name)}
            {@const entry = findInLibrary(pick.name)}
            <li>
              {#if entry}<img src={coverUrl(entry)} alt="" loading="lazy" />{:else}<span class="outside-dice" aria-hidden="true"><Icon name="dice" /></span>{/if}
              <strong>{pick.name}</strong>
              <span>★ {formatDecimal(pick.predicted)} para ti · {pick.neighbours} personas parecidas</span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  {/if}
</section>

<GameDetail
  game={detail}
  onclose={() => (detail = null)}
  onedit={game => { detail = null; onedit(game.id); }}
  onplay={game => { detail = null; onplay(game.name); }}
/>
