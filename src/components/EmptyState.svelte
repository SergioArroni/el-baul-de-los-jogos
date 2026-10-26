<script lang="ts">
  import type { Snippet } from 'svelte';
  import Jogino from '../mascot/Jogino.svelte';

  /** "Nothing here yet": Jogiño peering into an empty box, with the explanation beside him. */
  let { children }: { children: Snippet } = $props();
</script>

<div class="empty empty-jogino">
  <span class="empty-figure"><Jogino pose="vacio" /></span>
  <p>{@render children()}</p>
</div>

<style>
  .empty-jogino { display: flex; flex-direction: column; align-items: center; gap: 10px; }
  .empty-figure { width: 92px; height: 84px; }
  p { max-width: 42ch; margin: 0; }
</style>
