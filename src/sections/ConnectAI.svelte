<script lang="ts">
  import Jogino from '../mascot/Jogino.svelte';
  import { JOGINO_COLORS, PAINT } from '../mascot/colors';
  import { jogino, saveJogino } from '../mascot/prefs.svelte';

  /**
   * «Mi perfil» → how to connect your own Claude or ChatGPT (the MCP connector), told by
   * Jogiño, plus his own settings: his paint and whether he lives in the corner.
   */
  // Always production: the permission page only works on the main site (docs/CONECTAR-IA.md).
  const MCP_URL = 'https://el-baul-de-los-jogos.vercel.app/api/mcp';
  let copied = $state('');

  async function copy() {
    try {
      await navigator.clipboard.writeText(MCP_URL);
      copied = 'Copiada. Pégala en tu Claude o ChatGPT.';
    } catch {
      copied = 'No se ha podido copiar: selecciónala y cópiala a mano.';
    }
  }
</script>

<div class="sectionhead" id="conectar-ia" style="margin-top:34px">
  <div><h2 style="font-size:1.35rem">Conectar con Claude o ChatGPT</h2><p>Pregunta a tu asistente por tu baúl, con tu propia cuenta.</p></div>
</div>
<div class="card profile-card connect-card">
  <div class="connect-intro">
    <span class="connect-jogino"><Jogino pose="hola" label="Jogiño saludando" /></span>
    <p>
      Soy Jogiño. Con tu Claude o ChatGPT puedes preguntarme cosas como «¿qué cooperativo para 5 tenemos
      en casa de Enzo?» o «¿quién gana más al Carcassonne?». Solo puedo <strong>leer</strong> tu baúl, no cambio
      nada, y no le cuesta nada al Baúl: usas tu propia cuenta.
    </p>
  </div>

  <div class="field">
    <label for="mcpUrl">Dirección del conector</label>
    <div class="copy-row">
      <input id="mcpUrl" readonly value={MCP_URL} onfocus={event => event.currentTarget.select()} />
      <button type="button" class="btn" onclick={copy}>Copiar</button>
    </div>
    <p class="notice" role="status">{copied}</p>
  </div>

  <details>
    <summary>En Claude</summary>
    <ol>
      <li>Vale también el plan gratuito de Claude (permite un conector propio).</li>
      <li>Abre <strong>Ajustes → Conectores</strong> y pulsa <strong>Añadir conector personalizado</strong>.</li>
      <li>Nombre: «El Baúl de los Jogos». URL: la de arriba.</li>
      <li>Pulsa <strong>Conectar</strong> y entra con tu cuenta del Baúl.</li>
      <li>Te preguntaré si dejas que Claude vea tu baúl: pulsa <strong>Permitir</strong>.</li>
      <li>En una conversación, activa el conector y pregunta lo que quieras.</li>
    </ol>
  </details>
  <details>
    <summary>En ChatGPT</summary>
    <ol>
      <li>Desde <strong>chatgpt.com</strong> en el navegador (la app del móvil aún no deja añadirlos). Hace falta un plan Plus o superior: el gratuito y el Go no permiten conectores propios.</li>
      <li>Si te lo pide, activa el <strong>modo desarrollador</strong>: <strong>Ajustes → Seguridad e inicio de sesión</strong>.</li>
      <li>Abre <strong>Plugins</strong> (<strong>chatgpt.com/plugins</strong>) y pulsa <strong>+</strong> para crear uno.</li>
      <li>Nombre: «El Baúl de los Jogos». URL: la de arriba. Autenticación: <strong>OAuth</strong>.</li>
      <li>Entra con tu cuenta del Baúl y pulsa <strong>Permitir</strong>.</li>
      <li>En una conversación, pulsa <strong>+</strong> junto a la caja de texto y elige El Baúl de los Jogos.</li>
    </ol>
    <p class="connect-note">ChatGPT cambia sus menús a menudo: si no encuentras algo, busca «plugins», «MCP» o «desarrollador» en sus ajustes.</p>
  </details>
  <p class="connect-note">Para quitar el acceso, borra el conector en Claude o ChatGPT.</p>

  <div class="jogino-settings">
    <h3>Jogiño</h3>
    <div class="paint-row" role="group" aria-label="Color de Jogiño">
      {#each JOGINO_COLORS as color (color)}
        <button
          type="button"
          class="paint-choice"
          aria-pressed={jogino.color === color}
          onclick={() => saveJogino({ color })}
        >
          <span class="paint-figure"><Jogino {color} /></span>{PAINT[color].label}
        </button>
      {/each}
    </div>
    <label class="check">
      <input type="checkbox" checked={!jogino.hidden} onchange={event => saveJogino({ hidden: !event.currentTarget.checked })} />
      Mostrar a Jogiño en su esquina (puedes cogerlo y lanzarlo)
    </label>
  </div>
</div>

<style>
  .connect-card { display: grid; gap: 14px; }
  .connect-intro { display: flex; gap: 14px; align-items: center; }
  .connect-intro p { margin: 0; color: var(--muted); line-height: 1.55; }
  .connect-jogino { flex: none; width: 84px; height: 78px; }
  .copy-row { display: flex; gap: 8px; }
  .copy-row input { flex: 1; min-width: 0; font-family: ui-monospace, monospace; font-size: .85rem; }
  details { border: 1px solid var(--line); border-radius: 12px; padding: 10px 14px; }
  summary { font-weight: 700; cursor: pointer; }
  ol { margin: 10px 0 2px; padding-left: 20px; color: var(--muted); line-height: 1.6; }
  .connect-note { margin: 0; color: var(--muted); font-size: .85rem; }
  .jogino-settings { padding-top: 14px; border-top: 1px solid var(--line); }
  .jogino-settings h3 { margin: 0 0 10px; font-size: 1rem; }
  .paint-row { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 8px; }
  .paint-choice { display: grid; justify-items: center; gap: 4px; padding: 8px 4px; border: 1px solid var(--line); border-radius: 12px; background: var(--paper); color: var(--ink); font-size: .75rem; cursor: pointer; }
  .paint-choice[aria-pressed='true'] { border-color: var(--green); box-shadow: 0 0 0 2px color-mix(in srgb, var(--green) 30%, transparent); }
  .paint-figure { width: 44px; height: 40px; }
  .check { display: flex; gap: 8px; align-items: center; margin-top: 12px; font-size: .88rem; }
  @media (max-width: 640px) {
    .connect-intro { align-items: flex-start; }
    .connect-jogino { width: 64px; height: 60px; }
    .paint-row { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
</style>
