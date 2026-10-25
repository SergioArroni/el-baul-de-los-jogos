<script lang="ts">
  import { untrack } from 'svelte';
  import Avatar from '../components/Avatar.svelte';
  import GameCover from '../components/GameCover.svelte';
  import { loadPersonCollection, loadPersonProfile, loadPersonStats, type PersonProfile } from '../data/people';
  import { byName } from '../domain/catalog';
  import { canSee, profileHighlights } from '../domain/profiles';
  import { formatDecimal } from '../domain/text';
  import type { Game, PersonGameStat, Visibility } from '../domain/types';
  import { app } from '../stores/app.svelte';
  import GameDetail from './GameDetail.svelte';

  let { userId }: { userId: string } = $props();

  let profile = $state<PersonProfile | null>(null);
  let games = $state<Game[]>([]);
  /** null: the statistics function isn't in the database yet. */
  let stats = $state<PersonGameStat[] | null>([]);
  let status = $state('');
  let opened = $state<Game | null>(null);

  const isOwner = $derived(userId === app.user?.id);
  /** I added them: they can see what I share with friends. */
  const inMyFriends = $derived(app.friends.some(friend => friend.userId === userId));
  const viewer = $derived({ isOwner, isFriend: !!profile?.addedMe });
  const showCollection = $derived(!!profile?.privacyReady && canSee(profile.collection, viewer) || isOwner);
  const showStats = $derived(!!profile?.privacyReady && stats !== null && canSee(profile.stats, viewer));
  const highlights = $derived(profileHighlights(stats ?? []));
  const name = $derived(profile ? '@' + profile.nickname : '');

  $effect(() => {
    const id = userId;
    untrack(() => load(id));
  });

  async function load(id: string) {
    profile = null;
    games = [];
    stats = [];
    status = 'Cargando perfil…';
    if (!app.user) return void (status = 'Inicia sesión para ver perfiles.');
    try {
      const [person, collection, playStats] = await Promise.all([
        loadPersonProfile(id, app.user.id), loadPersonCollection(id), loadPersonStats(id),
      ]);
      if (id !== userId) return;
      profile = person;
      games = id === app.user.id ? [...app.games].sort(byName) : collection;
      stats = playStats;
      status = '';
      void app.loadPeople([id]);
    } catch (error) {
      status = (error as Error).message;
    }
  }

  /** Why something is hidden, in plain words. */
  function hiddenReason(level: Visibility, what: string, ready: boolean): string {
    if (!ready) return 'Los perfiles aún no están activados en el servidor.';
    return level === 'private' ? `${name} tiene ${what} en privado.` : `${name} solo enseña ${what} a las personas que ha añadido como amigos.`;
  }

  const plays = (count: number) => `${count} ${count === 1 ? 'partida' : 'partidas'}`;
  const percent = (value: number) => `${Math.round(value * 100)} %`;
</script>

<section class="panel active">
  <div class="sectionhead">
    <div class="person-hero">
      <Avatar {userId} name={profile?.nickname} size="" className="profile-avatar-large" />
      <div>
        <h2>{profile ? name : 'Perfil'}</h2>
        {#if profile && !isOwner}
          <div class="tags">
            {#if inMyFriends}<span class="tag green">✓ En tus amigos</span>{/if}
            {#if profile.addedMe}<span class="tag">Te ha añadido</span>{/if}
          </div>
        {:else if isOwner}
          <p>Así se ve tu perfil. La privacidad se cambia en «Mi perfil».</p>
        {/if}
      </div>
    </div>
    <button class="btn ghost" type="button" onclick={() => (app.personView = null)}>← Volver</button>
  </div>

  <p class="notice" role="status">{status}</p>

  {#if profile}
    {#if !isOwner && !inMyFriends}
      <div class="request-card">
        <p>Si añades a {name}, podrá ver lo que tengas en «Solo mis amigos».</p>
        <div class="actions"><button class="btn small" type="button" onclick={() => app.addFriendAccount(userId, profile!.nickname)}>＋ Añadir como amigo</button></div>
      </div>
    {/if}

    <section class="community-section" aria-labelledby="personStats">
      <div class="community-head"><div><h3 id="personStats">Estadísticas</h3></div></div>
      {#if !showStats}
        <p class="notice">{hiddenReason(profile.stats, 'sus estadísticas', profile.privacyReady && stats !== null)}</p>
      {:else if !highlights.plays}
        <p class="notice">Todavía no hay partidas registradas.</p>
      {:else}
        <div class="stats-grid">
          <div class="stat-tile"><small>Partidas</small><strong>{highlights.plays}</strong></div>
          <div class="stat-tile"><small>Victorias</small><strong>{highlights.wins}</strong>{#if highlights.winRate != null}<span class="sub">{percent(highlights.winRate)} de las partidas</span>{/if}</div>
          {#if highlights.mostPlayed}<div class="stat-tile"><small>El que más juega</small><strong>{highlights.mostPlayed.game_name}</strong><span class="sub">{plays(highlights.mostPlayed.plays)}</span></div>{/if}
          {#if highlights.favourite}<div class="stat-tile"><small>El que más le gusta</small><strong>{highlights.favourite.game_name}</strong><span class="sub">★ {formatDecimal(highlights.favourite.rating ?? 0)} de nota media</span></div>{/if}
          {#if highlights.best}<div class="stat-tile"><small>Su mejor juego</small><strong>{highlights.best.game_name}</strong><span class="sub">Gana el {percent(highlights.best.winRate)}</span></div>{/if}
          {#if highlights.mostWins}<div class="stat-tile"><small>Con el que más gana</small><strong>{highlights.mostWins.game_name}</strong><span class="sub">{highlights.mostWins.wins} victorias</span></div>{/if}
          {#if highlights.mostLosses}<div class="stat-tile"><small>Con el que más pierde</small><strong>{highlights.mostLosses.game_name}</strong><span class="sub">{highlights.mostLosses.losses} derrotas</span></div>{/if}
        </div>
      {/if}
    </section>

    <section class="community-section" aria-labelledby="personGames">
      <div class="community-head"><div><h3 id="personGames">Colección{showCollection ? ` · ${games.length}` : ''}</h3></div></div>
      {#if !showCollection}
        <p class="notice">{hiddenReason(profile.collection, 'su colección', profile.privacyReady)}</p>
      {:else if !games.length}
        <p class="notice">Todavía no tiene juegos en su colección.</p>
      {:else}
        <div class="cover-grid">
          {#each games as game (game.id)}<GameCover {game} onopen={g => (opened = g)} />{/each}
        </div>
      {/if}
    </section>
  {/if}
</section>

<GameDetail game={opened} readonly onclose={() => (opened = null)} />
