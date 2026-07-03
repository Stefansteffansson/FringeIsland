import { test, expect } from '@playwright/test';
import { createAdminClient, SESSION_EMAIL } from './helpers/auth';

/**
 * FEAT-H011 — the private journal (IDN-5) E2E, against the live FEAT-PD001
 * contracts. Authenticated as the shared e2e-session FIM (global-setup
 * storageState). One critical journey: empty journal → write → listed →
 * edit → revised → delete (ConfirmModal) → empty again. Cleanup is a
 * baseline purge either side, keyed by the session FIM's personal group
 * (journal rows would also ride the teardown cascade, but a clean baseline
 * keeps the empty-state assertions honest under re-runs).
 */

async function purgeSessionJournal(): Promise<void> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('users')
    .select('personal_group_id')
    .eq('email', SESSION_EMAIL)
    .maybeSingle();
  const gid = data?.personal_group_id as string | undefined;
  if (gid) {
    await admin.from('journal_entries').delete().eq('owner_group_id', gid);
  }
}

test.describe('FEAT-H011 — private journal', () => {
  test.beforeAll(async () => {
    const admin = createAdminClient();
    await admin
      .from('users')
      .update({ is_active: true, is_decommissioned: false })
      .eq('email', SESSION_EMAIL);
    await purgeSessionJournal();
  });

  test.afterAll(async () => {
    await purgeSessionJournal();
  });

  test('the journal journey: write → listed → edit → delete → empty', async ({ page }) => {
    await page.goto('/journal');
    await expect(page.getByRole('heading', { name: /journal/i })).toBeVisible();

    // clean baseline: the empty state invites the first entry (STORY-1)
    await expect(page.getByTestId('journal-empty')).toBeVisible();

    // write
    await page.getByLabel('Title (optional)').fill('First light');
    await page.getByLabel('Entry').fill('Today the island appeared through the mist.');
    await page.getByRole('button', { name: 'Save entry' }).click();

    const entry = page.getByTestId('journal-entry');
    await expect(entry).toHaveCount(1);
    await expect(entry.getByText('First light')).toBeVisible();
    await expect(
      entry.getByText('Today the island appeared through the mist.'),
    ).toBeVisible();
    // the composer cleared
    await expect(page.getByLabel('Entry')).toHaveValue('');

    // edit in place (STORY-3) — the composer hides while editing, so the
    // one visible Entry field is the edit form's, prefilled with the body
    await entry.getByRole('button', { name: 'Edit' }).click();
    const bodyField = page.getByLabel('Entry');
    await expect(bodyField).toHaveValue('Today the island appeared through the mist.');
    await bodyField.fill('Today the island appeared — and I wrote it down.');
    await page.getByRole('button', { name: 'Save entry' }).click();
    await expect(
      page.getByText('Today the island appeared — and I wrote it down.'),
    ).toBeVisible();

    // delete through the ConfirmModal (STORY-3)
    await page.getByTestId('journal-entry').getByRole('button', { name: 'Delete' }).click();
    await expect(page.getByText('Delete entry?')).toBeVisible();
    await page.getByRole('button', { name: 'Yes, delete' }).click();

    // gone for good — back to the invitation (STORY-1)
    await expect(page.getByTestId('journal-empty')).toBeVisible();
    await expect(page.getByTestId('journal-entry')).toHaveCount(0);
  });
});
