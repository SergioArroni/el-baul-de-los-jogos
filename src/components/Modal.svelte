<script lang="ts">
  import type { Snippet } from 'svelte';
  import { cardEnter } from '../motion';

  interface Props {
    open: boolean;
    title: string;
    onclose: () => void;
    children: Snippet;
    /** Replaces the default title bar (the game sheet uses a cover instead). */
    header?: Snippet;
    dialogClass?: string;
    labelId?: string;
  }

  let { open, title, onclose, children, header, dialogClass = '', labelId }: Props = $props();
  const fallbackId = 'modal-' + Math.random().toString(36).slice(2, 8);
  const id = $derived(labelId ?? fallbackId);
</script>

<svelte:window onkeydown={event => { if (open && event.key === 'Escape') onclose(); }} />

{#if open}
  <!-- Clicking the dimmed backdrop closes the dialog; Escape does the same from the keyboard. -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="modal open" onclick={event => { if (event.target === event.currentTarget) onclose(); }}>
    <div class="dialog {dialogClass}" use:cardEnter role="dialog" aria-modal="true" aria-labelledby={id}>
      {#if header}
        {@render header()}
      {:else}
        <div class="dialoghead">
          <h2 {id}>{title}</h2>
          <button class="x" type="button" aria-label="Cerrar" onclick={onclose}>×</button>
        </div>
      {/if}
      {@render children()}
    </div>
  </div>
{/if}
