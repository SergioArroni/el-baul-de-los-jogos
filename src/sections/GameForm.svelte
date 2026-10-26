<script lang="ts">
  import CatalogSuggest from '../components/CatalogSuggest.svelte';
  import Modal from '../components/Modal.svelte';
  import type { GameDraft } from '../data/catalog';
  import { findInLibrary } from '../content/library';
  import { expansionNamed, mergeInto } from '../domain/expansions';
  import { nameKey } from '../domain/text';
  import type { Game } from '../domain/types';
  import { untrack } from 'svelte';
  import { app, uid } from '../stores/app.svelte';

  /** `game` undefined → new game. */
  let { open, game, onclose }: { open: boolean; game?: Game; onclose: () => void } = $props();

  let form = $state({ name: '', players: '', types: '', weight: '', duration: '', locations: [] as string[], notes: '' });
  /** The user's places, plus any the game already had that no longer exists (so it can be unticked). */
  const placeNames = $derived([...new Set([...app.places.map(place => place.name), ...(game?.locations ?? [])])]);
  let status = $state('');
  let bggId = $state<number | undefined>();

  // Typing an expansion of a game you already have: it can go inside that game instead.
  const inside = $derived.by(() => {
    if (game) return null;
    const entry = expansionNamed(form.name.trim());
    const base = entry && app.games.find(g => findInLibrary(g.name)?.slug === entry.base);
    return entry && base ? { base, name: entry.names[0] } : null;
  });

  function putInside() {
    if (!inside) return;
    const chosen = placeNames.filter(name => form.locations.includes(name));
    app.upsertGame(mergeInto(inside.base, { ...inside.base, locations: chosen }, inside.name));
    onclose();
  }

  /** A game picked from the catalog fills the form; anything can still be edited. */
  function fill(draft: GameDraft) {
    bggId = draft.bggId;
    form = { ...form, name: draft.name, players: draft.players || form.players, types: draft.types.join(', ') || form.types,
      weight: draft.weight ? String(draft.weight) : form.weight, duration: draft.duration ? String(draft.duration) : form.duration };
  }

  $effect(() => {
    if (open) untrack(reset);
  });

  function reset() {
    status = '';
    bggId = game?.bggId;
    form = game
      ? { name: game.name, players: game.players ?? '', types: game.types.join(', '), weight: String(game.weight ?? ''),
          duration: String(game.duration ?? ''), locations: [...game.locations], notes: game.notes ?? '' }
      : { name: '', players: '', types: '', weight: '', duration: '', locations: app.places.slice(0, 1).map(place => place.name), notes: '' };
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const saved: Game = {
      id: game?.id ?? uid(),
      name: form.name.trim(),
      players: form.players.trim(),
      types: form.types.split(',').map(type => type.trim()).filter(Boolean),
      weight: Number(form.weight) || null,
      duration: Number(form.duration) || null,
      locations: placeNames.filter(name => form.locations.includes(name)),
      notes: form.notes.trim(),
      ...(bggId ? { bggId } : {}),
      // Its expansions are edited from the game's sheet: keep them.
      ...(game?.expansions ? { expansions: game.expansions } : {}),
    };
    if (app.games.some(g => g.id !== saved.id && nameKey(g.name) === nameKey(saved.name))) {
      status = 'Ya hay un juego con ese nombre en tu colección.';
      return;
    }
    app.upsertGame(saved);
    onclose();
  }
</script>

<Modal {open} title={game ? 'Editar juego' : 'Añadir juego'} {onclose}>
  <form onsubmit={submit}>
    <div class="formgrid">
      <div class="field"><label for="gName">Nombre *</label><input id="gName" required maxlength="100" autocomplete="off" bind:value={form.name} /><CatalogSuggest query={form.name} onpick={fill} />
        {#if inside}
          <p class="notice expansion-inside">Es una expansión de <strong>{inside.base.name}</strong>, que ya tienes. <button type="button" class="linkbutton" onclick={putInside}>Meterla dentro de {inside.base.name}</button></p>
        {/if}
      </div>
      <div class="field"><label for="gPlayers">Jugadores (mín.–máx.)</label><input id="gPlayers" placeholder="Ej. 2–6" bind:value={form.players} /></div>
      <div class="field"><label for="gTypes">Estilos (separados por comas)</label><input id="gTypes" placeholder="Fiesta, Cartas, Humor" bind:value={form.types} /></div>
      <div class="field">
        <label for="gWeight">Dureza (1–5)</label>
        <select id="gWeight" bind:value={form.weight}>
          <option value="">Sin indicar</option>
          {#each ['Muy ligero', 'Ligero', 'Medio', 'Duro', 'Muy duro'] as label, i (label)}<option value={String(i + 1)}>{i + 1} · {label}</option>{/each}
        </select>
      </div>
      <div class="field"><label for="gDuration">Duración en minutos</label><input id="gDuration" type="number" min="1" max="600" placeholder="Ej. 30" bind:value={form.duration} /></div>
      <div class="field full">
        <span class="field-label">Lugares (puede estar en varios)</span>
        <div class="friend-picker" role="group" aria-label="Lugares donde está el juego">
          {#each placeNames as place (place)}
            <label class="friend-option"><input type="checkbox" value={place} bind:group={form.locations} /><span>{place}</span></label>
          {:else}
            <p class="notice">Añade lugares en «Gestionar lugares» para elegirlos aquí.</p>
          {/each}
        </div>
      </div>
      <div class="field full"><label for="gNotes">Notas / expansiones / grupo ideal</label><textarea id="gNotes" placeholder="Ej. expansión de…, ideal para…" bind:value={form.notes}></textarea></div>
    </div>
    <p class="notice" role="status">{status}</p>
    <div class="formactions"><button type="button" class="btn ghost" onclick={onclose}>Cancelar</button><button class="btn" type="submit">Guardar juego</button></div>
  </form>
</Modal>
