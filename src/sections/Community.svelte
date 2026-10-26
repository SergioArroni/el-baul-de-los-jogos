<script lang="ts">
  import Icon from '../components/Icon.svelte';
  import Avatar from '../components/Avatar.svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import { searchPeople, type PersonSummary } from '../data/people';
  import { dismissFriendRequest } from '../data/social';
  import { groupMembers } from '../domain/groups';
  import { nameKey } from '../domain/text';
  import type { Friend, Group } from '../domain/types';
  import { app } from '../stores/app.svelte';
  import { askConfirm } from '../stores/confirm.svelte';
  import FriendForm from './FriendForm.svelte';
  import GroupForm from './GroupForm.svelte';
  import ShareGroup from './ShareGroup.svelte';

  let friendDialog = $state<{ open: boolean; friend?: Friend; inviteOnly?: boolean }>({ open: false });
  let groupDialog = $state<{ open: boolean; group?: Group }>({ open: false });
  let sharing = $state<Group | null>(null);

  let query = $state('');
  let results = $state<PersonSummary[]>([]);
  let searchStatus = $state('');
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  /** Waits for a short pause in typing, and ignores answers to older searches. */
  function search() {
    clearTimeout(searchTimer);
    const text = query.trim();
    if (text.length < 2) {
      results = [];
      searchStatus = '';
      return;
    }
    searchTimer = setTimeout(async () => {
      try {
        const found = await searchPeople(text);
        if (text !== query.trim()) return;
        results = found;
        searchStatus = found.length ? '' : 'No hay nadie con ese apodo.';
        void app.loadPeople(found.map(person => person.userId));
      } catch (error) {
        searchStatus = (error as Error).message;
      }
    }, 250);
  }

  const groupCount = (friend: Friend) => app.groups.filter(g => (g.friendIds ?? []).includes(friend.id)).length;

  function accept(ownerId: string) {
    const nickname = app.people.get(ownerId)?.nickname;
    if (nickname) app.addFriendAccount(ownerId, nickname);
  }

  async function dismiss(ownerId: string) {
    try {
      await dismissFriendRequest(ownerId, app.user!.id);
      app.friendRequests = app.friendRequests.filter(r => r.owner_id !== ownerId);
    } catch (error) {
      console.error(error);
    }
  }

  async function removeFriend(friend: Friend) {
    if (await askConfirm({ title: `¿Eliminar a ${friend.name}?`, text: 'También se quitará de los grupos en los que esté.', confirmLabel: 'Eliminar', danger: true }))
      app.deleteFriend(friend.id);
  }

  async function removeGroup(group: Group) {
    if (await askConfirm({ title: `¿Eliminar el grupo «${group.name}»?`, text: 'Tus amigos no se borran, solo el grupo.', confirmLabel: 'Eliminar', danger: true }))
      app.deleteGroup(group.id);
  }
</script>

<section class="panel active">
  <div class="sectionhead"><div><h2>Amigos y grupos</h2><p>Organiza tus amigos y crea grupos combinándolos como quieras.</p></div></div>

  <div aria-live="polite">
    {#each app.pendingRequests as request (request.owner_id)}
      {@const nickname = app.people.get(request.owner_id)?.nickname ?? 'Alguien'}
      <article class="request-card">
        <Avatar userId={request.owner_id} name={nickname} />
        <p><strong>@{nickname}</strong> te ha añadido como amigo.</p>
        <div class="actions">
          <button class="btn small" onclick={() => accept(request.owner_id)}>Añadir también</button>
          <button class="btn ghost small" onclick={() => dismiss(request.owner_id)}>Ignorar</button>
        </div>
      </article>
    {/each}
  </div>

  <section class="community-section" aria-labelledby="peopleHeading">
    <div class="community-head">
      <div><h3 id="peopleHeading">Buscar personas</h3><p>Encuentra a otros jugadores por su apodo y mira su perfil.</p></div>
    </div>
    {#if app.user}
      <label class="searchbox people-search"><span aria-hidden="true">⌕</span>
        <input class="search" type="search" placeholder="Escribe un apodo…" aria-label="Buscar personas por apodo" bind:value={query} oninput={search} />
      </label>
      <p class="notice" role="status">{searchStatus}</p>
      {#if results.length}
        <div class="people-results">
          {#each results as person (person.userId)}
            <button class="person-result" type="button" onclick={() => app.openPerson(person.userId)}>
              <Avatar userId={person.userId} name={person.nickname} />
              <span>@{person.nickname}</span>
              {#if person.userId === app.user.id}<small>Tú</small>{:else if app.friends.some(f => f.userId === person.userId)}<small>En tus amigos</small>{/if}
            </button>
          {/each}
        </div>
      {/if}
    {:else}
      <p class="notice">Inicia sesión para buscar personas y ver sus perfiles.</p>
    {/if}
  </section>

  <section class="community-section" aria-labelledby="friendsHeading">
    <div class="community-head">
      <div><h3 id="friendsHeading">Amigos</h3><p>Añade cada amigo una vez y úsalo en todos los grupos que quieras.</p></div>
      <button class="btn" onclick={() => (friendDialog = { open: true })}>＋ Añadir amigo</button>
    </div>
    <div class="grid">
      {#each app.friends as friend (friend.id)}
        <article class="groupcard">
          <div class="person"><Avatar userId={friend.userId} name={friend.name} /><h3>{friend.name}</h3></div>
          <p>En {groupCount(friend)} grupos</p>
          {#if friend.userId}
            <div class="tags"><span class="tag green">✓ {nameKey(friend.name) === nameKey(friend.nickname) ? 'Usa la app' : '@' + friend.nickname}</span></div>
          {:else if friend.invite || friend.email}
            <div class="tags"><span class="tag">Invitación pendiente</span></div>
          {/if}
          <div class="actions">
            {#if friend.userId && app.user}<button class="btn secondary" onclick={() => app.openPerson(friend.userId!)}>Ver perfil</button>{/if}
            <button class="btn secondary" onclick={() => (friendDialog = { open: true, friend })}>Editar</button>
            {#if !friend.userId && (friend.invite || friend.email)}
              <button class="btn ghost" onclick={() => (friendDialog = { open: true, friend, inviteOnly: true })}>Invitar</button>
            {/if}
            <button class="btn ghost" onclick={() => removeFriend(friend)}>Eliminar</button>
          </div>
        </article>
      {:else}
        <EmptyState>Aún no has añadido amigos.</EmptyState>
      {/each}
    </div>
  </section>

  <section class="community-section" aria-labelledby="groupsHeading">
    <div class="community-head">
      <div><h3 id="groupsHeading">Grupos</h3><p>Combina amigos y guarda las preferencias de cada grupo.</p></div>
      <button class="btn" onclick={() => (groupDialog = { open: true })}>＋ Añadir grupo</button>
    </div>
    <div class="grid">
      {#each app.groups as group (app.groupKey(group))}
        {@const members = groupMembers(group, app.friends)}
        <article class="groupcard">
          <h3><Icon name="players" /> {group.name}</h3>
          {#if group._shared}<p>Compartido por @{app.people.get(group._ownerId ?? '')?.nickname ?? 'otra cuenta'}</p>{/if}
          {#if members.length}
            <div class="member-row">
              {#each members as member, i (member.userId ?? member.name + i)}
                <span class="member"><Avatar userId={member.userId} name={member.name} size="tiny" />{member.userId && member.userId === app.user?.id ? 'Tú' : member.name}</span>
              {/each}
            </div>
          {:else}
            <p>{group.size ? group.size + ' personas habituales' : 'Sin amigos añadidos'}</p>
          {/if}
          {#if group.likes}<div class="tags">{#each group.likes.split(',') as like, i (i)}<span class="tag green">{like.trim()}</span>{/each}</div>{/if}
          <p style="margin-top:10px">{group.notes || 'Todavía no hay notas.'}</p>
          <div class="actions">
            {#if app.user}<button class="btn secondary" onclick={() => app.openPlayGroup(app.groupKey(group))}>Partidas</button>{/if}
            {#if group._shared}
              <span class="tag green">Compartido contigo</span>
            {:else}
              {#if app.user}<button class="btn secondary" onclick={() => (sharing = group)}>Compartir</button>{/if}
              <button class="btn secondary" onclick={() => (groupDialog = { open: true, group })}>Editar</button>
              <button class="btn ghost" onclick={() => removeGroup(group)}>Eliminar</button>
            {/if}
          </div>
        </article>
      {:else}
        <EmptyState>Aún no has añadido grupos. Crea un grupo y añade amigos guardados para reutilizarlos en otras listas.</EmptyState>
      {/each}
    </div>
  </section>
</section>

<FriendForm open={friendDialog.open} friend={friendDialog.friend} inviteOnly={friendDialog.inviteOnly} onclose={() => (friendDialog = { open: false })} />
<GroupForm open={groupDialog.open} group={groupDialog.group} onclose={() => (groupDialog = { open: false })} />
<ShareGroup group={sharing} onclose={() => (sharing = null)} />
