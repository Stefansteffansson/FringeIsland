# FEAT-PD013: Notification routing contracts and category registry

---
id: FEAT-PD013
title: Notification routing contracts and category registry
owner: platform/domain/communication
consumers: [hub]
wave: ferd
maturity: 4-ready
requires-equipment: none
---

## Problem

The Notifications-vertical delivery substrate (`public.notifications`, ADR-U048) is live and written to by ~19 trigger/RPC emission sites, but nothing above it exists: there is no DS-5 routing contract to list, count, or mark-read (v1 read the table directly via RLS — the exact API-first sin v2 exists to fix), `notifications.type` is free TEXT so no category law can bind it (V3 §6: "preferences cannot suppress by category yet"), and notification rows — personal data addressed to a recipient — are absent from the GDPR own-data export. A-NTF Cycle N-A realises the DS-5 notification-routing sliver (DS-5 spec §"Notification operations", `communication.md:56`) and the V3 category-catalog obligation (NB-4, board settled 2026-07-23).

## Solution sketch

One schema-gated migration, four moves:

1. **Two open registries** (data-driven, never sealed — DS-5 invariant 6, V3 §6):
   - `notification_categories(key text PK, label text, lawful_basis text CHECK IN ('transactional','consent'), interruption_grade text DEFAULT 'badge', created_at)` — the preference/suppression grain (V3) and the per-category interruption-grade declaration (V3 surfaces law). `lawful_basis` is a legal dichotomy, not a kind set — the CHECK is not a sealed-enum violation; `interruption_grade` stays unconstrained text (design-system grammar, data-driven).
   - `notification_kinds(kind text PK, category_key text FK→notification_categories, label text, created_at)` — the emission grain (DS-5 "notification-event kinds: registry row + routing rule", `communication.md:74`).
   - Seeds fold every realized kind (~19 at kickoff — invitation_received/accepted/declined, member_left/removed, role_assigned/removed, group_deleted/closed/archived, stewardship_transferred/required/nomination, participation_paused/activated, group_journey_enrollment, journey_completed, admin_notification, announcement) into six proposed categories (membership, group-lifecycle, stewardship, account, journeys, platform), all `transactional` in Ferd. Then FK `notifications.type → notification_kinds(kind)`.
2. **Read/serve contracts** (SECURITY DEFINER, `search_path=''`, four-hop actor resolution P-O1, REVOKE from public/anon, GRANT authenticated): `get_own_notifications(p_limit, p_before_created_at, p_before_id)` (keyset-paginated, newest-first, joined to kind→category), `get_own_unread_notification_count()`.
3. **Write-narrowing + read-state contracts**: `mark_notification_read(p_notification_id)`, `mark_all_notifications_read()`; DROP the v1 `notifications_update_own` / `notifications_delete_own` RLS policies — the contracts become the only user-facing door (A-COM write-narrowing precedent). Trigger/definer INSERT paths untouched (delivery writes are obligation-fulfilment per U048).
4. **Export section**: `get_own_notifications_export()` composed into `get_own_data_export()` as the `notifications` section (right-of-access; ungated actor resolution per the CB-6 export-contract precedent).

Emission sites, `admin_send_notification`, and `respond_to_stewardship_nomination` are untouched.

## Appetite

One cycle (N-A), platform half — roughly one focused session for migration + red-first contract suite. Fixed time; the six-category cut is adjustable scope (fewer categories is fine, an unsealed registry is not).

## Rabbit holes

- **Preferences and the dispatcher are N-D**, not here — and the preference-home question is a live three-way canonical tension (V3 §6 says PC-2; Hub §L3 NTF-10 says PC-4; DS-5 spec §Entities says DS-5 tables). Do not resolve it in this cycle; N-D decomposition adjudicates.
- **Do not re-categorise or reword existing notifications' title/body** — the registry classifies kinds; it does not rewrite delivered rows.
- **Stray-type safety**: the FK can only validate if every distinct `type` in the live table has a registry row. The build verifies with `SELECT DISTINCT type` against the seed set before the FK lands; an unseeded stray gets an explicit registry row, never a silent catch-all category.
- **No realtime work** (N-C) and no action-dispatch work (N-B).

## No-gos

- No notification-delete contract (not in Hub §L3; the v1 `delete_own` policy is dropped, re-addable later behind a contract if a capability row ever asks for it).
- No digest/aggregation (NB-6: forward, Eid+), no email or external channels (NB-2: ADR-U040 deferral), no quiet-hours/frequency-caps (NB-5: minimal dispatcher scope, N-D).
- No changes to emission triggers or their copy.

## Stories

### STORY-1: Category and kind registries with lawful basis
As the platform, I want every notification kind declared in a data-driven registry row carrying category and lawful basis, so that preference suppression (N-D) and V3's category law have something to bind to.

**Acceptance criteria:**
- Given the migration has run, when the registries are inspected, then `notification_categories` and `notification_kinds` exist, every realized kind string has a `notification_kinds` row referencing a category, and every category carries `lawful_basis` and `interruption_grade`.
- Given the live `notifications` table, when `SELECT DISTINCT type` is compared to the registry, then zero unregistered types exist and the FK `notifications.type → notification_kinds(kind)` is valid and enforced.
- Given a new INSERT into `notifications` with an unregistered type, when it executes, then it is rejected by the FK.
- Given a future kind, when a registry row is inserted (seed or migration), then no CHECK, enum, or code change is required for it to flow (open-registry proof: insert a test kind, deliver against it, list it).

### STORY-2: List contract
As a FIM, I want to fetch my notifications newest-first with keyset pagination, so that the bell dropdown and inbox render my history without direct table reads.

**Acceptance criteria:**
- Given I have notifications, when I call `get_own_notifications(p_limit := 20)`, then I receive only rows where I am the recipient, ordered `created_at DESC, id DESC`, each carrying exactly: `id, kind, category, title, body, group_id, created_at, is_read, read_at, action_type, action_taken, expires_at` (the N-A payload — `action_data`/`action_taken_at` are deliberately excluded until N-B names their consumer).
- Given more rows than `p_limit`, when I pass the last row's `(created_at, id)` as the keyset cursor, then I receive the next page with no gaps or duplicates.
- Given another member's notification, when I call the contract, then that row never appears (adversarial: a second test actor's rows are invisible).
- Given a Mist/anon caller, when the contract is called, then it is refused (REVOKE/grant posture + actor resolution).

### STORY-3: Unread count contract
As a FIM, I want a cheap unread count, so that the bell badge is accurate on every page.

**Acceptance criteria:**
- Given N unread notifications, when I call `get_own_unread_notification_count()`, then I receive exactly N, and the plan uses the `idx_notifications_recipient_unread` partial index (verified once in the suite via EXPLAIN).
- Given I mark one read, when I re-call, then the count is N-1.

### STORY-4: Read-state contracts and write-narrowing
As a FIM, I want to mark notifications read (one or all), so that unread state reflects what I've seen — through the contract door only.

**Acceptance criteria:**
- Given my unread notification, when I call `mark_notification_read(id)`, then `is_read = true` and `read_at` is set; calling it again is idempotent (no error, `read_at` unchanged).
- Given another member's notification id, when I call `mark_notification_read(id)`, then it is refused/no-op with zero rows affected (adversarial).
- Given several unread rows, when I call `mark_all_notifications_read()`, then all my unread rows flip and the call returns the flipped count; other members' rows are untouched.
- Given the migration has run, when RLS policies on `notifications` are enumerated, then no user-facing UPDATE or DELETE policy exists (select_own stands; the read-state contracts are the only mutation door), and a direct `UPDATE notifications` as an authenticated user affects zero rows.

### STORY-5: Notifications join the own-data export
As a FIM, I want my notification history in my data export, so that right-of-access covers everything addressed to me.

**Acceptance criteria:**
- Given I have notifications, when I call `get_own_data_export()`, then a `notifications` section is present containing my rows (id, kind, title, body, created_at, read state, action state).
- Given a suspended member, when they call the export, then the section is included (ungated actor resolution — the CB-6 posture, same as `get_own_messages_export()`).

### STORY-6: Conformance riders
As the platform, I want the mechanical gates to know the new surface, so that the ring rules stay enforced.

**Acceptance criteria:**
- Given the conformance suite, when it runs, then the four new RPCs are in `DS_OWNED_ALLOWLIST`, the two registry tables are classified in `supabase/ownership.manifest.json` (unclassified fails red), and `notifications` remains OUT of `DS_TABLES` (ADR-U048).
- Given W12, when the area gate runs, then each RPC's permission/lifecycle/consent gating has an adversarial direct-call test cited (the STORY-2/3/4 adversarial ACs).

## Platform dependencies

PC-2/PC-3 four-hop actor resolution (`get_current_personal_group_id()` for gated contracts; direct `auth.uid()` resolution for the export per CB-6). PC-4 audit: none new (read/read-state contracts are not audited acts). The V3 delivery substrate itself (ADR-U048) — consumed, not modified.

## Cross-product impact

Hub consumes via FEAT-H030 (paired, this cycle). Gimbal/Studios: none now; the contracts are surface-neutral and any future surface consumes the same door. Registry `interruption_grade` is declared for the design-system grammar (V3 surfaces law) — consumed by surfaces from N-A onward.

## Vertical impact

- **Privacy/GDPR:** Recipient-scoped RLS select stands; contracts resolve the actor server-side; the export gains the `notifications` section (right-of-access, STORY-5). No new personal-data classes — registries are metadata.
- **Notifications:** This feature *realises* the vertical's category-catalog obligation and the DS-5 read/serve contracts (V3 §6 Platform Core rows 1, 4; DS-5 spec `communication.md:56`). Delivery-side dispatcher law (suppression) lands N-D.
- **Administration:** None new (`admin_send_notification` untouched; Console surfaces are A-ADM).
- **Observability:** Contract errors surface through standard PostgREST error channels; delivery-outcome tracing to source events is recorded as N-D dispatcher scope, not built here.
- **Transactions:** None.
- **Extensibility:** The point of the feature — two open registries, FK-enforced but registry-extensible; no sealed enums (`lawful_basis` CHECK justified as a legal dichotomy, not a kind set; `interruption_grade` open text).

## Performance budget

N/A (no surface). Contract-level note for the consumer: `get_own_unread_notification_count()` must stay on the partial index (STORY-3 EXPLAIN check) since FEAT-H030 calls it on every page mount.
