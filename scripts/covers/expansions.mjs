// Covers for the expansions in src/content/expansions.ts, each in its base game's palette
// with something of the base kept (Dominion's crown, Carcassonne's tile, Scythe's fields)
// so they read as family. Fenris, Terramar and Cities of Splendor are drawn with the games.
import { card, cover, sparkle } from './frame.mjs';

const crown = (x, y, s, fill, band) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-40 20V-22L-20 0L0-32L20 0L40-22V20z" fill="${fill}"/><rect x="-40" y="12" width="80" height="12" rx="3" fill="${band}"/></g>`;
const fields = (from, color = '#a98467', stripe = '#e9c46a') =>
  `<path d="M0 ${from}C100 ${from - 20} 200 ${from - 14} 300 ${from - 6}V400H0z" fill="${color}"/>${[16, 32].map(d => `<path d="M0 ${from + d}C100 ${from + d - 18} 200 ${from + d - 12} 300 ${from + d - 6}" stroke="${stripe}" stroke-width="3" fill="none"/>`).join('')}`;
const tile = (x, y, s, inner) => `<g transform="translate(${x} ${y}) rotate(-6) scale(${s})"><rect x="-60" y="-60" width="120" height="120" rx="8" fill="#a7c957"/><path d="M-60 -10H60V10H-60z" fill="#f2e8cf"/>${inner}</g>`;
const coin = (x, y, r, fill, edge) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" stroke="${edge}" stroke-width="${r / 5}"/>`;
const wave = (y, color, opacity = 0.8) => `<path d="M-10 ${y}q20-12 40 0t40 0t40 0t40 0t40 0t40 0t40 0t40 0" stroke="${color}" stroke-width="5" fill="none" stroke-linecap="round" opacity="${opacity}"/>`;

export default {
  // Scythe: new factions arriving by sea, airships, and the encounter cards.
  'scythe-invasores': cover({ from: '#90e0ef', to: '#84a59d', light: '#ffffff', glowY: 110 }, `
    <path d="M0 200C80 186 220 186 300 196V400H0z" fill="#3a86a8"/>${wave(214, '#caf0f8')}${wave(232, '#caf0f8', 0.5)}
    <path d="M88 196H212L196 222H104z" fill="#7f5539"/><path d="M150 82V196" stroke="#5e3c22" stroke-width="5"/>
    <path d="M154 90C200 110 204 160 154 180z" fill="#fffdf7"/><path d="M146 100C112 120 110 160 146 176z" fill="#f1faee"/>
    <path d="M150 82l26 8-26 8z" fill="#2d6a4f"/><path d="M150 70l-24 7 24 7z" fill="#7b2cbf"/>
    <path d="M0 150l40-30 30 20 30-34 40 44z" fill="#6c757d" opacity="0.55"/>`),

  'scythe-wind-gambit': cover({ from: '#bde0fe', to: '#f6bd60', light: '#ffffff', glowY: 90 }, `
    ${fields(240)}
    <ellipse cx="150" cy="104" rx="84" ry="34" fill="#9c6644"/><path d="M70 104h160" stroke="#7f5539" stroke-width="3"/>
    <path d="M118 136h64l-8 22h-48z" fill="#6c757d"/><path d="M128 136v-8M172 136v-8" stroke="#495057" stroke-width="4"/>
    <path d="M232 92v24M222 96h20M222 112h20" stroke="#495057" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="62" cy="182" rx="34" ry="13" fill="#b08968"/><path d="M50 195h24l-4 9H54z" fill="#6c757d"/>
    <path d="M20 60q20-8 40 0M220 196q24-8 48 0" stroke="#fffdf7" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.8"/>`),

  'scythe-encuentros': cover({ from: '#f6bd60', to: '#84a59d', light: '#ffffff', glowY: 120 }, `
    ${fields(232)}
    ${card(110, 140, 86, 120, -12, '#fffdf7', '<circle cy="-16" r="20" fill="#e9c46a"/><path d="M-26 30h52M-20 42h40" stroke="#ced4da" stroke-width="6" stroke-linecap="round"/>')}
    ${card(190, 132, 86, 120, 10, '#fffdf7', '<path d="M-22-14q22-24 44 0q-22 24-44 0z" fill="#495057"/><circle cy="-14" r="8" fill="#ffd166"/><path d="M-26 30h52M-20 42h40" stroke="#ced4da" stroke-width="6" stroke-linecap="round"/>')}
    <circle cx="150" cy="226" r="20" fill="#3d2c2e"/><path d="M144 218q6-10 12 0q0 6-6 9v4" stroke="#ffd166" stroke-width="4" fill="none" stroke-linecap="round"/><circle cx="150" cy="238" r="2.5" fill="#ffd166"/>`),

  // Dominion: always the crown, each with its own court.
  'dominion-intriga': cover({ from: '#5a189a', to: '#03045e', light: '#ffd166', glowY: 130 }, `
    ${crown(150, 60, 0.55, '#ffd166', '#e09f3e')}
    <path d="M70 136c26-22 60-22 80 0c20-22 54-22 80 0c0 30-22 48-44 48c-16 0-26-10-36-22c-10 12-20 22-36 22c-22 0-44-18-44-48z" fill="#10002b"/>
    <ellipse cx="114" cy="148" rx="16" ry="9" fill="#c8b6ff"/><ellipse cx="186" cy="148" rx="16" ry="9" fill="#c8b6ff"/>
    <path d="M150 196v52" stroke="#ced4da" stroke-width="8" stroke-linecap="round"/><path d="M134 204h32" stroke="#e09f3e" stroke-width="7" stroke-linecap="round"/><path d="M150 248l-6 14h12z" fill="#ced4da"/>`),

  'dominion-prosperidad': cover({ from: '#ffd166', to: '#9c6644', light: '#ffffff', glowY: 120 }, `
    ${crown(150, 66, 0.8, '#fffdf7', '#e09f3e')}
    ${[[96, 214, 24], [150, 224, 30], [206, 212, 24], [122, 178, 22], [180, 176, 22], [150, 140, 20]].map(([x, y, r], i) => coin(x, y, r, i === 2 ? '#e5e5e5' : '#ffd166', i === 2 ? '#adb5bd' : '#e09f3e')).join('')}
    ${sparkle(70, 120, 14, '#fffdf7')}${sparkle(236, 100, 10, '#fffdf7')}`),

  'dominion-edad-oscura': cover({ from: '#495057', to: '#14213d', light: '#ffb703', glowY: 120 }, `
    <path d="M50 250V150l30-20v120M220 250V120l34 20v110" fill="#6c757d"/><path d="M80 250V170h24v80M196 250V176h24" fill="#343a40"/>
    <g transform="rotate(-18 150 120)">${crown(150, 120, 0.9, '#adb5bd', '#6c757d')}</g><path d="M128 104l10 22-8 16" stroke="#14213d" stroke-width="4" fill="none"/>
    <path d="M150 214v40" stroke="#7f5539" stroke-width="8" stroke-linecap="round"/><path d="M150 214c-14-14-6-30 0-40c6 10 14 26 0 40z" fill="#ffb703"/><path d="M150 210c-6-6-3-14 0-18c3 4 6 12 0 18z" fill="#fff3b0"/>`),

  'dominion-aventuras': cover({ from: '#90be6d', to: '#023e8a', light: '#ffd166', glowY: 120 }, `
    ${crown(150, 56, 0.5, '#ffd166', '#e09f3e')}
    <path d="M60 110l60-16 60 16 60-16v130l-60 16-60-16-60 16z" fill="#f2e8cf"/><path d="M120 94v130M180 110v130" stroke="#d4a373" stroke-width="3"/>
    <path d="M78 196c30-10 40-50 74-44s36 34 70 18" stroke="#bc4749" stroke-width="4" stroke-dasharray="8 7" fill="none"/>
    <path d="M216 156l12 12M228 156l-12 12" stroke="#bc4749" stroke-width="5" stroke-linecap="round"/>
    <circle cx="96" cy="140" r="16" fill="none" stroke="#386641" stroke-width="4"/><path d="M96 128v24M84 140h24" stroke="#386641" stroke-width="3"/>`),

  // Carcassonne: the tile with something new on it.
  'carcassonne-posadas': cover({ from: '#a7c957', to: '#386641', light: '#ffffff' }, `
    ${tile(150, 160, 1.4, '<path d="M-18 -10V-46L0-62 18-46V-10z" fill="#e9d8a6"/><path d="M-8-10v-20h16v20z" fill="#6a4c93"/><path d="M0-62v-10" stroke="#bc4749" stroke-width="3"/><circle cx="34" cy="-30" r="12" fill="#bc4749"/>')}
    <path d="M206 232h34v40c0 8-6 12-17 12s-17-4-17-12z" fill="#d4a373"/><path d="M240 242h8c8 0 8 22 0 22h-8" stroke="#d4a373" stroke-width="5" fill="none"/><ellipse cx="223" cy="232" rx="19" ry="7" fill="#fffdf7"/>`),

  'carcassonne-constructores': cover({ from: '#a7c957', to: '#386641', light: '#ffffff' }, `
    ${tile(150, 156, 1.4, '<path d="M-30-46h24v-14h-24z" fill="#9c6644"/><circle cx="26" cy="-38" r="14" fill="#ffafcc"/><circle cx="20" cy="-42" r="2.5" fill="#370617"/><path d="M38-34h6" stroke="#ffafcc" stroke-width="4"/>')}
    <path d="M62 238l14-34h28l14 34h-14l-7-16-7 16z" fill="#0077b6"/><circle cx="90" cy="194" r="14" fill="#0077b6"/>
    <rect x="186" y="214" width="46" height="50" rx="10" fill="#9c6644"/><path d="M186 228h46M186 250h46" stroke="#7f5539" stroke-width="4"/>`),

  'carcassonne-princesa': cover({ from: '#a7c957', to: '#386641', light: '#ffffff' }, `
    ${tile(150, 186, 1.2, '<circle cx="-30" cy="-36" r="10" fill="#ffd6ff"/><path d="M-40-44l10-12 10 12" fill="#ffd166"/>')}
    <path d="M90 118c30-40 90-40 120 0c-14-6-30-4-38 6c-6-14-26-14-32 0c-8-10-30-12-50-6z" fill="#bc4749"/>
    <path d="M150 86c12-20 34-24 48-16-12 2-18 10-20 20" fill="#bc4749"/><circle cx="186" cy="80" r="3.5" fill="#fffdf7"/><path d="M200 74l18-8" stroke="#ffb703" stroke-width="5" stroke-linecap="round"/>
    ${sparkle(236, 196, 12, '#fff3b0')}<circle cx="236" cy="196" r="4" fill="#fffdf7"/>`),

  // 7 Wonders: sand and wonders, each with its own addition.
  '7-wonders-leaders': cover({ from: '#f6bd60', to: '#bc6c25', light: '#ffffff', glowY: 110 }, `
    <circle cx="150" cy="140" r="78" fill="#e9c46a" stroke="#b5838d" stroke-width="0"/><circle cx="150" cy="140" r="64" fill="#fefae0"/>
    <path d="M128 182c-6-30 0-62 30-66c22-2 30 18 22 30l10 8-10 4c4 14-4 24-16 24h-10v10z" fill="#bc6c25"/>
    <path d="M116 120c-8 18-6 38 4 52M184 120c8 18 6 38-4 52" stroke="#386641" stroke-width="7" fill="none" stroke-linecap="round" stroke-dasharray="2 10"/>`),

  '7-wonders-cities': cover({ from: '#3d405b', to: '#14213d', light: '#ffd166', glowY: 110 }, `
    <path d="M30 250V170h30v-30h24v110M100 250V150l26-20 26 20v100M170 250V120h40v130M222 250V180h44v70" fill="#22223b"/>
    ${[[44, 184], [72, 156], [116, 170], [136, 196], [182, 140], [196, 170], [236, 196], [252, 214]].map(([x, y]) => `<rect x="${x}" y="${y}" width="8" height="10" fill="#ffd166"/>`).join('')}
    ${coin(96, 94, 20, '#ffd166', '#e09f3e')}<path d="M196 70l30 30M196 100l30-30" stroke="#ced4da" stroke-width="6" stroke-linecap="round"/>`),

  '7-wonders-armada': cover({ from: '#f6bd60', to: '#0077b6', light: '#ffffff', glowY: 100 }, `
    <path d="M0 196C100 184 200 184 300 194V400H0z" fill="#0077b6"/>${wave(212, '#caf0f8')}${wave(232, '#caf0f8', 0.5)}
    ${[[96, 160, 1], [204, 150, 1.2]].map(([x, y, s]) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-44 26h88l-14 20h-60z" fill="#7f5539"/><path d="M0-50v76" stroke="#5e3c22" stroke-width="4"/><path d="M4-44c30 14 30 46 0 60z" fill="#fffdf7"/><path d="M-4-36c-22 12-22 36 0 46z" fill="#e9c46a"/></g>`).join('')}
    <path d="M140 60h20v40h-20z M134 54h32v8h-32z" fill="#fefae0"/>`),

  // Mysterium: the ghost, with secrets or with signs.
  'mysterium-secretos': cover({ from: '#5a189a', to: '#10002b', light: '#c8b6ff', glowY: 140 }, `
    <path d="M106 222V128a44 44 0 0 1 88 0V222l-15-13-14 13-15-13-15 13-14-13z" fill="#f1e9ff" opacity="0.92"/>
    <ellipse cx="134" cy="132" rx="7" ry="11" fill="#240046"/><ellipse cx="166" cy="132" rx="7" ry="11" fill="#240046"/>
    <rect x="128" y="160" width="44" height="34" rx="6" fill="#ffd166"/><path d="M136 160v-12a14 14 0 0 1 28 0v12" stroke="#ffd166" stroke-width="7" fill="none"/><circle cx="150" cy="174" r="5" fill="#5a189a"/>
    ${card(60, 110, 48, 66, -14, '#c8b6ff', '<path d="M-12 0h24M0-12v24" stroke="#5a189a" stroke-width="4"/>')}${sparkle(240, 90, 12, '#e0aaff')}`),

  'mysterium-senales': cover({ from: '#7b2cbf', to: '#10002b', light: '#c8b6ff', glowY: 130 }, `
    <circle cx="150" cy="130" r="62" fill="#c8b6ff" opacity="0.3"/><circle cx="150" cy="130" r="52" fill="#e0aaff" opacity="0.55"/>
    <path d="M112 130q38-34 76 0q-38 34-76 0z" fill="#fffdf7"/><circle cx="150" cy="130" r="14" fill="#5a189a"/><circle cx="154" cy="126" r="4" fill="#fffdf7"/>
    <path d="M110 186h80l-12 22h-56z" fill="#3c096c"/>
    ${card(64, 214, 46, 64, -10, '#ffd6ff', '<path d="M0-14l12 26h-24z" fill="none" stroke="#5a189a" stroke-width="3"/>')}${card(236, 214, 46, 64, 10, '#b8c0ff', '<circle r="10" fill="none" stroke="#5a189a" stroke-width="3"/><circle r="3" fill="#5a189a"/>')}`),

  // Munchkin: absurd weapons and clumsy clerics.
  'munchkin-2': cover({ from: '#f4a261', to: '#9c4221', light: '#ffe8a3' }, `
    <path d="M144 70l12 0 8 190h-28z" fill="#7f5539"/>
    <path d="M150 74c-60-10-96 20-96 64c30-14 62-12 96 6zM150 74c60-10 96 20 96 64c-30-14-62-12-96 6z" fill="#ced4da"/><path d="M150 74c-40-4-66 14-72 40M150 74c40-4 66 14 72 40" stroke="#fffdf7" stroke-width="4" fill="none" opacity="0.7"/>
    <circle cx="150" cy="100" r="10" fill="#e09f3e"/>${sparkle(232, 210, 14, '#ffe8a3')}`),

  'munchkin-3': cover({ from: '#f4a261', to: '#9c4221', light: '#ffe8a3' }, `
    <path d="M100 180c0-60 20-100 50-118c30 18 50 58 50 118z" fill="#fffdf7"/><path d="M150 80v70M126 110h48" stroke="#ffd166" stroke-width="10" stroke-linecap="round"/>
    <path d="M100 180h100v22H100z" fill="#e9c46a"/><path d="M160 92l-10 22 10 16-8 18" stroke="#9c4221" stroke-width="4" fill="none"/>
    <ellipse cx="150" cy="232" rx="54" ry="10" fill="#9c4221" opacity="0.4"/>`),

  // Virus!: the virus has evolved.
  'virus-2': cover({ from: '#264653', to: '#14213d', light: '#e9f5db' }, `
    ${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<path transform="rotate(${i * 45} 150 140)" d="M150 140V74" stroke="#9d4edd" stroke-width="9" stroke-linecap="round"/><circle transform="rotate(${i * 45} 150 140)" cx="150" cy="70" r="10" fill="#9d4edd"/>`).join('')}
    <circle cx="150" cy="140" r="46" fill="#c77dff"/><circle cx="134" cy="132" r="8" fill="#fffdf7"/><circle cx="166" cy="132" r="8" fill="#fffdf7"/><circle cx="136" cy="134" r="4" fill="#14213d"/><circle cx="168" cy="134" r="4" fill="#14213d"/><path d="M134 156q16 12 32 0" stroke="#14213d" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M60 206c20 20 40-20 60 0s40-20 60 0 40-20 60 0" stroke="#2a9d8f" stroke-width="5" fill="none"/><path d="M60 226c20-20 40 20 60 0s40 20 60 0 40 20 60 0" stroke="#e9c46a" stroke-width="5" fill="none"/>`),

  // Mansiones de la locura: what's behind the door, and the twilight sanctum.
  'mansiones-umbral': cover({ from: '#344e41', to: '#0b0f0b', light: '#a3b18a', glowY: 120 }, `
    <path d="M96 250V96a54 54 0 0 1 108 0V250z" fill="#1b1b1b"/><path d="M96 250V96a54 54 0 0 1 54-54V250z" fill="#5e3c22"/>
    <path d="M150 250V42a54 54 0 0 1 54 54V250z" fill="#ffe8a3" opacity="0.75"/>
    <path d="M196 250c-20-30 20-60-6-96c-10-14-30-6-24 10" stroke="#588157" stroke-width="10" fill="none" stroke-linecap="round"/>
    <circle cx="136" cy="160" r="5" fill="#e09f3e"/>`),

  'mansiones-santuario': cover({ from: '#3c096c', to: '#0b0f0b', light: '#c8b6ff', glowY: 110 }, `
    <path d="M100 210V120l50-46 50 46v90z" fill="#22223b"/><circle cx="150" cy="136" r="30" fill="#c8b6ff" opacity="0.85"/>
    <path d="M150 106v60M120 136h60M129 115l42 42M171 115l-42 42" stroke="#3c096c" stroke-width="3"/>
    ${[[70, 230], [230, 230], [110, 246], [190, 246]].map(([x, y]) => `<rect x="${x - 6}" y="${y - 30}" width="12" height="30" rx="3" fill="#fefae0"/><path d="M${x} ${y - 30}c-6-8 0-16 0-20c0 4 6 12 0 20z" fill="#ffb703"/>`).join('')}`),

  // Dead of Winter: two colonies at war in the snow.
  'dead-of-winter-colonias': cover({ from: '#a8dadc', to: '#1d3557', light: '#ffffff', glowY: 120 }, `
    <path d="M0 220C100 206 200 210 300 216V400H0z" fill="#f1faee"/>
    <path d="M86 220V96M214 220V96" stroke="#5e3c22" stroke-width="6"/><path d="M90 100h56l-10 18 10 18H90z" fill="#e63946"/><path d="M210 100h-56l10 18-10 18h56z" fill="#457b9d"/>
    <path d="M118 220l12-34h40l12 34z" fill="#6c757d"/><path d="M130 196h40" stroke="#495057" stroke-width="4"/>
    ${[[30, 50, 2.5], [150, 40, 2], [260, 70, 3], [40, 150, 2], [250, 170, 2.5], [180, 70, 1.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fffdf7"/>`).join('')}`),
};


