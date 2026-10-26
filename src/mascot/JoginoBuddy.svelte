<script lang="ts">
  import { onMount } from 'svelte';
  import { gsap, prefersReducedMotion } from '../motion';
  import { JOGINO_COLORS, PAINT } from './colors';
  import Jogino, { type JoginoPose } from './Jogino.svelte';
  import { nearestUpright, releaseVelocity, step, type Body } from './physics';
  import { jogino, saveJogino } from './prefs.svelte';

  /**
   * Jogiño lives in a corner of the screen. Tap him and he offers to connect your Claude or
   * ChatGPT; grab him and throw him: he flies, bounces off the edges, lands (dizzy if he spun
   * a lot), walks back under his shelf and, since it's up high, takes out a ladder and climbs.
   * With reduced motion he just stays on his shelf.
   */
  interface Props {
    text: string;
    /** A link (landing) or something to do (the app opens «Mi perfil»). */
    action: { label: string; href?: string; onclick?: () => void };
    /** In the app he can be hidden (and shown again from "Mi perfil"). */
    canHide?: boolean;
    /** Space to leave under him, e.g. the app's bottom tab bar on phones. */
    floorGap?: () => number;
    /** How high his shelf (his home, "the chat") is above the floor. */
    shelf?: number;
  }

  let { text, action, canHide = false, floorGap = () => 0, shelf = 64 }: Props = $props();

  const W = 68;
  const H = 62;
  const MARGIN = 14;

  let body = $state<Body>({ x: -200, y: -200, vx: 0, vy: 0, angle: 0, spin: 0 });
  let mode = $state<'home' | 'held' | 'flying' | 'standing' | 'walking' | 'ladder' | 'climbing'>('home');
  /** Ladder height in px while he uses it (0 = put away). */
  let ladder = $state(0);
  /** Where he lands this flight: the floor, or his shelf when he drops in at the start. */
  let landOnShelf = false;
  let pose = $state<JoginoPose>('idle');
  let look = $state({ x: 0.2, y: 0.25 });
  let open = $state(false);
  let button: HTMLButtonElement;
  let bubble = $state<HTMLDivElement>();

  // Pupils: a spring towards where he's looking, kicked by every change of speed (googly eyes).
  let eyeTarget = { x: 0.2, y: 0.25 };
  let eyeSpeed = { x: 0, y: 0 };
  let lastVelocity = { vx: 0, vy: 0 };
  let spun = 0;
  let walkPhase = 0;
  let dizzyUntil = 0;
  let calm = false;
  let standUp: gsap.core.Tween | undefined;
  let ladderTween: gsap.core.Tween | undefined;
  let bubbleAt = $state({ right: 0, bottom: 0 });

  // The window size as state, so the shelf follows when it changes.
  let view = $state({ width: innerWidth, height: innerHeight });
  const floor = () => view.height - H - floorGap() - MARGIN;
  const home = () => ({ x: view.width - W - MARGIN, y: floor() - shelf });
  const bounds = () => ({ right: view.width - W, floor: landOnShelf ? home().y : floor() });

  function tick(_time: number, deltaMs: number) {
    const dt = Math.min(deltaMs, 40) / 1000;
    let { vx, vy } = lastVelocity;

    if (mode === 'flying') {
      const before = body.angle;
      const next = step(body, bounds(), dt);
      body = next.body;
      spun += Math.abs(body.angle - before);
      ({ vx, vy } = body);
      if (next.resting) land();
    } else if (mode === 'walking') {
      const target = home().x;
      const direction = Math.sign(target - body.x);
      walkPhase += dt * 11;
      const x = body.x + direction * 150 * dt;
      const arrived = direction === 0 || (direction > 0 ? x >= target : x <= target);
      body = { ...body, x: arrived ? target : x, y: floor() - Math.abs(Math.sin(walkPhase)) * 5, angle: Math.sin(walkPhase) * 7 };
      eyeTarget = { x: direction * 0.85, y: 0.1 };
      vx = direction * 150;
      vy = 0;
      if (arrived) {
        if (floor() - home().y > 6) takeOutLadder();
        else arrive();
      }
    } else if (mode === 'climbing') {
      // Rung by rung, wobbling a little, eyes on the top.
      walkPhase += dt * 12;
      const y = Math.max(home().y, body.y - 95 * dt);
      body = { ...body, x: home().x, y, angle: Math.sin(walkPhase) * 4 };
      eyeTarget = { x: 0, y: -0.9 };
      vx = 0;
      vy = -95;
      if (y === home().y) {
        arrive();
        ladderTween = gsap.to({ height: ladder }, { height: 0, duration: 0.3, ease: 'power2.in', onUpdate() { ladder = this.targets()[0].height; } });
      }
    }

    // Dizzy: the pupils roll round and round for a moment.
    if (performance.now() < dizzyUntil) {
      const t = performance.now() / 160;
      eyeTarget = { x: Math.cos(t), y: Math.sin(t) };
    }
    const kick = 0.00035;
    eyeSpeed.x += ((eyeTarget.x - look.x) * 160 - eyeSpeed.x * 9) * dt - ((vx - lastVelocity.vx) / Math.max(dt, 0.001)) * kick * dt * 60;
    eyeSpeed.y += ((eyeTarget.y - look.y) * 160 - eyeSpeed.y * 9) * dt - ((vy - lastVelocity.vy) / Math.max(dt, 0.001)) * kick * dt * 60;
    let x = look.x + eyeSpeed.x * dt;
    let y = look.y + eyeSpeed.y * dt;
    const reach = Math.hypot(x, y);
    if (reach > 1) {
      // The pupil hits the rim of the eye and bounces back a little.
      x /= reach;
      y /= reach;
      eyeSpeed = { x: -eyeSpeed.x * 0.4, y: -eyeSpeed.y * 0.4 };
    }
    look = { x, y };
    lastVelocity = { vx, vy };

    // Nothing moving: stop the clock until something happens.
    calm = mode === 'home' && performance.now() > dizzyUntil && Math.hypot(eyeSpeed.x, eyeSpeed.y) < 0.02 && Math.hypot(eyeTarget.x - x, eyeTarget.y - y) < 0.02;
    if (calm) gsap.ticker.remove(tick);
  }

  function wake() {
    gsap.ticker.remove(tick);
    gsap.ticker.add(tick);
  }

  function takeOutLadder() {
    mode = 'ladder';
    body = { ...body, x: home().x, y: floor(), angle: 0 };
    eyeTarget = { x: 0, y: -0.9 };
    const target = floor() - home().y;
    ladderTween = gsap.to({ height: 0 }, {
      height: target, duration: 0.4, ease: 'back.out(1.6)',
      onUpdate() { ladder = this.targets()[0].height; },
      onComplete: () => void (mode === 'ladder' && (mode = 'climbing')),
    });
  }

  function throwFrom(vx: number, vy: number) {
    spun = 0;
    body = { ...body, vx, vy, spin: vx * 0.3 };
    mode = 'flying';
    pose = 'idle';
    wake();
  }

  function land() {
    if (landOnShelf) {
      landOnShelf = false;
      arrive();
      return;
    }
    mode = 'standing';
    if (spun > 540) {
      pose = 'mareado';
      dizzyUntil = performance.now() + 1500;
    }
    const proxy = { angle: body.angle };
    standUp = gsap.to(proxy, {
      angle: nearestUpright(body.angle), duration: 0.45, ease: 'back.out(2)', delay: spun > 540 ? 1.3 : 0.15,
      onUpdate: () => void (body = { ...body, angle: proxy.angle }),
      onComplete: () => {
        body = { ...body, angle: 0, vx: 0, vy: 0, spin: 0 };
        pose = 'idle';
        walkPhase = 0;
        mode = 'walking';
      },
    });
  }

  function arrive() {
    mode = 'home';
    body = { ...body, ...home(), angle: 0 };
    eyeTarget = { x: 0.2, y: 0.25 };
    pose = 'hola';
    setTimeout(() => mode === 'home' && (pose = 'idle'), 1400);
  }

  // Grab, drag and throw.
  let grab: { dx: number; dy: number; startX: number; startY: number } | null = null;
  let dragged = false;
  let samples: { x: number; y: number; t: number }[] = [];

  function down(event: PointerEvent) {
    if (prefersReducedMotion() || event.button !== 0) return;
    grab = { dx: event.clientX - body.x, dy: event.clientY - body.y, startX: event.clientX, startY: event.clientY };
    dragged = false;
    samples = [{ x: event.clientX, y: event.clientY, t: event.timeStamp }];
    button.setPointerCapture(event.pointerId);
  }

  function move(event: PointerEvent) {
    if (!grab) return;
    if (!dragged && Math.hypot(event.clientX - grab.startX, event.clientY - grab.startY) < 6) return;
    if (!dragged) {
      dragged = true;
      open = false;
      ladderTween?.kill();
      ladder = 0;
      standUp?.kill();
      mode = 'held';
      pose = 'idle';
      wake();
    }
    const { right, floor } = bounds();
    const x = Math.min(right, Math.max(0, event.clientX - grab.dx));
    const y = Math.min(floor, Math.max(0, event.clientY - grab.dy));
    samples = [...samples.filter(sample => event.timeStamp - sample.t < 120), { x: event.clientX, y: event.clientY, t: event.timeStamp }];
    const speed = releaseVelocity(samples);
    lastVelocity = { vx: speed.vx, vy: speed.vy };
    // Dangling from your finger: he leans with the movement.
    body = { ...body, x, y, angle: Math.max(-35, Math.min(35, speed.vx * 0.02)) };
  }

  function up() {
    if (!grab) return;
    grab = null;
    if (dragged) {
      const { vx, vy } = releaseVelocity(samples);
      throwFrom(vx, vy);
    }
  }

  function toggle() {
    // A drag also ends in a click: only real taps (and the keyboard) open the bubble.
    if (dragged) {
      dragged = false;
      return;
    }
    bubbleAt = { right: Math.max(8, innerWidth - body.x - W), bottom: innerHeight - body.y + 6 };
    open = !open;
  }

  onMount(() => {
    const start = home();
    const reduced = prefersReducedMotion();
    let entered = false;
    try {
      entered = sessionStorage.getItem('el-baul-jogino-entered') === '1';
      sessionStorage.setItem('el-baul-jogino-entered', '1');
    } catch {
      /* no session storage: he simply drops in each time */
    }
    if (reduced || entered) {
      body = { ...body, ...start };
    } else {
      // First visit in this session: he drops into his corner from above.
      body = { ...body, x: start.x, y: -H, vx: 0, vy: 0 };
      setTimeout(() => {
        landOnShelf = true;
        throwFrom(0, 0);
      }, 900);
    }

    const followPointer = (event: PointerEvent) => {
      if (mode !== 'home' || reduced || performance.now() < dizzyUntil) return;
      const centre = { x: body.x + W / 2, y: body.y + H * 0.2 };
      const dx = event.clientX - centre.x;
      const dy = event.clientY - centre.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const strength = Math.min(1, distance / 160);
      eyeTarget = { x: (dx / distance) * strength, y: (dy / distance) * strength };
      if (calm) wake();
    };
    const resize = () => {
      view = { width: innerWidth, height: innerHeight };
      if (mode === 'home') body = { ...body, ...home() };
    };
    const close = (event: Event) => {
      if (!open) return;
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !bubble?.contains(event.target as Node) && !button.contains(event.target as Node)) open = false;
    };
    addEventListener('pointermove', followPointer, { passive: true });
    addEventListener('resize', resize);
    addEventListener('pointerdown', close);
    addEventListener('keydown', close);
    if (!reduced) wake();
    return () => {
      gsap.ticker.remove(tick);
      removeEventListener('pointermove', followPointer);
      removeEventListener('resize', resize);
      removeEventListener('pointerdown', close);
      removeEventListener('keydown', close);
    };
  });

</script>

<!-- His shelf in the corner: home, and where the chat bubble opens. -->
<div class="jogino-shelf" aria-hidden="true" style:transform="translate({home().x - 8}px, {home().y + H - 6}px)"></div>
{#if ladder > 0}
  <div class="jogino-ladder" aria-hidden="true" style:height="{ladder}px" style:transform="translate({home().x + W / 2 - 13}px, {floor() + H - 4 - ladder}px)"></div>
{/if}

<button
  bind:this={button}
  class="jogino-buddy"
  class:held={mode === 'held'}
  data-mode={mode}
  type="button"
  aria-label="Jogiño: conectar Claude o ChatGPT"
  aria-expanded={open}
  style:transform="translate({body.x}px, {body.y}px) rotate({body.angle}deg)"
  onpointerdown={down}
  onpointermove={move}
  onpointerup={up}
  onpointercancel={up}
  onclick={toggle}
>
  <Jogino {pose} {look} />
</button>

{#if open}
  <div class="jogino-bubble" bind:this={bubble} role="dialog" aria-label="Jogiño" style:right="{bubbleAt.right}px" style:bottom="{bubbleAt.bottom}px">
    <strong>¡Hola, soy Jogiño!</strong>
    <p>{text}</p>
    {#if action.href}
      <a class="btn jogino-action" href={action.href}>{action.label}</a>
    {:else}
      <button type="button" class="btn jogino-action" onclick={() => { open = false; action.onclick?.(); }}>{action.label}</button>
    {/if}
    <div class="jogino-paint" role="group" aria-label="Color de Jogiño">
      {#each JOGINO_COLORS as color (color)}
        <button
          type="button"
          class="paint-dot"
          style:background="linear-gradient(160deg, {PAINT[color].light}, {PAINT[color].dark})"
          aria-label="Pintar de {PAINT[color].label.toLowerCase()}"
          aria-pressed={jogino.color === color}
          onclick={() => saveJogino({ color })}
        ></button>
      {/each}
    </div>
    {#if canHide}
      <button type="button" class="linkbutton jogino-hide" onclick={() => saveJogino({ hidden: true })}>Esconder a Jogiño</button>
    {/if}
  </div>
{/if}

<style>
  .jogino-buddy {
    position: fixed;
    z-index: 30;
    top: 0;
    left: 0;
    width: 68px;
    height: 62px;
    padding: 0;
    border: 0;
    background: none;
    cursor: grab;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
    transform-origin: 50% 60%;
    filter: drop-shadow(0 6px 8px #10201833);
  }
  .jogino-buddy.held { cursor: grabbing; }
  .jogino-shelf {
    position: fixed;
    z-index: 29;
    top: 0;
    left: 0;
    width: 84px;
    height: 9px;
    border-radius: 3px;
    background: linear-gradient(#c99a62, #9c6a3f);
    box-shadow: 0 6px 10px -4px #10201855;
    pointer-events: none;
  }
  /* The brackets holding the shelf to the wall. */
  .jogino-shelf::before, .jogino-shelf::after {
    content: '';
    position: absolute;
    top: 9px;
    width: 7px;
    height: 14px;
    border-radius: 0 0 3px 3px;
    background: #8a5c34;
  }
  .jogino-shelf::before { left: 12px; }
  .jogino-shelf::after { right: 12px; }
  .jogino-ladder {
    position: fixed;
    z-index: 29;
    top: 0;
    left: 0;
    width: 26px;
    border-inline: 4px solid #b07a45;
    background: repeating-linear-gradient(to top, transparent 0 9px, #c48d55 9px 13px);
    pointer-events: none;
  }
  .jogino-buddy:focus-visible { outline: 3px solid color-mix(in srgb, var(--green) 55%, transparent); outline-offset: 4px; border-radius: 14px; }
  .jogino-bubble {
    position: fixed;
    z-index: 31;
    width: min(290px, calc(100vw - 24px));
    padding: 16px 16px 14px;
    border: 1px solid var(--line);
    border-radius: 18px 18px 6px 18px;
    background: var(--paper);
    color: var(--ink);
    box-shadow: var(--shadow-lg);
    font-family: var(--font-body);
    text-align: left;
  }
  .jogino-bubble strong { display: block; font: 600 1.15rem/1.2 var(--font-display); }
  .jogino-bubble p { margin: 6px 0 12px; color: var(--muted); font-size: .9rem; line-height: 1.5; }
  .jogino-action { width: 100%; justify-content: center; }
  .jogino-paint { display: flex; gap: 8px; margin-top: 12px; }
  .paint-dot { width: 26px; height: 26px; padding: 0; border: 2px solid var(--paper); border-radius: 50%; box-shadow: 0 0 0 1px var(--line); cursor: pointer; }
  .paint-dot[aria-pressed='true'] { box-shadow: 0 0 0 2px var(--green); }
  .jogino-hide { display: block; margin-top: 10px; padding: 0; border: 0; background: none; color: var(--muted); font-size: .8rem; text-decoration: underline; cursor: pointer; }
</style>
