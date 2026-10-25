<script lang="ts">
  import { onMount } from 'svelte';
  import CardFan from '../components/CardFan.svelte';
  import { supabase } from '../data/client';

  // Supabase sends the person here (Site URL + /oauth/consent) when an app such as
  // Claude or ChatGPT asks to connect: they approve or deny, and go back to that app.
  interface Request {
    clientName: string;
    clientUri: string;
    email: string;
  }

  const authorizationId = new URLSearchParams(location.search).get('authorization_id') ?? '';
  let request = $state<Request | null>(null);
  let status = $state('Comprobando tu sesión…');
  let busy = $state(false);

  onMount(async () => {
    if (!supabase) return void (status = 'El acceso no está disponible ahora mismo. Inténtalo más tarde.');
    if (!authorizationId) return void (status = 'Falta la petición de permiso. Vuelve a conectar desde Claude o ChatGPT.');
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      location.replace('/login.html?next=' + encodeURIComponent(location.pathname + location.search));
      return;
    }
    const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authorizationId);
    if (error || !data) return void (status = 'Esta petición ya no es válida. Vuelve a conectar desde Claude o ChatGPT.');
    // Already approved before: straight back to the app.
    if (!('authorization_id' in data)) return void location.replace(data.redirect_url);
    request = { clientName: data.client.name || 'Una aplicación', clientUri: data.client.uri, email: data.user.email };
    status = '';
  });

  async function decide(approve: boolean) {
    if (!supabase) return;
    busy = true;
    status = approve ? 'Conectando…' : 'Cancelando…';
    const { data, error } = approve
      ? await supabase.auth.oauth.approveAuthorization(authorizationId)
      : await supabase.auth.oauth.denyAuthorization(authorizationId);
    if (error || !data) {
      status = 'No se pudo completar. Vuelve a intentarlo desde Claude o ChatGPT.';
      busy = false;
      return;
    }
    location.href = data.redirect_url;
  }
</script>

<main class="consent grain">
  <div class="consent-fan"><CardFan width={92} slugs={['hanabi', 'azul', 'carcassonne', 'mysterium', 'sushi-go']} /></div>
  <section class="consent-card" aria-labelledby="consentTitle">
    {#if request}
      <p class="eyebrow">Conectar con El Baúl de los Jogos</p>
      <h1 id="consentTitle">¿Dejas que {request.clientName} vea tu baúl?</h1>
      <p>Podrá <strong>consultar</strong> tu colección, tus grupos y tus partidas para responderte. <strong>No podrá cambiar nada.</strong></p>
      <ul>
        <li>Tus juegos, dónde están y cómo son.</li>
        <li>Tus grupos y tus amigos.</li>
        <li>Tus partidas y sus estadísticas.</li>
      </ul>
      <p class="consent-who">Entraste como <strong>{request.email}</strong>.{#if request.clientUri} Web de la aplicación: {request.clientUri}{/if}</p>
      <div class="consent-actions">
        <button class="btn ghost" type="button" disabled={busy} onclick={() => decide(false)}>Ahora no</button>
        <button class="btn" type="button" disabled={busy} onclick={() => decide(true)}>Permitir</button>
      </div>
    {:else}
      <h1 id="consentTitle">Conectar con El Baúl de los Jogos</h1>
    {/if}
    <p class="notice" role="status">{status}</p>
  </section>
</main>
