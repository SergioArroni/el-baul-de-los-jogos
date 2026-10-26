<script lang="ts">
  import { onDestroy } from 'svelte';
  import Avatar from '../components/Avatar.svelte';
  import ConnectAI from './ConnectAI.svelte';
  import Modal from '../components/Modal.svelte';
  import { deleteMyAccount } from '../data/account';
  import { supabase } from '../data/client';
  import { clearLocal, localSetting } from '../data/local';
  import { toAvatarWebp, updateNickname, updatePrivacy, uploadAvatar, type Privacy } from '../data/profile';
  import { VISIBILITY_LABELS } from '../domain/profiles';
  import { isValidNickname } from '../domain/text';
  import { app } from '../stores/app.svelte';
  import { theme, type ThemePreference } from '../stores/theme.svelte';

  let nickname = $state(app.nickname);
  let status = $state('');
  let avatarStatus = $state('Puedes usar una imagen JPG, PNG o WebP de hasta 12 MB.');
  let pending = $state<{ file: File; url: string } | null>(null);
  let saving = $state(false);
  let picker: HTMLInputElement;

  const displayName = $derived(app.nickname || app.user?.user_metadata?.nickname || 'Tu perfil');
  const themes: [ThemePreference, string][] = [['system', '◐ Sistema'], ['light', '☀ Claro'], ['dark', '☾ Oscuro']];

  $effect(() => {
    nickname = app.nickname;
  });

  let privacy = $state<Privacy>({ collection: 'friends', stats: 'friends' });
  let privacyStatus = $state('');
  // The profile reloads in the background when this screen opens: once the person
  // has touched a selector, that reload must not put the old values back.
  let privacyTouched = false;
  $effect(() => {
    if (app.privacy && !privacyTouched) privacy = { ...app.privacy };
  });

  let deleting = $state(false);
  let deleteConfirm = $state('');
  let deleteStatus = $state('');
  let deleteBusy = $state(false);
  const deleteReady = $derived(!!app.nickname && deleteConfirm.trim().toLowerCase() === app.nickname.toLowerCase());

  function startDelete() {
    deleteConfirm = '';
    deleteStatus = '';
    deleting = true;
  }

  async function confirmDelete(event: SubmitEvent) {
    event.preventDefault();
    if (!deleteReady) return void (deleteStatus = 'Escribe tu apodo tal cual para confirmar.');
    deleteBusy = true;
    deleteStatus = 'Borrando tu cuenta…';
    try {
      await deleteMyAccount();
      clearLocal();
      // The account no longer exists on the server: only forget the session here.
      await supabase?.auth.signOut({ scope: 'local' });
      location.replace('login.html?deleted=1');
    } catch (error) {
      deleteStatus = (error as Error).message;
      deleteBusy = false;
    }
  }

  async function savePrivacy(event: SubmitEvent) {
    event.preventDefault();
    privacyStatus = 'Guardando…';
    try {
      await updatePrivacy(app.user!.id, privacy);
      app.privacy = { ...privacy };
      privacyTouched = false;
      privacyStatus = 'Privacidad guardada.';
    } catch (error) {
      privacyStatus = (error as Error).message;
    }
  }

  function clearPreview() {
    if (pending) URL.revokeObjectURL(pending.url);
    pending = null;
    picker.value = '';
  }
  onDestroy(() => pending && URL.revokeObjectURL(pending.url));

  function choose() {
    const file = picker.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return void ((picker.value = ''), (avatarStatus = 'Elige un archivo de imagen.'));
    if (file.size > 12 * 1024 * 1024) return void ((picker.value = ''), (avatarStatus = 'La imagen debe pesar menos de 12 MB.'));
    if (pending) URL.revokeObjectURL(pending.url);
    pending = { file, url: URL.createObjectURL(file) };
    avatarStatus = 'Vista previa. Guarda la foto para aplicarla a tu perfil.';
  }

  async function savePhoto() {
    if (!pending) return;
    saving = true;
    avatarStatus = 'Preparando y guardando la foto…';
    try {
      const blob = await toAvatarWebp(pending.file);
      if (app.user) app.avatarUrl = await uploadAvatar(app.user.id, blob);
      else {
        app.avatarUrl = await new Promise<string>(resolve => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(blob);
        });
        localSetting.set('ludoteca_avatar', app.avatarUrl);
      }
      clearPreview();
      avatarStatus = 'Foto de perfil actualizada.';
    } catch (error) {
      console.error('Error al guardar foto de perfil:', error);
      const detail = (error as Error).message || 'Error desconocido';
      const setup = /bucket|avatar_path|row-level security/i.test(detail);
      avatarStatus = setup
        ? `Supabase rechazó la foto: ${detail}. Revisa y ejecuta sql/community-plays.sql en el proyecto.`
        : `No se pudo guardar la foto: ${detail}`;
    } finally {
      saving = false;
    }
  }

  async function saveProfile(event: SubmitEvent) {
    event.preventDefault();
    const value = nickname.trim();
    if (!isValidNickname(value)) return void (status = 'El apodo debe tener entre 3 y 24 caracteres válidos.');
    status = 'Guardando…';
    try {
      if (app.user) await updateNickname(app.user.id, value);
      else localSetting.set('ludoteca_nickname', value);
      app.nickname = value;
      status = 'Perfil guardado.';
    } catch (error) {
      status = (error as Error).message;
    }
  }
</script>

<section class="panel active">
  <div class="sectionhead"><div><h2>Mi perfil</h2><p>Actualiza tu foto, apodo y preferencias.</p></div></div>
  <form class="card profile-card" style="margin-top:16px" onsubmit={saveProfile}>
    <div class="profile-top">
      <Avatar userId={app.user?.id} name={displayName} size="" className="profile-avatar-large" src={pending?.url} />
      <div>
        <h3>{displayName}</h3>
        <p>{app.user?.email ?? 'Modo local'}</p>
        <input type="file" accept="image/*" hidden bind:this={picker} onchange={choose} />
        {#if pending}
          <div class="avatar-actions">
            <button class="btn small" type="button" disabled={saving} onclick={savePhoto}>Guardar foto</button>
            <button class="btn ghost small" type="button" disabled={saving} onclick={() => { clearPreview(); avatarStatus = 'No se han guardado cambios en la foto.'; }}>Cancelar</button>
          </div>
        {:else}
          <button class="btn secondary small" type="button" style="margin-top:10px" onclick={() => picker.click()}>Elegir foto</button>
        {/if}
        <p class="notice" role="status">{avatarStatus}</p>
      </div>
    </div>
    <div class="field">
      <label for="nickname">Apodo único</label>
      <input id="nickname" minlength="3" maxlength="24" pattern={'[A-Za-z0-9_.\\-]{3,24}'} required placeholder="Ej. su_morenito_19" bind:value={nickname} />
      <small>3–24 letras, números, puntos, guiones o guiones bajos.</small>
    </div>
    <p class="notice" role="status">{status}</p>
    <button class="btn" type="submit">Guardar cambios</button>
  </form>
  {#if app.user}
    <div class="sectionhead" style="margin-top:34px">
      <div><h2 style="font-size:1.35rem">Privacidad</h2><p>Decide quién puede ver tu colección y tus estadísticas.</p></div>
      <button class="btn secondary" type="button" onclick={() => app.openPerson(app.user!.id)}>Ver mi perfil</button>
    </div>
    {#if app.privacy}
      <form class="card profile-card" onsubmit={savePrivacy}>
        <div class="formgrid">
          <div class="field"><label for="privacyCollection">Mi colección</label>
            <select id="privacyCollection" bind:value={privacy.collection} onchange={() => (privacyTouched = true)}>{#each Object.entries(VISIBILITY_LABELS) as [value, label] (value)}<option {value}>{label}</option>{/each}</select></div>
          <div class="field"><label for="privacyStats">Mis estadísticas</label>
            <select id="privacyStats" bind:value={privacy.stats} onchange={() => (privacyTouched = true)}>{#each Object.entries(VISIBILITY_LABELS) as [value, label] (value)}<option {value}>{label}</option>{/each}</select></div>
        </div>
        <p class="details">«Pública»: cualquiera con cuenta. «Solo mis amigos»: las personas que tienes añadidas en Comunidad con su cuenta vinculada. «Privada»: solo tú. Quien vea tu colección verá también las notas de tus juegos.</p>
        <p class="notice" role="status">{privacyStatus}</p>
        <button class="btn" type="submit">Guardar privacidad</button>
      </form>
    {:else}
      <p class="notice">Para elegir la privacidad, primero hay que activar los perfiles en Supabase (sql/profiles-privacy.sql).</p>
    {/if}
  {/if}
  <ConnectAI />

  {#if app.user}
    <div class="sectionhead" style="margin-top:34px"><div><h2 style="font-size:1.35rem">Borrar mi cuenta</h2><p>Elimina tu cuenta y tus datos para siempre.</p></div></div>
    <div class="card profile-card">
      <p class="details">Se borran tu colección, grupos, lugares, amigos, propuestas de compra y votos, avisos, foto y perfil. Las partidas que registraste en grupos de otras personas se quedan para ellas, y en todas las partidas tu nombre pasa a ser «Cuenta borrada». No se puede deshacer.</p>
      <button class="btn danger" type="button" style="margin-top:12px" onclick={startDelete}>Borrar mi cuenta</button>
    </div>
  {/if}
  <div class="sectionhead" style="margin-top:34px"><div><h2 style="font-size:1.35rem">Apariencia</h2><p>Elige un tema o sigue el que usa tu dispositivo.</p></div></div>
  <div class="theme-options theme-settings" role="group" aria-label="Elegir tema">
    {#each themes as [value, label] (value)}
      <button class="theme-choice" type="button" aria-pressed={theme.preference === value} onclick={() => theme.set(value)}>{label}</button>
    {/each}
  </div>
</section>

<Modal open={deleting} title="¿Borrar tu cuenta para siempre?" onclose={() => !deleteBusy && (deleting = false)}>
  <form onsubmit={confirmDelete}>
    <p class="details">Se borrarán tu cuenta y tus datos, y no se puede deshacer. Para confirmarlo, escribe tu apodo: <strong>{app.nickname}</strong>.</p>
    <div class="field"><label for="deleteConfirm">Tu apodo</label><input id="deleteConfirm" autocomplete="off" bind:value={deleteConfirm} /></div>
    <p class="notice" role="status">{deleteStatus}</p>
    <div class="formactions">
      <button type="button" class="btn ghost" disabled={deleteBusy} onclick={() => (deleting = false)}>Cancelar</button>
      <button class="btn danger" type="submit" disabled={deleteBusy || !deleteReady}>Borrar para siempre</button>
    </div>
  </form>
</Modal>
