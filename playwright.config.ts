import { defineConfig, devices } from '@playwright/test';

// Two kinds of browser tests:
// - "local": the built app in local mode (?local=1), no backend needed.
// - "integration": the app against a real Postgres + PostgREST in Docker (see tests/stack/run.mjs).
export default defineConfig({
  testDir: 'tests',
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { channel: 'chrome', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'local',
      testDir: 'tests/e2e',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', baseURL: 'http://localhost:4173' },
    },
    {
      name: 'local-mobile',
      testDir: 'tests/e2e',
      testMatch: /mobile\.spec\.ts/,
      use: { ...devices['Pixel 7'], channel: 'chrome', baseURL: 'http://localhost:4173' },
    },
    {
      name: 'integration',
      testDir: 'tests/integration',
      use: { ...devices['Desktop Chrome'], channel: 'chrome', baseURL: 'http://localhost:8790' },
    },
  ],
  webServer: [
    {
      command: 'npm run build && npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      // Fake Supabase/Vercel in front of the Docker backend (only used by the integration project).
      // tsx: the gateway runs the real catalog module (TypeScript) against BGG fixtures.
      command: 'node --import tsx tests/stack/gateway.mjs',
      url: 'http://localhost:8790/index.html',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
