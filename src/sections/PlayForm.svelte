<script lang="ts">
  import Avatar from '../components/Avatar.svelte';
  import Modal from '../components/Modal.svelte';
  import { deletePlay, savePlay, type PlayerDraft } from '../data/plays';
  import { tap } from '../platform/native';
  import { groupMembers, playGroupKey, splitGroupKey } from '../domain/groups';
  import { localToday, nameKey } from '../domain/text';
  import type { Play } from '../domain/types';
  import { untrack } from 'svelte';
  import { app } from '../stores/app.svelte';

  interface Props {
    open: boolean;
    play?: Play;
    /** Group key and game name to start a new play with. */
    presetGroup?: string;
    presetGame?: string;
    onclose: () => void;
  }

  let { open, play, presetGroup = '', presetGame = '', onclose }: Props = $props();

  /** A possible player: me, a friend, or a member of a shared group. Keyed by account or by name. */
  interface Candidate { key: string; name: string; userId: string | null }
  type Draft = PlayerDraft & { key: string };

  let form = $state({ game: '', date: '', minutes: '', group: '', place: '', notes: '' });
  let players = $state<Draft[]>([]);
  let status = $state('');
  let saving = $state(false);
  let confirmDelete = $state(false);

  const me = $derived(app.user?.id ?? '');
  const candidateOf = (name: string, userId: string | null): Candidate =>
    ({ key: userId ? 'u:' + userId : 'n:' + nameKey(name), name, userId });
  const isMe = (userId: string | null) => !!userId && userId === me;
  const label = (c: { name: string; userId: string | null }) => (isMe(c.userId) ? 'Yo' : c.name);

  const groupOptions = $derived.by(() => {
    const options = app.groups.map(g => ({ key: app.groupKey(g), name: g.name }));
    if (play?.group_key && !options.some(o => o.key === playGroupKey(play))) options.push({ key: playGroupKey(play), name: play.group_name ?? 'Otro grupo' });
    return options;
  });
  const placeNames = $derived(play?.place && !app.places.some(p => p.name === play.place) ? [...app.places.map(p => p.name), play.place] : app.places.map(p => p.name));

  function candidates(groupKeyValue: string): Candidate[] {
    const list: Candidate[] = [candidateOf(app.nickname || app.user?.email || 'Yo', me)];
    const add = (c: Candidate) => { if (!list.some(x => x.key === c.key)) list.push(c); };
    for (const friend of app.friends) add(candidateOf(friend.name, friend.userId ?? null));
    const group = app.groups.find(g => app.groupKey(g) === groupKeyValue);
    if (group?._shared) {
      if (group._ownerId) add(candidateOf(app.people.get(group._ownerId)?.nickname ?? 'Dueño del grupo', group._ownerId));
      for (const member of group.members ?? []) add(candidateOf(member.name, member.userId));
    }
    for (const p of players) add(p);
    return list;
  }
  const options = $derived(candidates(form.group));

  /** For a new play, picking a group pre-selects me and its members. */
  function selectGroupMembers() {
    if (play) return;
    const group = app.groups.find(g => app.groupKey(g) === form.group);
    const members = !group ? [] : group._shared ? [{ name: '', userId: group._ownerId ?? null }, ...(group.members ?? [])] : groupMembers(group, app.friends);
    const keys = new Set(['u:' + me, ...members.map(m => candidateOf(m.name, m.userId).key)]);
    players = [];
    players = candidates(form.group).filter(c => keys.has(c.key)).map(c => ({ ...c, points: null, winner: false, rating: null }));
  }

  $effect(() => {
    if (open) untrack(reset);
  });

  function reset() {
    status = '';
    confirmDelete = false;
    form = {
      game: play?.game_name ?? presetGame,
      date: play?.played_on ?? localToday(),
      minutes: play?.duration_minutes ? String(play.duration_minutes) : '',
      group: play ? playGroupKey(play) : groupOptions.some(o => o.key === presetGroup) ? presetGroup : '',
      place: play?.place ?? '',
      notes: play?.notes ?? '',
    };
    if (play) {
      players = play.play_players.map(x => ({
        key: candidateOf(x.name, x.user_id).key, rowId: x.id, name: x.name, userId: x.user_id, points: x.points, winner: x.winner, rating: x.rating,
      }));
    } else selectGroupMembers();
  }

  function toggle(candidate: Candidate, checked: boolean) {
    players = checked
      ? [...players, { ...candidate, points: null, winner: false, rating: null }]
      : players.filter(p => p.key !== candidate.key);
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!players.length) {
      status = 'Marca al menos un jugador.';
      return;
    }
    const minutes = Math.round(Number(form.minutes));
    // New plays need their length (old ones may not have it).
    if (form.minutes || !play) {
      if (!(minutes >= 1 && minutes <= 1440)) return void (status = 'Indica cuánto duró la partida, en minutos (de 1 a 1440).');
    }
    const group = app.groups.find(g => app.groupKey(g) === form.group);
    const key = splitGroupKey(form.group);
    saving = true;
    status = 'Guardando…';
    try {
      await savePlay({
        game_name: form.game.trim(), played_on: form.date, place: form.place || null, notes: form.notes.trim() || null,
        duration_minutes: form.minutes ? minutes : null,
        group_owner: key?.owner ?? null, group_key: key?.id ?? null, group_name: key ? group?.name ?? play?.group_name ?? null : null,
      }, $state.snapshot(players), me, play);
      tap();
      app.playView = form.group;
      await app.reloadPlays();
      onclose();
    } catch (error) {
      status = 'No se pudo guardar: ' + (error as Error).message;
    } finally {
      saving = false;
    }
  }

  async function remove() {
    if (!play) return;
    if (!confirmDelete) {
      confirmDelete = true;
      return;
    }
    try {
      await deletePlay(play.id);
      await app.reloadPlays();
      onclose();
    } catch (error) {
      status = 'No se pudo eliminar: ' + (error as Error).message;
    }
  }
</script>

<Modal {open} title={play ? 'Editar partida' : 'Registrar partida'} {onclose}>
  <form onsubmit={submit}>
    <div class="formgrid">
      <div class="field">
        <label for="playGame">Juego *</label>
        <input id="playGame" list="playGameList" required maxlength="120" autocomplete="off" placeholder="Ej. Carcassonne" bind:value={form.game} />
        <datalist id="playGameList">{#each app.games as g (g.id)}<option value={g.name}></option>{/each}</datalist>
      </div>
      <div class="field"><label for="playDate">Fecha *</label><input id="playDate" type="date" required bind:value={form.date} /></div>
      <div class="field"><label for="playMinutes">¿Cuánto duró? (min){play ? '' : ' *'}</label><input id="playMinutes" type="number" min="1" max="1440" inputmode="numeric" placeholder="Ej. 45" bind:value={form.minutes} /></div>
      <div class="field">
        <label for="playGroup">Grupo</label>
        <select id="playGroup" value={form.group} onchange={e => { form.group = e.currentTarget.value; selectGroupMembers(); }}>
          <option value="">Sin grupo</option>
          {#each groupOptions as option (option.key)}<option value={option.key}>{option.name}</option>{/each}
        </select>
      </div>
      <div class="field">
        <label for="playPlace">Lugar</label>
        <select id="playPlace" bind:value={form.place}>
          <option value="">Sin indicar</option>
          {#each placeNames as name (name)}<option value={name}>{name}</option>{/each}
        </select>
      </div>
      <div class="field full">
        <span class="field-label">¿Quién jugó?</span>
        <div class="friend-picker" role="group" aria-label="Jugadores">
          {#each options as candidate (candidate.key)}
            <label class="friend-option">
              <input type="checkbox" checked={players.some(p => p.key === candidate.key)} onchange={e => toggle(candidate, e.currentTarget.checked)} />
              <Avatar userId={candidate.userId} name={candidate.name} size="tiny" /><span>{label(candidate)}</span>
            </label>
          {/each}
        </div>
      </div>
      <div class="field full">
        <span class="field-label">Puntos, ganador y tu nota</span>
        <div class="play-scores">
          {#each players as player (player.key)}
            <div class="play-score-row">
              <span class="play-score-name"><Avatar userId={player.userId} name={player.name} size="tiny" />{label(player)}</span>
              <input type="number" step="any" inputmode="decimal" placeholder="Pts" aria-label="Puntos de {player.name}"
                value={player.points ?? ''} oninput={e => (player.points = e.currentTarget.value === '' ? null : Number(e.currentTarget.value))} />
              <label class="winner-toggle" title="Ganó"><input type="checkbox" bind:checked={player.winner} />🏆<span class="visually-hidden">Ganó {player.name}</span></label>
              {#if isMe(player.userId)}
                <select aria-label="Tu nota" value={player.rating ?? ''} onchange={e => (player.rating = e.currentTarget.value ? Number(e.currentTarget.value) : null)}>
                  <option value="">Nota</option>
                  {#each Array.from({ length: 10 }, (_, i) => i + 1) as n (n)}<option value={n}>{n}</option>{/each}
                </select>
              {:else}<span></span>{/if}
            </div>
          {:else}
            <p class="notice">Marca arriba quién jugó.</p>
          {/each}
        </div>
        <small>Cada persona con cuenta pone su propia nota (1–10) desde la partida.</small>
      </div>
      <div class="field full"><label for="playNotes">Notas</label><textarea id="playNotes" maxlength="500" placeholder="Ej. primera partida con la expansión" bind:value={form.notes}></textarea></div>
    </div>
    <p class="notice" role="status">{status}</p>
    <div class="formactions">
      {#if play}<button type="button" class="btn ghost" onclick={remove}>{confirmDelete ? '¿Seguro? Pulsa otra vez' : 'Eliminar'}</button>{/if}
      <button type="button" class="btn ghost" onclick={onclose}>Cancelar</button>
      <button class="btn" type="submit" disabled={saving}>Guardar partida</button>
    </div>
  </form>
</Modal>
