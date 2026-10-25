import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svelte()],
  build: {
    // The Svelte app, plus plain HTML pages: login, admin and how to delete your account.
    rollupOptions: {
      input: {
        app: resolve(import.meta.dirname, 'index.html'),
        login: resolve(import.meta.dirname, 'login.html'),
        admin: resolve(import.meta.dirname, 'admin.html'),
        deleteAccount: resolve(import.meta.dirname, 'borrar-cuenta.html'),
      },
    },
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
});
