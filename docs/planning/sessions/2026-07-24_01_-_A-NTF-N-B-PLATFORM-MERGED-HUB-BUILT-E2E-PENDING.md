# Session bridge — A-NTF Cycle N-B: platform merged, Hub built, E2E pending

**Date:** 2026-07-24 (session 01) · **Wave:** Ferd · **Area:** A-NTF (Notifications), Phase-3 area 5 of 6
**Follows:** [`2026-07-23_02_-_A-NTF-N-A-BUILT-PASSIVE-NOTIFICATIONS-LIVE.md`](./2026-07-23_02_-_A-NTF-N-A-BUILT-PASSIVE-NOTIFICATIONS-LIVE.md)

---

## One-paragraph state

Cycle N-B (smart/actionable notifications) was decomposed and largely built this session. The **platform half (FEAT-PD014) is merged to `main` (#276)** — migration applied to the dev DB + log repaired, 13/13 integration + 12/12 conformance green (red→green demonstrated). The **Hub half (FEAT-H031) is code-complete, committed, pushed, and open as PR #277** (stacked on the merged #276) — 934/934 unit + `next build` green. **What remains is the E2E phase + the cycle close** (see "Next actual work"). Both feature specs are at `5-in-cycle`; **ADR-U051 is still `Proposed`** (accept at the cycle close). **A mid-session scope correction is locked** (below): the acting-invitation was *not* an actionable notification — Stefan re-decided to build it as one.

## The N-B scope correction (locked by Stefan, 2026-07-24)

The N-B scope-lock assumed the group-of-groups acting-invitation was already an actionable notification. **Disk verification refuted it** — there is no `acting_invitation` notification kind (the PD013 FK forbids one), `respond_to_group_invitation(p_membership_id, p_accept)` is membership-keyed and never touches `notifications`, and the plan's cited `pc015:608` is actually inside `nominate_steward`. **Stefan re-decided: build the acting-invitation as a real actionable notification** — fanned out at invite-time to the invited group's `act_as_group` permission-holders (ADR-U041, never the "Steward" role name), first-answer-wins, "answered by [name]" recorded **durably on the notification rows** (ADR-U051 Option A — survives the decline that deletes the membership), on a data-driven/extensible response engine. Framework captured in **[ADR-U051](../../architecture/decisions/ADR-U051-actionable-notification-typed-response-framework.md)**.

## What shipped this session

- **Decomposition (merged in #276):** ADR-U051 (Proposed), [FEAT-PD014](../../platform/domain/features/FEAT-PD014-actionable-notification-dispatch-and-acting-fanout.md) ↔ [FEAT-H031](../../products/hub/features/FEAT-H031-notification-typed-actions.md), DS-5 + Hub L4 summaries + both feature READMEs, the completion plan N-B section corrected. Tasks TASK-NB-01..05.
- **Platform half FEAT-PD014 — MERGED (#276), dev DB applied + repaired:** migration `20260724120000_n_b_actionable_notification_dispatch.sql`:
  - `acting_invitation` kind registered (reuses `invitation_received`'s category).
  - `get_own_notifications` gains `action_data` + NTF-8 lazy expiry-on-view (DROP+CREATE; STABLE→VOLATILE for the self-healing expiry write).
  - `notify_invitation_received` **branches**: a GROUP (engagement) invitation fans out one `acting_invitation` per `act_as_group` holder of the invited group; a PERSONAL invitation keeps `invitation_received` unchanged (no orphan for the group branch).
  - `respond_to_acting_invitation(p_notification_id, p_accept)` — thin dispatch to the **untouched** Core `respond_to_group_invitation` (NB-1) + first-answer-wins convergence (outcome + resolver denormalised onto the durable rows; `P0002` is the already-resolved backstop).
  - `ownership.manifest.json` DS-5 += `respond_to_acting_invitation`; `notifications` stays out of `DS_TABLES`.
  - Suite `hub/tests/integration/notifications/actionable-notifications.test.ts` — **13/13 green**; conformance (ownership-manifest, anon-execute-lockdown, internal-api) **12/12** + direction-rule 12/12.
- **Hub half FEAT-H031 — committed + pushed, PR #277, 934/934 unit + build green:**
  - `format.ts`: `notificationResponses` (data-driven, extensible), `isActionable`, convergence chip ("Answered by [first token]" / "Expired" / N-A "Handled" preserved), `firstToken`; `NotificationRow` gains `action_data`.
  - `client.ts`: `respondToNotification` + `notificationDispatchRoute` (kind→dedicated route, NB-1).
  - `NotificationActions` component (ConfirmModal-gated, sibling of `NotificationItem` — no button nesting); acting-response BFF route + `respondToActingInvitationRpc` courier.
  - Bell + inbox wired (optimistic → reconcile → rollback).
  - **Retirements:** `PendingNominations` deleted (mount + component + test + dead mocks); `GroupMembershipsPanel` acting Accept/Decline **folded** to a read-only "Answer in your notifications" pointer (Withdraw + status stay).

## Next actual work — the E2E phase + cycle close (DB-gated)

Pick up on branch **`feat/a-ntf-nb-hub-typed-actions`** (PR #277, stacked on merged #276):

1. **Adapt `hub/tests/e2e/group-of-groups.spec.ts` — it is currently RED.** The fold removed the panel's accept-as-group buttons (`accept-as-group-*` / `decline-as-group-*` testids gone); the invited row now shows `respond-in-notifications-*`. The accept-as-group step must move to answering in the **bell** (or be dropped there and covered by the new N-B E2E).
2. **Write the N-B E2E** (`hub/tests/e2e/notification-actions.spec.ts` or similar): a group A invites engagement group B (B has ≥2 `act_as_group` holders) → each holder's bell shows an `acting_invitation` with Accept/Decline → one answers → the co-leader's row reads "Answered by [name]" (buttons gone); plus a stewardship-nomination answered in the bell. **Fixture note:** single-token display names (nickname first-token render).
3. **Run E2E green** — needs the **dev server** on `localhost:3000` + the **flaky ES256 dev DB**. The window is intermittent; the technique that worked this session was a **background auto-retry loop** (re-run until green; treat an ES256 log as "keep waiting"; stop on any non-ES256 failure).
4. **Close:** FEAT-PD014 + FEAT-H031 → **6-done** (Implementation notes + L4 summaries in the same commit), **ADR-U051 → Accepted**, the completion plan N-B row marked built, area-gate DoD line-items (W12 done; the ADR-U043 measurement pass + Stefan's live walk are area-gate, not per-cycle — A-NTF still has N-C + N-D). Then merge PR #277 (`--squash --delete-branch`), sync main, rebase/close.
5. Session bridge + discovery sweep.

## Key facts the next session needs

- **The migration is already applied to the dev DB + log repaired** — do NOT re-apply `20260724120000`.
- **ES256 dev-DB flake (TASK-INT-01) is actively flickering** — `createTestUser` intermittently fails with `unrecognized JWT kid <nil> for algorithm ES256`. It is control-proven environment (the unchanged N-A suite fails identically on `main`). The **background auto-retry loop caught the window** this session. Regular service-role DB queries (`runAdminSql`, `admin.from`) and the migration apply path are NOT affected — only the GoTrue auth-admin `createUser` API.
- **`gh pr merge` and `supabase-cli.sh` are intermittently blocked by the auto-mode classifier.** Stefan gave a **standing okay for me to merge** (verbal, 2026-07-24) — retry `gh pr merge` and it may pass; if blocked, Stefan runs it with `-R Stefansteffansson/FringeIsland`.
- ADR-U051 links list FEAT-PD014/H031/PC015/PD013 + the substrate anchors; the convergence design is **Option A (record on the notification rows)**.
- The `respond_to_group_invitation` acting handler is **untouched** (NB-1); N-B wraps it.

## Open threads (carried)

- **TASK-INT-01** ES256 flake — still parked, awaiting Supabase. Actively flickering as of this session.
- **ADR-U050** — still `Proposed`, riding the C-F schema gate (TASK-DOC-005).
- **A-NTF cycles N-C (realtime + reconnect + announcement adapter; NB-7 legacy-publication drop) and N-D (preferences + shared dispatcher)** are unbuilt — the area is not closed.
