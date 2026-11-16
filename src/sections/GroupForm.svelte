<script lang="ts">
  import { untrack } from 'svelte';
  import Modal from '../components/Modal.svelte';
  import { nameKey } from '../domain/text';
  import type { Group } from '../domain/types';
  import { app, uid } from '../stores/app.svelte';

  let { open, group, onclose }: { open: boolean; group?: Group; onclose: () => void } = $props();

  let form = $state({ name: '', size: '', friendIds: [] as string[], likes: '', notes: '' });
  let status = $state('');

  $effect(() => {
    if (open) untrack(() => {
      status = '';
      form = { name: group?.name ?? '', size: String(group?.size ?? ''), friendIds: [...(group?.friendIds ?? [])], likes: group?.likes ?? '', notes: group?.notes ?? '' };
    });
  });

  function submit(event: SubmitEvent) {
    event.preventDefault();
    const name = form.name.trim();
    if (!name) return void (status = 'Escribe el nombre del grupo.');
    // Only when the name is new or changed: groups that already shared a name can still be edited.
    const renamed = nameKey(name) !== nameKey(group?.name ?? '');
    if (renamed && app.groups.some(g => !g._shared && g.id !== group?.id && nameKey(g.name) === nameKey(name))) return void (status = 'Ya tienes un grupo con ese nombre.');
    app.upsertGroup({
      id: group?.id ?? uid(), name, size: Number(form.size) || null, friendIds: form.friendIds,
      likes: form.likes.trim(), notes: form.notes.trim(),
    });
    onclose();
  }
</script>

<Modal {open} title={group ? 'Editar grupo' : 'Añadir grupo'} {onclose}>
  <form onsubmit={submit}>
    <div class="formgrid">
      <div class="field"><label for="groupName">Nombre del grupo *</label><input id="groupName" required maxlength="80" placeholder="Ej. Los de los viernes" bind:value={form.name} /></div>
      <div class="field"><label for="groupSize">Número habitual de personas</label><input id="groupSize" type="number" min="1" max="30" placeholder="Ej. 6" bind:value={form.size} /></div>
      <div class="field full">
        <span class="field-label">Amigos del grupo</span>
        <div class="friend-picker" role="group" aria-label="Selecciona los amigos del grupo">
          {#each app.friends as friend (friend.id)}
            <label class="friend-option"><input type="checkbox" value={friend.id} bind:group={form.friendIds} /><span>{friend.name}</span></label>
          {:else}
            <p class="notice">Añade amigos primero para elegirlos en este grupo.</p>
          {/each}
        </div>
        <small>Selecciona uno o varios nombres; un amigo puede aparecer en varios grupos.</small>
      </div>
      <div class="field full"><label for="groupLikes">Qué les gusta</label><input id="groupLikes" placeholder="Fiesta, estrategia, cooperativos…" bind:value={form.likes} /></div>
      <div class="field full"><label for="groupNotes">Experiencia, límites y notas</label><textarea id="groupNotes" placeholder="Ej. principiantes, les gusta el pique, no quieren reglas largas…" bind:value={form.notes}></textarea></div>
    </div>
    <p class="notice" role="status">{status}</p>
    <div class="formactions"><button type="button" class="btn ghost" onclick={onclose}>Cancelar</button><button class="btn" type="submit">Guardar grupo</button></div>
  </form>
</Modal>
