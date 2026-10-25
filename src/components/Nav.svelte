<script lang="ts">
  import { app, type Tab } from '../stores/app.svelte';

  let { navigate }: { navigate: (tab: Tab) => void } = $props();

  const tabs: [Tab, string, string][] = [
    ['catalog', '▦', 'Catálogo'],
    ['recommend', '✦', 'Qué jugamos'],
    ['plays', '⚑', 'Partidas'],
    ['ranking', '🏆', 'Ranking'],
    ['groups', '♧', 'Comunidad'],
    ['newGames', '＋', 'Por comprar'],
  ];
  // Lugares lives inside the catalog, so the catalog tab stays highlighted there.
  const current = $derived(app.tab === 'places' ? 'catalog' : app.tab);
</script>

<nav class="nav" aria-label="Secciones principales">
  {#each tabs as [tab, icon, label] (tab)}
    <button class="tab" class:active={current === tab} aria-current={current === tab ? 'page' : undefined} onclick={() => navigate(tab)}>
      <span class="tab-icon" aria-hidden="true">{icon}</span>{label}
      {#if tab === 'groups' && app.pendingRequests.length}
        <span class="tab-badge">{app.pendingRequests.length}</span>
      {/if}
    </button>
  {/each}
</nav>
