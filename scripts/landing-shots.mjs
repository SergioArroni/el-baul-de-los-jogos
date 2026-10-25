// Captures the real app screens shown on the landing (public/landing/*.jpg) and the
// image used when the link is shared (public/og.jpg), from the built app in local mode
// with its sample collection. Run after a build, and again when the app changes:
//   npm run build && node scripts/landing-shots.mjs
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const PORT = 4179;
const BASE = `http://localhost:${PORT}`;
const OUT = new URL('../public/', import.meta.url);
mkdirSync(new URL('landing/', OUT), { recursive: true });

const server = spawn(`npx vite preview --port ${PORT} --strictPort`, { shell: true, stdio: 'ignore' });
try {
  for (let i = 0; i < 60; i++) {
    if (await fetch(BASE).then(r => r.ok, () => false)) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  const browser = await chromium.launch({ channel: 'chrome' });
  // Phone screens: final states without animation, light theme.
  const phone = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, colorScheme: 'light', reducedMotion: 'reduce' });
  const shot = (name, options = {}) => phone.screenshot({ path: fileURLToPath(new URL(`landing/${name}.jpg`, OUT)), type: 'jpeg', quality: 72, ...options });

  await phone.goto(`${BASE}/?local=1`);
  await phone.evaluate(() => localStorage.clear());
  await phone.reload();
  await phone.getByRole('heading', { name: 'Tu colección' }).waitFor();
  await phone.waitForTimeout(800);
  await shot('coleccion');

  await phone.getByLabel('Buscar en la colección').fill('carcassonne');
  await phone.locator('.cover-grid .cover').first().click();
  await phone.getByRole('heading', { name: 'Cómo se juega' }).waitFor();
  await phone.waitForTimeout(500);
  await shot('como-se-juega');
  await phone.keyboard.press('Escape');

  await phone.getByRole('navigation').getByRole('button', { name: /Qué jugamos/ }).click();
  await phone.getByLabel('¿Cuántas personas?').fill('4');
  await phone.getByRole('button', { name: 'Encontrar juegos' }).click();
  await phone.waitForTimeout(500);
  await phone.locator('.formactions').last().scrollIntoViewIfNeeded();
  await shot('que-jugamos');

  // Share image: the landing's hero at 1200×630.
  const wide = await browser.newPage({ viewport: { width: 1200, height: 630 }, colorScheme: 'light', reducedMotion: 'reduce' });
  await wide.goto(`${BASE}/inicio`);
  await wide.evaluate(() => document.fonts.ready);
  await wide.waitForTimeout(800);
  await wide.screenshot({ path: fileURLToPath(new URL('og.jpg', OUT)), type: 'jpeg', quality: 80 });

  await browser.close();
  console.log('Capturas en public/landing/ y public/og.jpg');
} finally {
  server.kill();
  if (process.platform === 'win32') spawn('taskkill', ['/pid', String(server.pid), '/T', '/F'], { stdio: 'ignore' });
}
