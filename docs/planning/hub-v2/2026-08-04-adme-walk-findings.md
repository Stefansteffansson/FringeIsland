# ADM-E live-walk findings — 2026-08-04 (Stefan's walk of the bounded list + bulk family)

**Context:** Stefan walked the freshly-deployed Cycle ADM-E build (FEAT-PC024 + FEAT-H039, PRs #399–#401) on production. Scenarios A (bounded list), B (bulk with the designed refusal), C (audit cross-check), D (W-4 singles) — "everything else seems to work." Three findings; WA-1 was ruled and **fixed during the walk**; WA-2/WA-3 are directives for the ADM-F opener. Substrate claims verified in-session at the cited lines.

---

## WA-1 (RULED + FIXED IN-WALK) — guaranteed-no-op bulk actions disable

**The walk:** an all-suspended selection still offered **Suspend**; the refusal arrived only in the outcome panel after the run. The shipped shape was RB-2's deliberate per-row-outcome honesty — correct for **mixed** selections, but for an all-ineligible selection the ceremony is a guaranteed no-op, and the single-member rail already follows "the surface never offers what the contract will refuse."

**Stefan's ruling (option b of the presented board):** an action disables when **zero** selected members could accept it — the detail rail's payload-fact derivations (suspend = `active` · reactivate = `paused`/`suspended` · force sign-out = non-terminal); mixed selections stay fully enabled, per-row outcomes remain their honesty mechanism.

**Fixed in-walk (this PR):** red-first — 3 red cells + the mixed-selection designed-green control pinning RB-2; the disabled state carries a reason title and stays inside the three-button bar (the STORY-5 pin holds).

## WA-2 (DIRECTIVE) — the audit log names its targets for humans

**The walk:** `/admin/audit` renders member targets as raw `target_user_id` uuids — "impossible for humans to understand."

**The asymmetry:** `admin_get_audit_log` (FEAT-PC022, `20260802120000:365`) already live-resolves the **actor** (`actor_display_name`, LEFT JOIN, null-safe for erased); the **target** column is polymorphic TEXT (user ids, group ids, literals like `'users'`) and ships unresolved.

**Build shape (PC022 amendment — schema gate):** re-issue the read resolving targets symmetrically — a user id renders display name + email, a group id renders the group name, literals and unresolvable/erased targets render as-is; the raw value stays in the row (the audit record itself is untouched — append-only; resolution is read-time display shaping). Surface: the audit browser renders the resolved form, uuid in the expandable metadata.

**Routing:** rider on the ADM-F opener's schema gate.

## WA-3 (DIRECTIVE CANDIDATE) — hard delete refuses on every consented member

**The walk question:** "does hard delete work now? Will it release engagement groups, enrolled journeys, and the personal group?"

**Verified in-session:** the cascade is real — audit-before-delete, DS-5 forum reattribution to `[Deleted User]`, DS-3 enrolment cleanup, memberships die with the personal-group cascade, `users` + `auth.users` rows deleted (`20260801190000`, the `admin_hard_delete_user` body). **But the body handles consent records not at all** — no purge, no sanctioned-GUC leg — so for any member who ever recorded a consent decision (every credentialed signup, every transcended Mist) the personal-group delete hits `consent_records_subject_group_id_fkey` RESTRICT → 23503 → the console's generic 500. No test tier covered the consented case (the integration fixture purged consent first; the E2E journey never hard-deleted). The last-resort tool refuses on precisely the members it exists for, with a dishonest error — the WA-1 class plus a masked refusal.

**Build shape (PC021 amendment — schema gate):** `admin_hard_delete_user` gains the consent-erasure leg (purge the subject's `consent_records` under `app.consent_erasure_in_progress` before the group delete — hard delete *is* the full-erasure tool); the gate suite gains the consented-member cell the family never had.

**Routing:** rider on the ADM-F opener's schema gate, alongside WA-2. Related standing item: TASK-E2E-02 (the same FK silently leaked 1,289 E2E fixtures — found at the ADM-E close).

---

*Filed 2026-08-04 during the walk (session 5's follow-on); bridge: `2026-08-03_05`. WA-1's fix rides the same PR as this file.*
