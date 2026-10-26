<script lang="ts">
  import { onMount } from 'svelte';
  import CardFan from '../components/CardFan.svelte';
  import CardTable from './CardTable.svelte';
  import { coverUrl, LIBRARY } from '../content/library';
  import { CONTACT_EMAIL } from '../content/legal';
  import { countUp, gsap, prefersReducedMotion, reveal } from '../motion';
  import { ScrollTrigger, smoothScroll, splitReveal } from '../motion/scroll';
  import Phone from './Phone.svelte';

  const explained = LIBRARY.filter(entry => entry.rules).length;
  const SIGNUP = '/login.html?signup=1';
  const LOGIN = '/login.html';

  /** Covers that start scattered "in four houses", end up neatly on the table and can be turned over. */
  const scattered = ['7-wonders', 'azul', 'virus', 'dominion', 'hanabi', 'scythe', 'just-one', 'carcassonne', 'mysterium', 'codigo-secreto', 'sushi-go', 'la-tripulacion']
    .map(slug => LIBRARY.find(entry => entry.slug === slug))
    .filter(entry => !!entry);

  interface Feature { id: string; title: string; text: string; shot?: string; alt?: string }
  const features: Feature[] = [
    { id: 'coleccion', title: 'Toda la colección, con portada', text: 'Cada juego con su ilustración, sus jugadores, su duración y su dureza. Y en qué casa está: el Virus puede estar en casa de Enzo y en la de Lu a la vez.', shot: '/landing/coleccion.jpg', alt: 'Catálogo de juegos con portadas' },
    { id: 'reglas', title: 'Cómo se juega, en un minuto', text: `Resúmenes claros de ${explained} juegos, del más sencillo al más complejo. Para no pasar media hora leyendo el reglamento.`, shot: '/landing/como-se-juega.jpg', alt: 'Ficha de un juego con su explicación' },
    { id: 'jugamos', title: '¿A qué jugamos?', text: 'Dile cuántos sois, cuánto tiempo tenéis y qué os apetece. Te propone los que mejor encajan, y te dice por qué.', shot: '/landing/que-jugamos.jpg', alt: 'Recomendaciones de juegos' },
    { id: 'partidas', title: 'Partidas, notas y piques', text: 'Apunta quién ganó y qué nota le dais. Descubre vuestro favorito, el que más jugáis y quién es el rey del Carcassonne.' },
    { id: 'amigos', title: 'Amigos, grupos y perfiles', text: 'Busca a tus amigos, montad grupos y mirad vuestras colecciones. Tú decides qué es público, qué ven solo tus amigos y qué es privado.' },
    { id: 'comprar', title: 'Por comprar, a golpe de meeple', text: 'Proponed juegos nuevos y que cada uno ponga su meeple en los que más le apetecen. Solo tienes tres: el que más meeples junte, al carrito.' },
    { id: 'ia', title: 'Pregúntale a Claude o ChatGPT', text: 'Conecta tu cuenta y pregunta como hablarías: «¿qué cooperativo para cinco tenemos en casa de Enzo?». Muy pronto.' },
  ];

  const faqs = [
    { q: '¿Cuánto cuesta?', a: 'Nada. Es gratis y sin anuncios.' },
    { q: '¿Hay app para iPhone?', a: 'No hay app de iPhone, pero la web funciona igual de bien desde el navegador del móvil. En Android, además, tienes la app.' },
    { q: '¿Quién ve mis juegos?', a: 'Tú decides: todo el mundo, solo las personas que añades como amigos o nadie. Lo mismo con tus estadísticas.' },
    { q: '¿Qué hacéis con mis datos?', a: 'Solo los usamos para que la app funcione: no los vendemos ni los usamos para publicidad. Cumplimos el RGPD.' },
    { q: '¿Puedo borrar mi cuenta?', a: 'Sí, cuando quieras, desde «Mi perfil». Se borra al momento, con tus datos.' },
  ];

  /** Real quotes from friends, with their permission. The section stays hidden while empty. */
  const quotes: { text: string; who: string }[] = [];

  let active = $state('coleccion');
  let problem: HTMLElement;
  let featureList: HTMLElement;

  onMount(() => {
    const stopScroll = smoothScroll();
    if (prefersReducedMotion()) return stopScroll;

    // The problem: covers lie around as if spread over four houses, then fall into the box.
    const cards = gsap.utils.toArray<HTMLElement>(problem.querySelectorAll('.scatter-card'));
    gsap.from(cards, {
      x: () => gsap.utils.random(-260, 260), y: () => gsap.utils.random(-160, 160), rotation: () => gsap.utils.random(-40, 40),
      ease: 'none', stagger: 0.02,
      scrollTrigger: { trigger: problem, start: 'top 75%', end: 'center 55%', scrub: 1 },
    });

    // Features: the phone shows the screen of the text in the middle of the viewport.
    const triggers = gsap.utils.toArray<HTMLElement>(featureList.querySelectorAll('.feature')).map(feature =>
      ScrollTrigger.create({ trigger: feature, start: 'top 55%', end: 'bottom 55%', onToggle: self => self.isActive && (active = feature.dataset.id!) }));

    return () => {
      triggers.forEach(trigger => trigger.kill());
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
      stopScroll();
    };
  });
</script>

{#snippet mock(id: string)}
  {#if id === 'partidas'}
    <div class="mock">
      <p class="mock-title">Los del viernes</p>
      <div class="stats-grid mock-stats">
        <div class="stat-tile"><small>Partidas</small><strong>48</strong></div>
        <div class="stat-tile"><small>Más jugado</small><strong>Azul</strong><span class="sub">11 veces</span></div>
        <div class="stat-tile"><small>Favorito</small><strong>Hanabi</strong><span class="sub">★ 8,9</span></div>
        <div class="stat-tile"><small>Quién gana más</small><strong>Lu</strong><span class="sub">17 victorias</span></div>
      </div>
      <p class="mock-note">Ejemplo con datos inventados</p>
    </div>
  {:else if id === 'amigos'}
    <div class="mock">
      <div class="mock-person"><span class="avatar">E</span><div><strong>@enzo</strong><span class="tag green">✓ En tus amigos</span></div></div>
      <div class="mock-privacy">
        <span>Mi colección</span><b>Solo mis amigos</b>
        <span>Mis estadísticas</span><b>Pública</b>
      </div>
      <div class="mock-covers">{#each ['virus', 'azul', 'mysterium'] as slug (slug)}<img src={`/covers/${slug}.svg`} alt="" />{/each}</div>
      <p class="mock-note">Ejemplo con datos inventados</p>
    </div>
  {:else if id === 'comprar'}
    <div class="mock">
      {#each [['Cascadia', 3], ['Ark Nova', 2], ['Dixit', 1]] as [name, count] (name)}
        <div class="mock-wish"><strong>{name}</strong><span class="meeples">{#each Array.from({ length: Number(count) }) as _, i (i)}<span class="meeple" aria-hidden="true"></span>{/each}</span></div>
      {/each}
      <p class="mock-hint">Te quedan 2 meeples</p>
      <p class="mock-note">Ejemplo con datos inventados</p>
    </div>
  {:else}
    <div class="mock mock-chat">
      <p class="bubble me">¿Qué cooperativo para 5 tenemos en casa de Enzo?</p>
      <p class="bubble ai">Tenéis <b>Mysterium</b> (2–7, 45 min) y <b>Dead of Winter</b> (2–5, 90 min). Si tenéis menos de una hora, Mysterium.</p>
      <p class="mock-note">Así respondería, con tus datos</p>
    </div>
  {/if}
{/snippet}

<header class="land-top">
  <a class="land-brand" href="/inicio"><span class="brand-mark" aria-hidden="true">🎲</span>El Baúl de los Jogos</a>
  <nav aria-label="Acceso"><a class="btn ghost small" href={LOGIN}>Entrar</a></nav>
</header>

<main>
  <section class="hero grain">
    <div class="hero-copy">
      <p class="eyebrow">Para grupos de amigos con demasiados juegos</p>
      <h1 use:splitReveal={{ by: 'chars' }}>¿A qué jugamos hoy?</h1>
      <p class="lead" use:reveal={{ delay: 0.4 }}>El Baúl de los Jogos guarda vuestros juegos de mesa, en qué casa está cada uno y cómo se juega. Os dice a qué jugar según cuántos sois, y apunta quién gana.</p>
      <div class="hero-actions" use:reveal={{ delay: 0.55 }}>
        <a class="btn big" href={SIGNUP}>Crear cuenta gratis</a>
        <a class="btn ghost big on-table" href={LOGIN}>Ya tengo cuenta</a>
      </div>
      <p class="hero-note">Gratis · Sin anuncios · En la web y en Android</p>
    </div>
    <div class="hero-fan"><CardFan width={180} /></div>
  </section>

  <section class="problem" bind:this={problem} aria-labelledby="problemTitle">
    <div class="narrow">
      <h2 id="problemTitle" use:splitReveal>Tenéis 50 juegos repartidos en 4 casas… y siempre acabáis jugando al mismo.</h2>
      <p use:reveal>¿Dónde estaba el Catan? ¿Cómo se jugaba a esto? ¿Quién ganó la última vez? El Baúl lo recuerda por vosotros.</p>
    </div>
    <CardTable entries={scattered} signup={SIGNUP} />
  </section>

  <section class="features" aria-labelledby="featuresTitle">
    <h2 id="featuresTitle" class="section-title" use:splitReveal>Todo lo de vuestra ludoteca, en un sitio</h2>
    <div class="features-layout">
      <div class="features-phone" aria-hidden="true">
        {#each features as feature (feature.id)}
          <div class="phone-slot" class:shown={active === feature.id}>
            {#if feature.shot}<Phone src={feature.shot} alt="" />{:else}<Phone>{@render mock(feature.id)}</Phone>{/if}
          </div>
        {/each}
      </div>
      <ol class="feature-list" bind:this={featureList}>
        {#each features as feature, i (feature.id)}
          <li class="feature" data-id={feature.id} class:current={active === feature.id}>
            <span class="feature-number">{String(i + 1).padStart(2, '0')}</span>
            <h3>{feature.title}</h3>
            <p>{feature.text}</p>
            <div class="feature-phone-inline">
              {#if feature.shot}<Phone src={feature.shot} alt={feature.alt} />{:else}<Phone>{@render mock(feature.id)}</Phone>{/if}
            </div>
          </li>
        {/each}
      </ol>
    </div>
  </section>

  <section class="numbers grain" aria-label="En cifras">
    <div use:reveal><strong use:countUp={LIBRARY.length}>{LIBRARY.length}</strong><span>juegos con portada dibujada a mano</span></div>
    <div use:reveal={{ delay: 0.1 }}><strong use:countUp={explained}>{explained}</strong><span>juegos explicados paso a paso</span></div>
    <div use:reveal={{ delay: 0.2 }}><strong>0</strong><span>anuncios</span></div>
    <div use:reveal={{ delay: 0.3 }}><strong>0 €</strong><span>ahora y siempre que podamos</span></div>
  </section>

  <section class="steps" aria-labelledby="stepsTitle">
    <h2 id="stepsTitle" class="section-title" use:splitReveal>Empezad en tres pasos</h2>
    <ol>
      <li use:reveal><span>1</span><h3>Crea tu cuenta</h3><p>Con tu correo y un apodo. Un minuto.</p></li>
      <li use:reveal={{ delay: 0.1 }}><span>2</span><h3>Añade vuestros juegos</h3><p>Y en qué casa está cada uno. Las portadas y las reglas salen solas.</p></li>
      <li use:reveal={{ delay: 0.2 }}><span>3</span><h3>Invita a tus amigos</h3><p>Montad vuestros grupos y empezad a apuntar partidas.</p></li>
    </ol>
  </section>

  {#if quotes.length}
    <section class="quotes" aria-label="Lo que dicen">
      {#each quotes as quote (quote.who)}<figure use:reveal><blockquote>«{quote.text}»</blockquote><figcaption>{quote.who}</figcaption></figure>{/each}
    </section>
  {/if}

  <section class="faq" aria-labelledby="faqTitle">
    <h2 id="faqTitle" class="section-title" use:splitReveal>Preguntas frecuentes</h2>
    <div class="faq-list">
      {#each faqs as item (item.q)}
        <details use:reveal><summary>{item.q}</summary><p>{item.a}</p></details>
      {/each}
    </div>
  </section>

  <section class="final grain">
    <h2 use:splitReveal>Abrid el baúl</h2>
    <p use:reveal>Vuestros juegos, vuestras partidas y vuestros piques, en un sitio.</p>
    <a class="btn big" href={SIGNUP} use:reveal={{ delay: 0.15 }}>Crear cuenta gratis</a>
  </section>
</main>

<footer class="land-footer">
  <span>© {new Date().getFullYear()} El Baúl de los Jogos</span>
  <nav aria-label="Legal">
    <a href={LOGIN}>Entrar</a>
    <a href="/borrar-cuenta.html">Borrar tu cuenta</a>
    {#if CONTACT_EMAIL}<a href="/privacidad">Privacidad</a><a href="mailto:{CONTACT_EMAIL}">Contacto</a>{/if}
  </nav>
</footer>
