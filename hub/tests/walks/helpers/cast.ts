import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { assertNotProduction } from '../../helpers/target';
import { createAdminClient } from '../../e2e/helpers/auth';

/**
 * The walk cast, as `hub/scripts/walk-cast.mjs` creates it, plus the walk admin
 * (the walk script's P3). One password for all six, read from `WALK_PASSWORD`
 * (`hub/.env.walk.local`, gitignored). Actors sign in through the real login
 * form, each on its own browser context — so a leg can hold several members
 * signed in at once and interleave them (Astrid invites, Wanda answers, Astrid
 * sees), which is what a live walk does and a one-user-at-a-time walk cannot.
 *
 * The service-role client is used for READ-ONLY look-ups only (ids, statuses,
 * audit rows). A walk never writes around the product.
 */

assertNotProduction(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env);

export const CAST = {
  admin: { email: 'walk-admin@fringeisland.test', name: 'Warden', standing: 'platform admin (a DeusEx member)' },
  bert: { email: 'walk-bert@fringeisland.test', name: 'Bert', standing: 'Steward of Harbour (public)' },
  mona: { email: 'walk-mona@fringeisland.test', name: 'Mona', standing: 'member of Harbour' },
  astrid: { email: 'walk-astrid@fringeisland.test', name: 'Astrid', standing: 'Steward of Riverside and Drift' },
  wanda: { email: 'walk-wanda@fringeisland.test', name: 'Wanda', standing: 'member of Riverside and Drift' },
  kalle: { email: 'walk-kalle@fringeisland.test', name: 'Kalle', standing: 'member of Riverside' },
} as const;

export type CastKey = keyof typeof CAST;

export function walkPassword(): string {
  const pw = process.env.WALK_PASSWORD;
  if (!pw) {
    throw new Error(
      'WALK_PASSWORD is not set. Put the value the cast was created with in hub/.env.walk.local (gitignored) — never in the repository, never on a command line.',
    );
  }
  return pw;
}

export type Actor = {
  key: CastKey;
  name: string;
  email: string;
  context: BrowserContext;
  page: Page;
};

export async function signIn(page: Page, key: CastKey): Promise<void> {
  await page.goto('/login');
  await page.locator('#email').fill(CAST[key].email);
  await page.locator('#password').fill(walkPassword());
  await page.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/groups/, { timeout: 20_000 });
}

/** A cast member signed in on a fresh, isolated context (own cookies, own session). */
export async function openAs(browser: Browser, key: CastKey): Promise<Actor> {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await signIn(page, key);
  return { key, name: CAST[key].name, email: CAST[key].email, context, page };
}

let shot = 0;

/** A full-page screenshot attached to the report under a numbered, readable name. */
export async function evidence(page: Page, label: string): Promise<void> {
  shot += 1;
  const name = `${String(shot).padStart(2, '0')}-${label.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase()}`;
  const body = await page.screenshot({ fullPage: true });
  await test.info().attach(name, { body, contentType: 'image/png' });
}

// --- read-only look-ups ------------------------------------------------------

export type CastUser = { id: string; auth_user_id: string; personal_group_id: string; email: string };

export async function userByEmail(email: string): Promise<CastUser> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('users')
    .select('id, auth_user_id, personal_group_id, email')
    .eq('email', email)
    .maybeSingle();
  if (error) throw new Error(`userByEmail(${email}): ${error.message}`);
  if (!data) throw new Error(`userByEmail(${email}): no such user on the test project — is the cast created?`);
  return data as CastUser;
}

export async function groupByName(name: string): Promise<{ id: string; status: string } | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from('groups')
    .select('id, status')
    .eq('name', name)
    .eq('group_type', 'engagement')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`groupByName(${name}): ${error.message}`);
  return (data as { id: string; status: string } | null) ?? null;
}

export async function auditRows(filter: { action?: string; target?: string }): Promise<Array<{ action: string; target: string | null; created_at: string }>> {
  const admin = createAdminClient();
  let q = admin.from('admin_audit_log').select('action, target, created_at').order('created_at', { ascending: false }).limit(20);
  if (filter.action) q = q.eq('action', filter.action);
  if (filter.target) q = q.eq('target', filter.target);
  const { data, error } = await q;
  if (error) throw new Error(`auditRows: ${error.message}`);
  return (data ?? []) as Array<{ action: string; target: string | null; created_at: string }>;
}
