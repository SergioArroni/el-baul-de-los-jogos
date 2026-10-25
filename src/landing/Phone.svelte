<script lang="ts">
  import type { Snippet } from 'svelte';

  /** A phone frame: a real screenshot (`src`) or a small live mock-up (`children`). */
  let { src = '', alt = '', children }: { src?: string; alt?: string; children?: Snippet } = $props();
</script>

<div class="phone">
  <div class="phone-screen">
    {#if src}<img {src} {alt} loading="lazy" decoding="async" />{:else if children}{@render children()}{/if}
  </div>
</div>
