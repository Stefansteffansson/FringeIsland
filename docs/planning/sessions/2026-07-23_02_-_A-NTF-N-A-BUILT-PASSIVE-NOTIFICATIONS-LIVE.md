# Session bridge — A-NTF Cycle N-A built: passive notifications live

**Date:** 2026-07-23 (session 02) · **Wave:** Ferd · **Area:** A-NTF (Notifications), Phase-3 area 5 of 6
**Follows:** [`2026-07-23_01_-_ES256-FLAKE-ESCALATED-AWAITING-SUPABASE.md`](./2026-07-23_01_-_ES256-FLAKE-ESCALATED-AWAITING-SUPABASE.md)

---

## One-paragraph state

A-NTF was kicked off and its first cycle built, all in this session. The **area completion plan** ([`../hub-v2/phase-3-notifications-completion-plan.md`](../hub-v2/phase-3-notifications-completion-plan.md)) was authored from a four-scout disk-verified terrain sweep, its **decision board settled** (NB-1..6/NB-8 as recommended; **NB-7 overridden by Stefan** — drop the legacy realtime publication in N-C), and **Cycle N-A built to `6-done`**: passive notifications now render in the Hub. The paired specs — **FEAT-PD013** (DS-5 notification-routing contracts + the V3 category registry) and **FEAT-H030** (the bell + dropdown + `/notifications` inbox) — are both `6-done`. The four remaining cycles (N-B smart/actionable, N-C realtime+reconnect, N-D preferences+dispatcher) are unbuilt.

## What shipped in N-A

- **FEAT-PD013 (platform, DS-5):** two open registries — `notification_categories` (lawful basis + interruption grade) and `notification_kinds` — folding all ~19 realized kinds into 6 categories, with `notifications.type` now FK-enforced (the V3 §6 category-catalog obligation, board NB-4). Four read/serve contracts (`get_own_notifications` keyset, `get_own_unread_notification_count`, `mark_notification_read`, `mark_all_notifications_read`); the v1 `notifications_update_own`/`_delete_own` RLS policies **dropped** (write-narrowing — the contracts are the only user-facing door); `get_own_notifications_export()` composed into the GDPR export (CB-6). Migration `20260723120000`, applied at the named schema-gate nod (PR #271). Integration suite 16/16.
- **FEAT-H030 (Hub surface):** FIM-only bell with a context-cached unread badge (`9+` cap, optimistic decrement + rollback), a recent-15 dropdown (unread-first, mark-on-click + navigate-or-stay, mark-all, view-all), and the full keyset-paginated `/notifications` inbox (v1 had no history page). Kind-agnostic rendering with a safe unknown-kind fallback + a read-only status chip (Awaiting/Handled/Expired — the Accept/Decline UI is N-B). Four BFF routes over the PD013 contracts (ADR-U037 getClaims/getUser split). The bell **relocated** `components/ui`→`components/notifications` (feature component). 24 unit tests + a real-invitation E2E.
- **Gates:** full Hub unit suite **915/915**; route-policy + outer-ring + ownership-manifest conformance green; `next build` green; E2E journey green ×3.

## Found-not-caused (fenced, per the DoD)

- **Two pre-existing A-COM E2E failures** — `forum.spec.ts` + `realtime.spec.ts` asserted the old tombstone copy `/removed by a group moderator/i`; A-COM commit `00c0010` (walk wording fix, 2026-07-22) deliberately neutralised the component copy to "This post was removed" but left those two assertions. **Realigned** to `/this post was removed/i` this cycle (labelled sibling-suite adaptation). Proven to predate #273 via git blame; my change never touches `GroupForumSection.tsx`.
- **ES256 auth flake (TASK-INT-01)** fired once on `onboarding-arrival` in the fleet; **a profile `toHaveURL` fleet-load flake** fired once — **both pass in isolation**. Neither caused by A-NTF. TASK-INT-01 remains parked, still awaiting Supabase.

## Decision board — where it stands (settled 2026-07-23)

NB-1 thin-dispatch to existing dedicated handlers · NB-2 in-app only, email deferred (ADR-U040) · NB-3 in-app announcement adapter only · NB-4 category registry (built in N-A) · NB-5 minimal dispatcher (N-D) · NB-6 digest forward · **NB-7 OVERRIDDEN — drop the legacy `notifications` realtime publication in N-C** (replace-then-remove, leaves `supabase_realtime` empty) · NB-8 Mist verify-and-record.

## Next actual work — Cycle N-B (smart / actionable notifications)

NTF-4/5/6/8: the typed-action UI (Accept/Decline + acknowledge, extensible), **NTF-6 re-derived per NB-1** — the action submit thin-dispatches to the already-existing dedicated handlers (`accept_group_invitation`/`decline_group_invitation`, `respond_to_stewardship_nomination`, `submit_content_report`), and NTF-8 lazy-expiry-on-view. Note a pre-existing `app/api/notifications/[id]/nomination-response` route already lives under `[id]/` (from the Groups stewardship flow) — N-B should reconcile the action-dispatch surface with it. A design session on the category-catalog + dispatcher model was flagged in the plan but N-A only needed the registry; revisit whether N-B/N-D still want one.

## Open threads (unchanged)

- **TASK-INT-01** ES256 flake — parked, awaiting Supabase reply (see session 01 bridge). Nothing to do.
- **ADR-U050** — still `Proposed`, riding the C-F schema gate (TASK-DOC-005).
