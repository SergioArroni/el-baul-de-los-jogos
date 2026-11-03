<svelte:options namespace="svg" />

<script lang="ts">
  import type { Costume } from './seasons';

  /**
   * Jogiño's costume, drawn in his 100×100 box in three layers: behind him, on his face
   * (under the googly eyes) and in front. Hand-held things go in his left hand, since the
   * right one holds the pass or stands by the empty box in other poses.
   */
  let { costume, layer }: { costume: Costume; layer: 'back' | 'face' | 'front' } = $props();

  const HEART = 'M0 1.2C0-1-3-1.5-3 .8C-3 2.6 0 4 0 4.6C0 4 3 2.6 3 .8C3-1.5 0-1 0 1.2Z';
</script>

{#snippet scarf(main: string, stripe: string)}
  <path d="M37.5 31.5Q50 37.5 62.5 31.5L63.5 37Q50 43 36.5 37Z" fill={main} />
  <path d="M55 37.5L59.5 53.5L52.5 54.5L50.5 38.5Z" fill={main} />
  <path d="M53.6 45.2l5-.8M54.7 49.4l5-.8" stroke={stripe} stroke-width="2" />
  <path d="M40 34.5q10 4.5 20 0" fill="none" stroke={stripe} stroke-width="1.6" opacity=".7" />
{/snippet}

{#if layer === 'back'}
  {#if costume === 'verano'}
    <!-- The back half of the swim ring, behind his waist. -->
    <path d="M25.5 65A24.5 7 0 0 1 74.5 65" fill="none" stroke="#b83a2c" stroke-width="7" />
  {/if}
{:else if layer === 'face'}
  {#if costume === 'carnaval'}
    <!-- A mask round his googly eyes, with a feather. -->
    <path d="M70 12Q81 1 79-10Q73-1 67 9Z" fill="#e8b830" />
    <path d="M29.5 17Q32.5 8.5 43 9.5Q49.5 11 51.5 13Q55 8 62.5 8Q71.5 8.5 71.5 17Q70.5 26 61 27.5Q55 27.5 51.5 22.5Q48 27.5 42 27.5Q31.5 27 29.5 17Z" fill="#7a3fa0" />
    <circle cx="33" cy="15" r="1.1" fill="#f6dc7a" /><circle cx="68" cy="13" r="1.1" fill="#f6dc7a" /><circle cx="51.5" cy="17.5" r="1.1" fill="#f6dc7a" />
  {/if}
{:else if costume === 'halloween'}
  <!-- Witch's hat, a bit crooked, and a pumpkin. -->
  <path d="M38 8.5Q44-6 50-14Q55-21 66-19Q58-14 57-4L62 7Q50 4.5 38 8.5Z" fill="#4a3b5c" stroke="#76639a" stroke-width=".9" stroke-linejoin="round" />
  <path d="M39.6 4.8Q50 1.6 60.6 3.6L61.8 6.6Q50 4 38.4 8Z" fill="#f08a24" />
  <path d="M29.5 9.5Q50 2 72 7.5Q74.5 11 70 11.5Q50 8 32 13.5Q27 13 29.5 9.5Z" fill="#33283f" stroke="#76639a" stroke-width=".9" />
  <g transform="translate(9 54)">
    <path d="M-1-8q1-4 4.5-4" fill="none" stroke="#4d7a3a" stroke-width="2.2" stroke-linecap="round" />
    <ellipse rx="10.5" ry="8.5" fill="#f08a24" />
    <ellipse rx="4.5" ry="8.5" fill="none" stroke="#c9661a" stroke-width="1.2" />
    <path d="M-5.5-2l2.5-3 2.5 3zM.5-2l2.5-3 2.5 3zM-5 2.5q5 3.5 10 0l-2 1.2-1.5-1-1.5 1-1.5-1-1.5 1z" fill="#3a2a1a" />
  </g>
{:else if costume === 'navidad'}
  <!-- Father Christmas's hat and a red scarf with green stripes. -->
  {@render scarf('#c23a30', '#2f7a4b')}
  <path d="M34 9Q37-8 54-9Q68-9 76 4Q78 9 74 11Q70 2 64 2Q66 5 66.5 8Q50 2 34 9Z" fill="#d23c32" />
  <path d="M31.5 10Q50 1 68.5 8Q70.5 12.5 67 13.5Q50 6.5 33 14.5Q29 13 31.5 10Z" fill="#fffaf2" stroke="#dcd0bd" stroke-width=".9" />
  <circle cx="75" cy="10.5" r="4.6" fill="#fffaf2" stroke="#dcd0bd" stroke-width=".9" />
{:else if costume === 'finDeAno'}
  <!-- Party hat and a party horn. -->
  <g transform="rotate(14 54 6)">
    <path d="M44 8L54-16L64 8Z" fill="#2f5fb0" />
    <path d="M47.4 0h13.2M50.6-8h6.8" stroke="#f4c542" stroke-width="3" />
    <circle cx="54" cy="-17" r="3" fill="#f4c542" />
  </g>
  <path d="M52 30.5L69 33" stroke="#e0533f" stroke-width="3" stroke-linecap="round" />
  <path d="M69 33q6 1 6.5-4q.3-4-3.5-3.5" fill="none" stroke="#e0533f" stroke-width="3" stroke-linecap="round" />
{:else if costume === 'reyes'}
  <!-- A Wise Man's crown. -->
  <g transform="rotate(-6 50 2)">
    <path d="M36 10L35-5L42.5 2L50-9L57.5 2L65-5L64 10Q50 6.5 36 10Z" fill="#e8b830" stroke="#b9861a" stroke-linejoin="round" />
    <circle cx="35" cy="-5" r="1.7" fill="#f6dc7a" /><circle cx="50" cy="-9" r="1.7" fill="#f6dc7a" /><circle cx="65" cy="-5" r="1.7" fill="#f6dc7a" />
    <circle cx="50" cy="4.5" r="2.3" fill="#d23c32" /><circle cx="41.5" cy="6" r="1.6" fill="#2f5fb0" /><circle cx="58.5" cy="6" r="1.6" fill="#2f7a4b" />
  </g>
{:else if costume === 'sanValentin'}
  <!-- Hearts on his cheeks and Cupid's arrow. -->
  <path d={HEART} transform="translate(37.5 25.5) scale(.9)" fill="#e2557a" />
  <path d={HEART} transform="translate(63.5 25) scale(.9)" fill="#e2557a" />
  <path d="M-1 66L21 43" stroke="#9c6a3f" stroke-width="1.8" stroke-linecap="round" />
  <path d="M1 64L.4 69M1 64L-4 64.8M3.5 61.4L2.9 66.4M3.5 61.4L-1.5 62.2" stroke="#e2557a" stroke-width="1.6" stroke-linecap="round" />
  <path d={HEART} transform="translate(22.5 41.5) rotate(-135) scale(1.4)" fill="#e2557a" />
{:else if costume === 'carnaval'}
  <!-- Confetti stuck on him after the party. -->
  <rect x="22" y="5" width="3" height="5" rx="1" fill="#e0533f" transform="rotate(25 23 7)" />
  <rect x="78" y="25" width="3" height="5" rx="1" fill="#2f5fb0" transform="rotate(-30 79 27)" />
  <rect x="14" y="31" width="3" height="5" rx="1" fill="#f4c542" transform="rotate(60 15 33)" />
  <circle cx="44" cy="52" r="1.6" fill="#59a472" /><circle cx="60" cy="74" r="1.6" fill="#e2557a" /><circle cx="86" cy="47" r="1.6" fill="#f4c542" />
{:else if costume === 'primavera'}
  <!-- A flower on his head. -->
  <path d="M56 9Q49.5 3 52-1.5Q57.5 3 56 9Z" fill="#59a472" />
  {#each [0, 72, 144, 216, 288] as turn (turn)}
    <ellipse cx="62" cy="0" rx="3.4" ry="5" fill="#f4a3c0" transform="rotate({turn} 62 5)" />
  {/each}
  <circle cx="62" cy="5" r="2.8" fill="#f4c542" />
{:else if costume === 'verano'}
  <!-- Sunglasses pushed up on his head and a swim ring round his waist. -->
  <g transform="rotate(-8 50 6)">
    <rect x="35" y="1.5" width="13" height="8" rx="3.5" fill="#1d2923" stroke="#6f7f75" stroke-width=".9" />
    <rect x="52" y="1.5" width="13" height="8" rx="3.5" fill="#1d2923" stroke="#6f7f75" stroke-width=".9" />
    <path d="M48 4h4" stroke="#1d2923" stroke-width="1.8" />
    <path d="M38 4l4-1M55 4l4-1" stroke="#fff" stroke-width="1.2" stroke-linecap="round" opacity=".55" />
  </g>
  <path d="M25.5 65A24.5 7 0 0 0 74.5 65" fill="none" stroke="#e0533f" stroke-width="7" stroke-linecap="round" />
  <path d="M25.5 65A24.5 7 0 0 0 74.5 65" fill="none" stroke="#fffaf2" stroke-width="7" stroke-dasharray="6 9" stroke-dashoffset="-3" />
{:else if costume === 'otono'}
  <!-- An autumn scarf and a leaf that landed on his head. -->
  {@render scarf('#d9822b', '#8a4b1f')}
  <path d="M58 7Q60-3 71-4Q70 5 58 7Z" fill="#c9661a" />
  <path d="M58 7Q63 1 69-2.5" fill="none" stroke="#8a4b1f" stroke-width=".9" />
{/if}
