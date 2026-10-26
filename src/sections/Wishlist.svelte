<script lang="ts">
  import MeepleToken from '../components/MeepleToken.svelte';
  import EmptyState from '../components/EmptyState.svelte';
  import CatalogSuggest from '../components/CatalogSuggest.svelte';
  import Modal from '../components/Modal.svelte';
  import { deleteProposal, proposeGame, setMeeple } from '../data/wishlist';
  import { MEEPLES, meeplesLeft } from '../domain/wishlist';
  import { safeHttpUrl } from '../domain/text';
  import { tap } from '../platform/native';
  import type { WishlistGame, WishlistHype } from '../domain/types';
  import { app } from '../stores/app.svelte';
  import { askConfirm } from '../stores/confirm.svelte';

  let status = $state('');
  let open = $state(false);
  let formStatus = $state('');
  const empty = { title: '', url: '', hype: '' as WishlistHype | '', price: '', publisher: '', players: '', duration: '', description: '', notes: '' };
  let form = $state({ ...empty });

  const HYPE: Record<WishlistHype, string> = { culo: 'Me lo meto por el culo', 'le-daba': 'Yo le daba', 'y-si-si': '¿Y si sí?' };

  const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  /** Most meeples first, then newest. */
  const ranked = $derived(app.wishlist
    .map(game => ({ game, voters: app.votes.filter(v => v.game_id === game.id).map(v => v.user_id) }))
    .sort((a, b) => b.voters.length - a.voters.length || new Date(b.game.created_at).getTime() - new Date(a.game.created_at).getTime()));
  const left = $derived(app.user ? meeplesLeft(app.votes, app.user.id) : 0);
  /** The proposal that just got your meeple, so only that one drops in. */
  let justPlaced = $state('');

  function toggleMeeple(game: WishlistGame, placed: boolean) {
    tap();
    justPlaced = placed ? '' : game.id;
    void run(() => setMeeple(game.id, app.user!.id, !placed));
  }

  async function run(action: () => Promise<void>) {
    status = '';
    try {
      await action();
      await app.reloadWishlist();
    } catch (error) {
      status = (error as Error).message;
    }
  }

  function startProposal() {
    if (!app.user) return void (status = 'Inicia sesión para proponer juegos.');
    form = { ...empty };
    formStatus = '';
    open = true;
  }

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    const url = safeHttpUrl(form.url.trim());
    if (form.url.trim() && !url) return void (formStatus = 'Introduce un enlace http o https válido, o déjalo vacío.');
    if (!form.hype) return void (formStatus = 'Elige tus ganas de jogo.');
    formStatus = 'Guardando propuesta…';
    try {
      await proposeGame({
        user_id: app.user!.id, title: form.title.trim(), url, hype: form.hype, description: form.description.trim(),
        price: form.price ? Number(form.price) : null, publisher: form.publisher.trim() || null,
        players: form.players.trim() || null, duration: form.duration.trim() || null, notes: form.notes.trim() || null,
      });
      open = false;
      await app.reloadWishlist();
    } catch (error) {
      formStatus = (error as Error).message;
    }
  }

  async function remove(game: WishlistGame) {
    if (await askConfirm({ title: '¿Quitar esta propuesta?', text: 'Desaparecerá de la lista compartida, con todos sus meeples.', confirmLabel: 'Quitar', danger: true }))
      await run(() => deleteProposal(game.id, app.user!.id));
  }
</script>

<section class="panel active">
  <div class="sectionhead">
    <div><h2>Próximos juegos</h2><p>Proponed juegos y poned vuestros meeples en los que más os apetecen: cada uno tiene {MEEPLES}. El que más junte, al carrito.</p></div>
    <button class="btn" onclick={startProposal}>＋ Proponer juego</button>
  </div>
  {#if app.user}<p class="meeple-left"><span class="meeples">{#each Array.from({ length: MEEPLES }) as _, i (i)}<span class="meeple" class:used={i >= left}></span>{/each}</span> Te {left === 1 ? 'queda' : 'quedan'} {left} {left === 1 ? 'meeple' : 'meeples'}</p>{/if}
  <p class="notice" role="status">{app.user ? status : 'Inicia sesión para ver y proponer compras compartidas.'}</p>
  <div class="grid">
    {#if !app.user}
      <div class="empty" style="grid-column:1/-1">Inicia sesión para compartir propuestas de compra.</div>
    {:else}
      {#each ranked as { game, voters } (game.id)}
        {@const voted = voters.includes(app.user.id)}
        {@const url = safeHttpUrl(game.url)}
        <article class="card">
          <div class="cardtop">
            <div class="emoji">🛒</div>
            <div><h3>{game.title}</h3><div class="sub">{game.publisher ? game.publisher + ' · ' : ''}{game.players ? game.players + ' jugadores · ' : ''}{game.duration ?? ''}</div></div>
          </div>
          {#if game.description}<p class="details">{game.description}</p>{/if}
          <div class="tags">
            <span class="tag green">{game.price == null ? 'Precio por confirmar' : euros.format(game.price)}</span>
            {#if game.hype && HYPE[game.hype]}<span class="tag">Ganas: {HYPE[game.hype]}</span>{/if}
            <span class="meeple-row" aria-label="{voters.length} {voters.length === 1 ? 'meeple' : 'meeples'}">
              {#each voters as voter (voter)}<MeepleToken userId={voter} fresh={voter === app.user.id && justPlaced === game.id} />{/each}
              {#if !voters.length}<span class="meeple-empty">Sin meeples</span>{/if}
            </span>
          </div>
          {#if game.notes}<p class="details">{game.notes}</p>{/if}
          <div class="cardfoot">
            {#if url}<a class="btn secondary" href={url} target="_blank" rel="noopener noreferrer">Ver ficha / tienda</a>{/if}
            <button class="btn {voted ? 'secondary' : 'ghost'}" disabled={!voted && !left} onclick={() => toggleMeeple(game, voted)}>{voted ? 'Quitar mi meeple' : left ? 'Poner mi meeple' : 'Sin meeples libres'}</button>
            {#if game.user_id === app.user.id}<button class="btn ghost" onclick={() => remove(game)}>Quitar</button>{/if}
          </div>
        </article>
      {:else}
        <EmptyState>Todavía no hay propuestas. Añade la primera compra candidata.</EmptyState>
      {/each}
    {/if}
  </div>
</section>

<Modal {open} title="Proponer un juego" onclose={() => (open = false)}>
  <form onsubmit={submit}>
    <div class="formgrid">
      <div class="field full"><label for="wishTitle">Nombre del juego *</label><input id="wishTitle" required maxlength="120" autocomplete="off" bind:value={form.title} />
        <CatalogSuggest query={form.title} onpick={draft => (form = { ...form, title: draft.name, players: draft.players || form.players, duration: draft.duration ? `${draft.duration} min` : form.duration, url: form.url || `https://boardgamegeek.com/boardgame/${draft.bggId}` })} /></div>
      <div class="field full"><label for="wishUrl">Enlace a la tienda o ficha</label><input id="wishUrl" type="url" placeholder="https://…" bind:value={form.url} /></div>
      <div class="field full"><label for="wishHype">Ganas de jogo *</label><select id="wishHype" bind:value={form.hype}><option value="" disabled>Elige…</option>{#each Object.entries(HYPE) as [value, label] (value)}<option {value}>{label}</option>{/each}</select></div>
      <div class="field"><label for="wishPrice">Precio aproximado (€)</label><input id="wishPrice" type="number" min="0" step="0.01" placeholder="Ej. 39,95" bind:value={form.price} /></div>
      <div class="field"><label for="wishPublisher">Editorial</label><input id="wishPublisher" maxlength="100" bind:value={form.publisher} /></div>
      <div class="field"><label for="wishPlayers">Jugadores</label><input id="wishPlayers" maxlength="40" placeholder="Ej. 2–4" bind:value={form.players} /></div>
      <div class="field"><label for="wishDuration">Duración</label><input id="wishDuration" maxlength="40" placeholder="Ej. 60–90 min" bind:value={form.duration} /></div>
      <div class="field full"><label for="wishDescription">Descripción *</label><textarea id="wishDescription" required maxlength="1000" placeholder="De qué va y por qué os interesa…" bind:value={form.description}></textarea></div>
      <div class="field full"><label for="wishNotes">Otros datos</label><textarea id="wishNotes" maxlength="500" placeholder="Edición, expansiones, idioma u otros detalles" bind:value={form.notes}></textarea></div>
    </div>
    <p class="message" role="status">{formStatus}</p>
    <div class="formactions"><button type="button" class="btn ghost" onclick={() => (open = false)}>Cancelar</button><button class="btn" type="submit">Añadir a la lista</button></div>
  </form>
</Modal>
