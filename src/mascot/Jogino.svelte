<script lang="ts" module>
  export type JoginoPose = 'idle' | 'hola' | 'permiso' | 'vacio' | 'mareado';
</script>

<script lang="ts">
  import { PAINT, type JoginoColor } from './colors';
  import { jogino } from './prefs.svelte';

  /** Jogiño, the Baúl's wooden meeple with googly eyes. Drawn in a 100×100 box. */
  interface Props {
    pose?: JoginoPose;
    /** Defaults to the colour the person chose. */
    color?: JoginoColor;
    /** Where the pupils look, each axis from -1 to 1 (the thrown Jogiño moves them every frame). */
    look?: { x: number; y: number };
    /** Accessible name; without it the drawing is decorative. */
    label?: string;
  }

  let { pose = 'idle', color, look = { x: 0.2, y: 0.25 }, label }: Props = $props();

  const uid = $props.id();
  const paint = $derived(PAINT[color ?? jogino.color]);
  const SHAPE = 'M50 6C59 6 66 13 66 22C66 27 63.5 31 60 33.5C70 35.5 84 38 90 42.5C95.5 46.5 93.5 55.5 86.5 57C79 58.6 71 59.5 66 61.5C68 70 74.5 79 80.5 87C84 91.5 81 95.5 75.5 95.5L60 95.5C56.5 95.5 54.5 93 53.5 89.5L50 79L46.5 89.5C45.5 93 43.5 95.5 40 95.5L24.5 95.5C19 95.5 16 91.5 19.5 87C25.5 79 32 70 34 61.5C29 59.5 21 58.6 13.5 57C6.5 55.5 4.5 46.5 10 42.5C16 38 30 35.5 40 33.5C36.5 31 34 27 34 22C34 13 41 6 50 6Z';

  // Wood grain in the paint's grain colour (the filter wants it as 0–1 channels).
  const channels = $derived(paint.grain.match(/[0-9a-f]{2}/gi)!.map(hex => (parseInt(hex, 16) / 255).toFixed(3)));
  const grainMatrix = $derived(`0 0 0 0 ${channels[0]}  0 0 0 0 ${channels[1]}  0 0 0 0 ${channels[2]}  3.4 0 0 0 -1.45`);

  const clamp = (n: number) => Math.max(-1, Math.min(1, n));
  // Each googly eye has its own size, so the pupils travel differently.
  const leftPupil = $derived({ x: 43 + clamp(look.x) * 3.6, y: 19 + clamp(look.y) * 3.6 });
  const rightPupil = $derived({ x: 58 + clamp(look.x) * 4.4, y: 18 + clamp(look.y) * 4.4 });
  const MOUTHS: Record<JoginoPose, string> = {
    idle: 'M45 29.5q5.5 4.5 11 0',
    hola: 'M44.5 29q6 5.5 12 0',
    permiso: 'M46.5 29.5h8',
    vacio: 'M46 31q4.5-3 9 0',
    mareado: 'M44 30.5q2.5-2.4 5 0t5 0t5 0',
  };
</script>

<svg class="jogino" viewBox="-8 -6 118 108" role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : 'true'}>
  <defs>
    <linearGradient id="{uid}-paint" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color={paint.light} /><stop offset="1" stop-color={paint.dark} />
    </linearGradient>
    <radialGradient id="{uid}-shine" cx=".36" cy=".22" r=".55">
      <stop offset="0" stop-color="#fff" stop-opacity=".42" /><stop offset="1" stop-color="#fff" stop-opacity="0" />
    </radialGradient>
    <filter id="{uid}-grain" x="0" y="0" width="100" height="100" filterUnits="userSpaceOnUse">
      <feTurbulence type="fractalNoise" baseFrequency="0.2 0.016" numOctaves="2" seed="7" />
      <feColorMatrix type="matrix" values={grainMatrix} />
      <feComposite in2="SourceGraphic" operator="in" />
    </filter>
  </defs>

  <ellipse cx="50" cy="97" rx="34" ry="3.6" fill="#10201833" />
  <g transform={pose === 'vacio' ? 'translate(-6 0)' : undefined}>
    <path d={SHAPE} fill="url(#{uid}-paint)" />
    <path d={SHAPE} fill="url(#{uid}-shine)" />
    <path d={SHAPE} fill="#000" filter="url(#{uid}-grain)" opacity={paint.grainOpacity} />

    <circle cx="43" cy="19" r="7.2" fill="#fff" stroke="#1d2923" stroke-width="1.1" />
    <circle cx="58" cy="18" r="8.4" fill="#fff" stroke="#1d2923" stroke-width="1.1" />
    <circle cx={leftPupil.x} cy={leftPupil.y} r="3" fill="#1d2923" />
    <circle cx={rightPupil.x} cy={rightPupil.y} r="3.4" fill="#1d2923" />
    <path d={MOUTHS[pose]} fill="none" stroke="#1d2923" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    {#if pose === 'hola'}
      <circle cx="38.5" cy="27" r="2.6" fill="#f07a62" opacity=".55" /><circle cx="62.5" cy="27" r="2.6" fill="#f07a62" opacity=".55" />
    {/if}
  </g>

  {#if pose === 'permiso'}
    <!-- Holding up a pass with a tick: "may I let them in?" -->
    <g transform="translate(78 36) rotate(12)">
      <rect width="26" height="17" rx="3" fill="#fffefa" stroke="#d9dccf" />
      <path d="M6 9l4 4 9-8" fill="none" stroke="#245b45" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
    </g>
  {:else if pose === 'vacio'}
    <!-- An empty open box beside him. -->
    <g transform="translate(70 62)">
      <path d="M0 10h36v24H0z" fill="#b9814f" /><path d="M0 10h36v6H0z" fill="#9c6a3f" />
      <path d="M0 10L-6 0h36l6 10z" fill="#d5a06c" /><path d="M4 22h28" stroke="#9c6a3f" stroke-width="1.4" />
    </g>
  {/if}
</svg>

<style>
  .jogino { display: block; width: 100%; height: 100%; overflow: visible; }
</style>
