<script lang="ts" module>
  // How many dialogs are open: the page behind stays still while there is at least one.
  let openCount = 0;

  function lockScroll(lock: boolean) {
    openCount += lock ? 1 : -1;
    const root = document.documentElement;
    if (openCount === 1 && lock) {
      // Keep the room the scrollbar took, so the page doesn't jump sideways.
      root.style.paddingRight = `${innerWidth - root.clientWidth}px`;
      root.style.overflow = 'hidden';
    } else if (openCount === 0) {
      root.style.overflow = '';
      root.style.paddingRight = '';
    }
  }

  const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
</script>

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
  let backdrop = $state<HTMLDivElement>();

  /** With one dialog on top of another (a confirmation over a form), keys only reach the top one. */
  const onTop = () => !!backdrop && [...document.querySelectorAll('.modal.open')].at(-1) === backdrop;

  function keydown(event: KeyboardEvent) {
    if (!open || !onTop()) return;
    if (event.key === 'Escape') {
      // One Escape closes one dialog: the others (also listening on the window) must not see it.
      event.stopImmediatePropagation();
      return onclose();
    }
    if (event.key !== 'Tab' || !backdrop) return;
    // Tab stays inside the dialog instead of wandering to the page behind.
    const items = [...backdrop.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(item => item.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    // Focus may be on the dialog itself (just opened) or outside: both count as "at the edge".
    const active = document.activeElement as HTMLElement | null;
    const outside = !active || !items.includes(active);
    if (event.shiftKey && (active === first || outside)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || outside)) {
      event.preventDefault();
      first.focus();
    }
  }

  /** Action: focus goes into the dialog when it opens and back to where it was when it closes. */
  function dialogFocus(node: HTMLElement) {
    const previous = document.activeElement as HTMLElement | null;
    lockScroll(true);
    // Not the first field: on phones that would pop the keyboard up over the form.
    if (!node.contains(document.activeElement)) node.focus({ preventScroll: true });
    return {
      destroy() {
        lockScroll(false);
        if (previous?.isConnected) previous.focus({ preventScroll: true });
      },
    };
  }
</script>

<svelte:window onkeydown={keydown} />

{#if open}
  <!-- Clicking the dimmed backdrop closes the dialog; Escape does the same from the keyboard. -->
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
  <div class="modal open" bind:this={backdrop} onclick={event => { if (event.target === event.currentTarget) onclose(); }}>
    <div class="dialog {dialogClass}" use:cardEnter use:dialogFocus role="dialog" aria-modal="true" aria-labelledby={id} tabindex="-1">
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

<style>
  .dialog:focus { outline: none; }
</style>
