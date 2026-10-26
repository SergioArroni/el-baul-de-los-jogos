<script lang="ts" module>
  export type { IconName } from './icons';
</script>

<script lang="ts">
  import { ICONS, type IconName } from './icons';

  /** A line icon in the current text colour; decorative unless it gets a label. */
  let { name, size = '1.05em', label }: { name: IconName; size?: string; label?: string } = $props();
</script>

<svg
  class="icon"
  viewBox="0 0 24 24"
  width={size}
  height={size}
  fill="none"
  stroke="currentColor"
  stroke-width="1.9"
  stroke-linecap="round"
  stroke-linejoin="round"
  role={label ? 'img' : undefined}
  aria-label={label}
  aria-hidden={label ? undefined : 'true'}
>
  {@html ICONS[name]}
</svg>

<style>
  .icon { display: inline-block; flex: none; vertical-align: -0.16em; }
</style>
