-- TASK-H017-01 — RETIRE get_my_pending_nominations() (FEAT-PC016): the
-- platform contract of a read chain nothing has called since 2026-07-25.
--
-- OWNERSHIP: Platform Core / Organisation (PC-3). Authority: FEAT-PC016
-- (the contract's own spec, now recording "superseded by the bell, retired"),
-- FEAT-H017 (the Hub route's owner), and Stefan's ruling of 2026-09-03
-- ("retire H017-01" — bridge 2026-09-03_02). The ownership manifest drops the
-- function in the same PR (review checklist row 1).
--
-- THE CHAIN. FEAT-PC016 (J-A rider, 20260707130821 §8) built
-- get_my_pending_nominations() — the nominee's own pending stewardship
-- nominations from the substrate clock — for the Hub's PendingNominations
-- panel, reached through GET /api/me/nominations -> fetchPendingNominations().
-- A-NTF N-B (FEAT-H031, 2026-07-24) moved the nominee's answer into the
-- notification bell, which reads the notification records through
-- get_own_notifications() — a different path entirely — and deleted the panel.
-- N-C (FEAT-H032, 2026-07-25) removed the overview bundle's `nominations`
-- slice, the last caller of the route. Since then the whole chain has stood
-- with no caller at any level; the Hub half (route, lib relay, re-exported
-- type, three unit cells) is deleted in the same PR.
--
-- NO MEMBER-FACING CHANGE. A nominee sees and answers the offer in the bell
-- and /notifications (FEAT-H031/H032); the write path — nominate_steward,
-- respond_to_stewardship_nomination, the nomination-response route — is
-- untouched. The PIN cell in pending-nominations-retired.test.ts names the
-- surviving path.
--
-- SIBLING ASSERTIONS (grep: get_my_pending_nominations, fetchPendingNominations,
-- api/me/nominations — the whole tree):
--   * tests/integration/groups/pending-nominations-contract.test.ts — the
--     contract's own six cells: DELETED with the contract (they pin the
--     payload of a function that no longer exists; the capability they
--     guarded is pinned by the bell suites — stewardship-succession,
--     typed-action-registry, actionable-notifications).
--   * tests/integration/groups/pending-nominations-retired.test.ts — NEW: two
--     absence cells (catalog + PGRST202), RED at HEAD, green at apply; one
--     labelled PIN (the nominee still sees the offer via get_own_notifications).
--   * tests/integration/platform/function-classification-completeness.test.ts
--     — "every live public function is explicitly classified": RED at HEAD
--     (the manifest entry is removed in this PR while the function is still
--     live), green at apply. The second demonstrated red for the gate.
--   * tests/integration/platform/anon-execute-lockdown.test.ts — enumerates
--     live functions; one fewer to check. LEFT.
--   * tests/unit/lib/groups-leadership.test.ts — the two fetchPendingNominations
--     cells REMOVED with the relay; the five contract fetchers' cells LEFT.
--   * tests/unit/app/api/group-leadership-routes.test.ts — the three
--     /api/me/nominations cells REMOVED with the route; the STORY-6 canary
--     now spans the five surviving handlers. LEFT otherwise.
--   * Q1 post-apply verification set: tests/e2e/leadership-transfer.spec.ts and
--     tests/e2e/notifications-live.spec.ts (the journeys that walk a
--     nomination through the bell) — run against the applied substrate.
--
-- REVERSIBILITY: the function's body is in 20260707130821:669-715 with its
-- revoke/grant at :783-785; re-issue from there if the chain is ever wanted
-- back (review checklist row 4 — a DROP loses the ACL, so re-issue both).

DROP FUNCTION IF EXISTS public.get_my_pending_nominations();

-- Self-verifying (review checklist row 2): the drop must have taken.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_my_pending_nominations'
  ) THEN
    RAISE EXCEPTION 'TASK-H017-01: get_my_pending_nominations still present after DROP';
  END IF;
END $$;
