import { countDeusExE2ELeaks, createAdminClient, deleteE2EUser, SESSION_EMAIL } from './helpers/auth';

export default async function globalTeardown() {
  const admin = createAdminClient();

  // TASK-INT-05 leak instrument: a full run must leak ZERO groups into the
  // DeusEx system group. Growth fails the run loudly — a leak that only a
  // manual inspection could see is how 39 accumulated.
  const before = Number(process.env.E2E_LEAK_BASELINE ?? Number.NaN);
  const after = await countDeusExE2ELeaks(admin);
  if (!Number.isFinite(before)) {
    console.log(`[e2e-teardown] No leak baseline recorded (partial run?) — caretaker E2E count now ${after}`);
  } else if (after > before) {
    throw new Error(
      `[e2e-teardown] TASK-INT-05: DeusEx E2E-group memberships grew ${before} -> ${after} — a spec created a caretaker group and did not tear it down`,
    );
  } else {
    console.log(`[e2e-teardown] Leak instrument: ${before} -> ${after} (delta ${after - before})`);
  }

  await deleteE2EUser(admin, SESSION_EMAIL);
  console.log('[e2e-teardown] Session user removed');
}
