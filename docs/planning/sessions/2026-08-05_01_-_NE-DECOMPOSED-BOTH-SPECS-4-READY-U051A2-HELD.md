# Session bridge — N-E decomposed: FEAT-PD017 + FEAT-H042 at 4-ready, U051 Amendment 2 held

**Date:** 2026-08-05 (session 10) · **Wave:** Ferd · **Cycle:** N-E (**decomposed — build next**)
**Follows:** [`2026-08-04_06_-_ADMG-CLOSED-GATE-APPLIED-BOTH-SPECS-6-DONE.md`](./2026-08-04_06_-_ADMG-CLOSED-GATE-APPLIED-BOTH-SPECS-6-DONE.md)

---

## READ THIS FIRST — the state after this step

1. **Cycle N-E is decomposed.** The WF-1 directive (bell-answerable group invitations) + the WS-4 rider (the `/groups` landing focus) are paired specs at `4-ready`: [FEAT-PD017](../../platform/domain/features/FEAT-PD017-bell-answerable-personal-invitations.md) (platform, DS-5) ↔ [FEAT-H042](../../products/hub/features/FEAT-H042-invitation-bell-answers-and-groups-landing-focus.md) (Hub). Payload walk done in-spec (H042 §Payload walk — every `action_data` key has a named consumer). PR **#422 merged**; registers advanced same-batch (both feature READMEs, both L4 summaries, and the Platform-Ops exit checklist gained its missing N-E row).
2. **PR #423 is OPEN and HELD** — ADR-U051 **Amendment 2** (the "invitation_received path untouched" Neutral clause superseded; the N-E shape recorded). ADR carve-out: merges only on Stefan's **named** nod ("ok merge 423"). It does not block the build — the specs carry the same commitments.
3. **The design board (all defaulted on precedent, recorded in the specs):** thin `respond_to_personal_invitation(p_notification_id, p_accept)` composing the **untouched** Core `accept_group_invitation`/`decline_group_invitation` (NB-1) · **all-doors convergence as a delivery-substrate trigger on `group_memberships`** (AFTER UPDATE invited→active = accepted; AFTER DELETE of invited = declined-if-self, else cancelled) — total by construction, no Core-body edits, ADR-U048 classification · **`cancelled` convergence withholds the canceller's name** (the invitee may be a non-member; the fact converges, not the actor) · backfill arms standing pending invitations, historical orphans stay passive · registry: `notification_kinds.dispatch_segment='invitation-response'`, the `accept_decline` response row reused (U051A1 — no new action_type) · `ANSWER_PATHS` keeps its entry, upgraded to `/groups?focus=invitations` (dropping it would resurrect the W-04 dead end via `/groups/[id]`).
4. **Key substrate facts (verified this session, canonical-cited in the dossier work):** invitations are `group_memberships` rows at `status='invited'` — **no invitations table, no terminal status; decline and cancel DELETE the row** (hence Option A durable convergence). `cancel_member_invitation` never touches notifications — the pre-existing hole N-E closes. `action_taken` is unconstrained TEXT (`20260723120000:134`) — `cancelled` is a data value. Personal Core contracts key on `p_group_id`; convergence keys on `membership_id` — both ride `action_data`.
5. **Build next (feature-development skill):** one schema-gated migration (`n_e_bell_answerable_personal_invitations`) — **held at the gate** per the standing rule (red tests + apply commands in the PR body; merge only on a named approval) · Hub tranche (BFF route + chips + focus rider + unit) can land ahead of the gate per the ADM-G tranche pattern · one E2E journey covers WF-1 + WS-4 (the WS-board's own line). Sibling-assertion sweep named in PD017's rabbit holes (`oracle-spine-port` passive-kind case, `typed-action-registry` catalog pins, `invitation-contracts` fixtures).

## Standing items (carried)

TASK-E2E-01 (three distinct flake specs; 2 h fix due at the next boundary) · TASK-E2E-02 (consented-fixture leak; purge decision Stefan's) · AB-6's docket (Tier-1 `has_permission` finding · `/admin/roles` + admin-plane deep-cold U043 pass · the sealed-threads admin-sight question) · the deferred Eid piles · the G-3 journeys deferral (2026-08-04). Sequence after N-E: **AB-6** (the FULL audit).

## Close ritual (this step)

- [x] Discovery swept at session start (clean, in sync) and re-synced after #422
- [x] Registers same-batch with the spec creation (L4 discipline)
- [x] Session bridge (this file)
- [ ] Dashboard refresh + doc-health owed at cycle close, not at decomposition
