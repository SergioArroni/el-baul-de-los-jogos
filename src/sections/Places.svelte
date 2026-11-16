<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import Modal from '../components/Modal.svelte';
  import { nameKey } from '../domain/text';
  import type { Place } from '../domain/types';
  import { app, uid } from '../stores/app.svelte';
  import { askConfirm } from '../stores/confirm.svelte';

  let open = $state(false);
  let name = $state('');
  let status = $state('');

  function start() {
    name = '';
    status = '';
    open = true;
  }

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return void (status = 'Escribe el nombre del lugar.');
    if (app.places.some(place => nameKey(place.name) === nameKey(trimmed))) {
      status = 'Ya existe un lugar con ese nombre.';
      return;
    }
    app.addPlace({ id: uid(), name: trimmed });
    open = false;
  }

  const gamesAt = (place: Place) => app.games.filter(game => game.locations.includes(place.name)).length;

  async function remove(place: Place) {
    const count = gamesAt(place);
    const ok = await askConfirm({
      title: `¿Eliminar «${place.name}»?`,
      text: count
        ? `${count === 1 ? 'El juego que está' : `Los ${count} juegos que están`} ahí no se ${count === 1 ? 'borra' : 'borran'}: solo ${count === 1 ? 'deja' : 'dejan'} de estar en este lugar. Las partidas ya jugadas ahí lo conservan.`
        : 'No hay juegos guardados en este lugar.',
      confirmLabel: 'Eliminar', danger: true,
    });
    if (ok) app.deletePlace(place.id);
  }
</script>

<section class="panel active">
  <div class="sectionhead">
    <div><h2>Lugares</h2><p>Organiza tu colección por lugar y añade nuevos sitios cuando quieras.</p></div>
    <button class="btn" onclick={start}>＋ Añadir lugar</button>
  </div>
  <div class="card" style="margin-top:16px;overflow-x:auto">
    <table class="placetable">
      <thead><tr><th>Lugar</th><th>Juegos guardados</th><th><span class="visually-hidden">Acciones</span></th></tr></thead>
      <tbody>
        {#each app.places as place (place.id)}
          <tr><td><strong><Icon name="pin" /> {place.name}</strong></td><td>{gamesAt(place)}</td>
            <td class="place-actions">
              <!-- The last one stays: a collection with no places would get the starting ones back. -->
              {#if app.places.length > 1}<button type="button" class="btn ghost small" aria-label="Eliminar {place.name}" onclick={() => remove(place)}>Eliminar</button>{/if}
            </td></tr>
        {:else}
          <tr><td colspan="3">Todavía no hay lugares.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>

<Modal {open} title="Añadir lugar" onclose={() => (open = false)}>
  <form onsubmit={submit}>
    <div class="field"><label for="placeName">Nombre del lugar *</label><input id="placeName" required maxlength="80" placeholder="Ej. Casa de Laura" bind:value={name} /></div>
    <p class="notice" role="status">{status}</p>
    <div class="formactions"><button type="button" class="btn ghost" onclick={() => (open = false)}>Cancelar</button><button class="btn" type="submit">Guardar lugar</button></div>
  </form>
</Modal>

<style>
  .place-actions { width: 1%; text-align: right; white-space: nowrap; }
</style>
