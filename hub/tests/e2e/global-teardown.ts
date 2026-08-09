import {
  countDeusExE2ELeaks,
  countOrphanedPersonalGroups,
  createAdminClient,
  deleteE2EUser,
  SESSION_EMAIL,
} from './helpers/auth';

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

  // TASK-INT-03 leak instrument. Runs AFTER the session user is removed, so the
  // shared fixture's own group is inside the measurement rather than a
  // permanent +1. Growth fails the run: an orphaned personal group is
  // unreachable forever (every read door resolves the caller via
  // get_current_personal_group_id(), and no `users` row can ever resolve it),
  // so it is pure table bloat plus a misleading denominator — 1 357 accumulated
  // in 11 days while every run reported success.
  const orphanBefore = Number(process.env.E2E_ORPHAN_BASELINE ?? Number.NaN);
  const orphanAfter = await countOrphanedPersonalGroups();
  if (!Number.isFinite(orphanBefore)) {
    console.log(
      `[e2e-teardown] No orphan baseline recorded (partial run?) — orphaned personal groups now ${orphanAfter}`,
    );
  } else if (orphanAfter > orphanBefore) {
    throw new Error(
      `[e2e-teardown] TASK-INT-03: orphaned personal groups grew ${orphanBefore} -> ${orphanAfter} — ` +
        `a spec deleted an account without its personal group. Route the teardown through ` +
        `deleteE2EUserByAuthId / eraseUserAndPersonalGroup.`,
    );
  } else {
    console.log(
      `[e2e-teardown] Orphan instrument: ${orphanBefore} -> ${orphanAfter} (delta ${orphanAfter - orphanBefore})`,
    );
  }
}
