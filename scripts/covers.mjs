// Draws the game covers in public/covers/ (vector art, one file per game in src/content/).
// Run: node scripts/covers.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import expansions from './covers/expansions.mjs';
import heavy from './covers/heavy.mjs';
import light from './covers/light.mjs';
import medium from './covers/medium.mjs';

const covers = { ...light, ...medium, ...heavy, ...expansions };
const out = new URL('../public/covers/', import.meta.url);
mkdirSync(out, { recursive: true });
for (const [slug, svg] of Object.entries(covers)) writeFileSync(new URL(`${slug}.svg`, out), svg);
console.log(`${Object.keys(covers).length} portadas en public/covers/`);
