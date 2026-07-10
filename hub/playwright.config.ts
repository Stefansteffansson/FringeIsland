import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '.env.local') });

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: '**/*.spec.ts',

  // Serial — the suite shares DB state seeded by global-setup.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],

  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  use: {
    // E2E_BASE_URL lets a run target an alternate port (e.g. `next start
    // -p 3001` when the :3000 dev server is owned by a live manual-testing
    // session — the documented coexistence friction).
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    storageState: 'tests/e2e/.auth/user.json',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  // Self-contained gate run: reuse a running dev server or start one.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },

  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
