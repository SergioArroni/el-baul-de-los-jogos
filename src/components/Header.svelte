<script lang="ts">
  import { localMode, supabase } from '../data/client';
  import { app, type Tab } from '../stores/app.svelte';
  import { theme, type ThemePreference } from '../stores/theme.svelte';
  import Avatar from './Avatar.svelte';

  let { navigate }: { navigate: (tab: Tab) => void } = $props();

  let menuOpen = $state(false);
  let wrap: HTMLDivElement;
  const nickname = $derived(app.nickname || app.user?.user_metadata?.nickname || 'Mi cuenta');
  const themes: [ThemePreference, string][] = [['system', 'Sistema'], ['light', 'Claro'], ['dark', 'Oscuro']];

  function go(tab: Tab) {
    menuOpen = false;
    navigate(tab);
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
      app.syncStatus = 'No se pudo cerrar sesión';
    } else if (!localMode) location.replace('login.html');
  }
</script>

<svelte:document
  onpointerdown={event => { if (menuOpen && !wrap.contains(event.target as Node)) menuOpen = false; }}
  onkeydown={event => { if (event.key === 'Escape') menuOpen = false; }}
/>

<header class="app-header">
  <a class="brand" href="index.html" aria-label="El Baúl de los Jogos, inicio">
    <span class="brand-mark" aria-hidden="true"><span class="logo-shape"></span></span>
    <span><span class="brand-name">El Baúl de los Jogos</span><span class="brand-caption">Tu colección, en orden</span></span>
  </a>
  <div class="header-actions">
    <span class="syncstatus" aria-live="polite">{app.syncStatus}</span>
    <div class="profile-wrap" bind:this={wrap}>
      <button class="profile-trigger" class:profile-selected={app.tab === 'profile'} type="button" aria-haspopup="true"
        aria-expanded={menuOpen} aria-controls="profileMenu" aria-label="Perfil de {nickname}. Abrir opciones"
        onclick={() => (menuOpen = !menuOpen)}>
        <Avatar userId={app.user?.id} name={nickname} size="" />
        <span class="profile-meta"><strong>{nickname}</strong><small>{app.user ? 'Cuenta y ajustes' : 'Ajustes'}</small></span>
        <span class="chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="profile-menu" id="profileMenu" hidden={!menuOpen}>
        <div class="menu-account"><strong>{nickname}</strong><small>{app.user?.email ?? 'Modo local'}</small></div>
        <button class="menu-action" type="button" onclick={() => go('profile')}><span class="menu-icon">◉</span>Mi perfil</button>
        {#if app.isAdmin}
          <a class="menu-action" href="admin.html"><span class="menu-icon">⚙</span>Administrar usuarios</a>
          <button class="menu-action" type="button" onclick={() => go('backup')}><span class="menu-icon">↧</span>Copia de seguridad</button>
        {/if}
        {#if !app.user}
          <button class="menu-action" type="button" onclick={() => (location.href = 'login.html')}><span class="menu-icon">↗</span>Iniciar sesión</button>
        {/if}
        <div class="menu-divider"></div>
        <div class="theme-label">Apariencia</div>
        <div class="theme-options" role="group" aria-label="Tema de la aplicación">
          {#each themes as [value, label] (value)}
            <button class="theme-choice" type="button" aria-pressed={theme.preference === value} onclick={() => theme.set(value)}>{label}</button>
          {/each}
        </div>
        {#if app.user}
          <div class="menu-divider"></div>
          <button class="menu-action" type="button" onclick={signOut}><span class="menu-icon">↪</span>Cerrar sesión</button>
        {/if}
      </div>
    </div>
  </div>
</header>
