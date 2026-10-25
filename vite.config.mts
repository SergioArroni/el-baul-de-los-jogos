import { svelte } from '@sveltejs/vite-plugin-svelte';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Connect, type Plugin } from 'vite';

// Clean URLs such as /inicio come from vercel.json's rewrites; the dev and preview
// servers apply the same ones, so local runs and tests behave like Vercel.
const rewrites: { source: string; destination: string }[] =
  JSON.parse(readFileSync(resolve(import.meta.dirname, 'vercel.json'), 'utf8')).rewrites ?? [];
const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
  const [path, query = ''] = (req.url ?? '').split('?');
  const match = rewrites.find(rule => rule.source === path);
  if (match) req.url = match.destination + (query ? '?' + query : '');
  next();
};
const cleanUrls: Plugin = {
  name: 'clean-urls',
  configureServer: server => void server.middlewares.use(rewrite),
  configurePreviewServer: server => void server.middlewares.use(rewrite),
};

export default defineConfig({
  plugins: [svelte(), cleanUrls],
  build: {
    // The Svelte app, the landing (/inicio) and plain HTML pages: login, admin and how to delete your account.
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        login: resolve(import.meta.dirname, 'login.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        deleteAccount: resolve(import.meta.dirname, 'borrar-cuenta.html'),
        landing: resolve(import.meta.dirname, 'inicio.html'),
      },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
