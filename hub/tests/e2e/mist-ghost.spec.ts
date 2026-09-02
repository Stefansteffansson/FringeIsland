import { test, expect } from '@playwright/test';
import {
  anonymousSweepWatermark,
  cleanupAnonymousUsers,
  createAdminClient,
  eraseUserAndPersonalGroup,
  listAnonymousUsers,
} from './helpers/auth';

/**
 * TASK-MIST-01 (E2E) — the ghost window (J-O3 area-gate finding, 2026-07-19).
 *
 * A Mist is erased server-side — the 72 h ADR-U033 reaper, or a goodbye said
 * on another domain — while this browser still holds its session. The JWT is
 * still signed, so the client reads `identity === 'mist'` locally (ADR-U037),
 * and every actor-bound read then refuses with "no resolvable actor": nothing
 * will ever resolve this actor again. The honest behaviour is to treat that
 * as a broken session and drop it, so the visitor lands sessionless and the
 * next "Look around" mints a fresh Mist — the first-time experience restored
 * within one interaction.
 *
 * Red at head: the reload left the ghost standing on /mist (the arrival check
 * logged a failure and kept the JWT), so the sessionless entry never came.
 *
 * Runs WITHOUT the shared storageState. The erasure below is the reaper's own
 * order (auth user, then the personal group) through the E2E erasure
 * primitive, bounded to the Mist this spec minted.
 */
test.use({ storageState: { cookies: [], origins: [] } });

let specStart: string;

test.beforeAll(async () => {
  specStart = await anonymousSweepWatermark();
});

test.afterAll(async () => {
  await cleanupAnonymousUsers(createAdminClient(), { since: specStart });
});

test('a Mist erased server-side while the browser holds its session lands sessionless, and the next look-around mints a fresh Mist', async ({
  page,
}) => {
  // 1. A real Mist, arrived through the front door.
  await page.goto('/');
  await page.getByRole('button', { name: /look around/i }).click();
  await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+\/play/, { timeout: 30000 });

  // 2. Erase it server-side, the reaper's way, while the browser keeps its JWT.
  const admin = createAdminClient();
  const minted = await listAnonymousUsers(specStart);
  expect(minted.length).toBeGreaterThanOrEqual(1);
  const ghost = minted[minted.length - 1];
  await eraseUserAndPersonalGroup(admin, ghost.authId, ghost.personalGroupId);

  // 3. The browser comes back with the ghost's session: it must NOT stand on
  //    the Mist page as if alive — the session is dropped and the visitor
  //    lands on the sessionless entry with its three doors.
  await page.goto('/mist');
  await expect(page).toHaveURL(/\/$/, { timeout: 20000 });
  await expect(page.getByRole('button', { name: /look around/i })).toBeVisible({ timeout: 15000 });

  // 4. The next look-around mints a fresh Mist and the front door opens again.
  await page.getByRole('button', { name: /look around/i }).click();
  await expect(page).toHaveURL(/\/journeys\/[0-9a-f-]+\/play/, { timeout: 30000 });
  const after = await listAnonymousUsers(specStart);
  expect(after.some((u) => u.authId !== ghost.authId)).toBe(true);
});
