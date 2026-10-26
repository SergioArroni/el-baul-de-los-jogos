<script lang="ts">
  import { tick } from 'svelte';
  import ConfirmDialog from './components/ConfirmDialog.svelte';
  import Header from './components/Header.svelte';
  import Nav from './components/Nav.svelte';
  import type { Play } from './domain/types';
  import Backup from './sections/Backup.svelte';
  import Catalog from './sections/Catalog.svelte';
  import Community from './sections/Community.svelte';
  import PersonProfile from './sections/PersonProfile.svelte';
  import GameForm from './sections/GameForm.svelte';
  import Places from './sections/Places.svelte';
  import PlayForm from './sections/PlayForm.svelte';
  import Plays from './sections/Plays.svelte';
  import Profile from './sections/Profile.svelte';
  import Ranking from './sections/Ranking.svelte';
  import Recommend from './sections/Recommend.svelte';
  import Wishlist from './sections/Wishlist.svelte';
  import JoginoBuddy from './mascot/JoginoBuddy.svelte';
  import { jogino } from './mascot/prefs.svelte';
  import { handleBackButton, hideSplash } from './platform/native';
  import { enter } from './motion';
  import { app, type Tab } from './stores/app.svelte';

  // The play form opens from several screens (catalog sheet, plays, group cards), so it lives here.
  let playDialog = $state<{ open: boolean; play?: Play; group?: string; game?: string }>({ open: false });
  let editGameId = $state<string | null>(null);
  const editGame = $derived(app.games.find(g => g.id === editGameId));

  // Hide the loading screen from index.html as soon as we know who is signed in.
  $effect(() => {
    if (!app.ready) return;
    document.documentElement.classList.remove('auth-pending');
    hideSplash();
  });

  // Android back button: close dialogs first, then return to the catalog, then leave the app.
  handleBackButton(() => {
    if (app.tab === 'plays' && app.playView !== null) app.playView = null;
    else if (app.tab === 'groups' && app.personView !== null) app.personView = null;
    else if (app.tab !== 'catalog') navigate('catalog');
    else return false;
    return true;
  });

  // On phones the tab bar sits at the bottom: Jogiño's floor is on top of it.
  function tabBarHeight(): number {
    const bar = document.querySelector('.nav');
    return bar && getComputedStyle(bar).position === 'fixed' ? bar.getBoundingClientRect().height : 0;
  }

  async function openConnect() {
    navigate('profile');
    await tick();
    document.getElementById('conectar-ia')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function navigate(tab: Tab) {
    if (tab === 'backup' && !app.isAdmin) return;
    app.tab = tab;
    app.personView = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (tab === 'profile') app.loadProfile().catch(error => console.error(error));
  }
</script>

<div class="wrap">
  <Header {navigate} />
  <Nav {navigate} />
  <main>
    {#key app.tab + (app.personView ?? '')}
    <div use:enter>
    {#if app.tab === 'catalog'}
      <Catalog {navigate} onplay={game => (playDialog = { open: true, game })} />
    {:else if app.tab === 'places'}
      <Places />
    {:else if app.tab === 'recommend'}
      <Recommend onedit={id => (editGameId = id)} onplay={game => (playDialog = { open: true, game })} />
    {:else if app.tab === 'plays'}
      <Plays onplay={({ play, group }) => (playDialog = { open: true, play, group })} />
    {:else if app.tab === 'ranking'}
      <Ranking />
    {:else if app.tab === 'groups'}
      {#if app.personView}<PersonProfile userId={app.personView} />{:else}<Community />{/if}
    {:else if app.tab === 'newGames'}
      <Wishlist />
    {:else if app.tab === 'profile'}
      <Profile />
    {:else if app.tab === 'backup' && app.isAdmin}
      <Backup />
    {/if}
    </div>
    {/key}
  </main>
  <div class="footer">Un baúl para todos tus buenos planes.</div>
</div>

<PlayForm open={playDialog.open} play={playDialog.play} presetGroup={playDialog.group} presetGame={playDialog.game} onclose={() => (playDialog = { open: false })} />
<GameForm open={!!editGame} game={editGame} onclose={() => (editGameId = null)} />
<ConfirmDialog />
{#if !jogino.hidden}
  <JoginoBuddy
    text="Conecta tu Claude o ChatGPT y pregúntame por tu baúl: «¿qué cooperativo para 5 tenemos en casa de Enzo?»."
    action={{ label: 'Cómo conectarlo', onclick: openConnect }}
    canHide
    floorGap={tabBarHeight}
    shelf={40}
  />
{/if}
