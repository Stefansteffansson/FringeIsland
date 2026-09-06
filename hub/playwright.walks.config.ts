import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';
import { resolve } from 'path';

/**
 * The walk runner — live-walk legs codified (2026-09-06, Stefan: "how can we make
 * it possible for you to run these scenarios / scripts?").
 *
 * A walk is not the E2E fleet: it runs against the STANDING WALK CAST on the test
 * project (ADR-U053) through a running dev server, it keeps evidence of every step
 * (a screenshot per step, a trace, an HTML report), and it never sweeps — the cast
 * is torn down by `npm run walk:cast -- teardown` after the walk, not by a global
 * teardown. Hence: no globalSetup / globalTeardown, no shared storageState (every
 * actor signs in on its own context — that is how two or three cast members act
 * in one leg), and `*.walk.ts` so the fleet's `*.spec.ts` glob never picks a leg
 * up, nor this config a fleet spec.
 *
 * Run from `hub/`:  npm run walk:run            (all legs)
 *                   npm run walk:run -- leg-5   (one leg, by file name)
 *                   npm run walk:run:headed     (watch the windows)
 *                   npm run walk:report         (open the HTML report)
 *
 * The cast password is read from `hub/.env.walk.local` (gitignored, `WALK_PASSWORD=`)
 * — never from the repository, never on a command line.
 */
config({ path: resolve(__dirname, '.env.local') });
config({ path: resolve(__dirname, '.env.walk.local') });

export default defineConfig({
  testDir: './tests/walks',
  testMatch: '**/*.walk.ts',

  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 240_000,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report-walks', open: 'never' }]],
  outputDir: 'test-results/walks',

  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'on',
    screenshot: 'on',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
  },

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },

  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
