<script lang="ts">
  import { meepleColour } from '../domain/wishlist';
  import { drop } from '../motion';
  import { app } from '../stores/app.svelte';

  /** A meeple with the person's photo inside (or their colour), dropped in when just placed. */
  let { userId, fresh = false }: { userId: string; fresh?: boolean } = $props();

  const person = $derived(app.people.get(userId));
  const photo = $derived(userId === app.user?.id ? app.avatarUrl : person?.avatarUrl ?? '');
  const name = $derived(userId === app.user?.id ? 'Tú' : '@' + (person?.nickname ?? '?'));
</script>

<span class="meeple-token" style:--meeple={meepleColour(userId)} style:background-image={/^https:|^data:image|^blob:/.test(photo) ? `url("${photo}")` : undefined} title={name} use:drop={fresh}>
  <span class="visually-hidden">{name}</span>
</span>
