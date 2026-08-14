# FEAT-PC002: Mist ephemerality reaper + atomic transcendence + consent substrate — the platform half of IDN-2

---
id: FEAT-PC002
title: Mist ephemerality reaper + atomic transcendence + consent substrate — the platform half of IDN-2
owner: platform/core/identity
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

FEAT-PC001 shipped the **arrival** half of the Mist lifecycle (stages 1-2: Entry + Access) and **deferred stages 3-4 by design**. Three substrate gaps remain, and the first is **live debt**:

1. **No ephemerality reaper (the accumulation gap is open).** ADR-U031 stage 3 makes ephemerality the privacy protection for the unconsented entrant ("a short, configurable TTL after **inactivity** plus an **explicit-erase** path on close"), but no sweep exists: pg_cron is not enabled, and actual-entrant Mist rows accumulate with no automated cleanup — "known, bounded, logged" since FEAT-H003/PC001. The `mist.entered` telemetry already carries `reaperRealised: false` to mark the gap.
2. **No atomic transcendence.** ADR-U031 stage 4 is the persistence-and-consent threshold — "the one moment data binds durably: consent is captured, the session's experience transfers into the FIM account with **continuity** (nothing restarts), and the migration is **atomic**." No substrate realises it; today the Hub's become-a-FIM CTA routes to FEAT-H002 sign-up and **does not migrate Mist data**.
3. **No consent substrate.** ADR-U031 locks *that* consent is captured at transcendence; the substrate (shape, ownership, extensibility) was latent in identity-spec §8 **Q8 / X4**.

The two blocking design decisions are now resolved: **[ADR-U033](../../../architecture/decisions/ADR-U033-mist-ephemerality-reaper.md)** (enable pg_cron; a scheduled `SECURITY DEFINER` sweep) and **[ADR-U034](../../../architecture/decisions/ADR-U034-consent-record-substrate.md)** (append-only consent records, PC-2-owned, captured atomically at transcendence). This feature builds the **departure + transcendence** slice (stages 3-4) that the Hub's **FEAT-H004 (IDN-2)** consumes.

### Why Platform Core, not a Domain Service (sub-tier authoring bar)

The reaper, the `auth.users` anon→permanent finalisation, and the consent substrate are **foundational PC-2 Identity primitives** — they mutate the auth-and-user-row substrate every surface depends on, and the reaper runs as DB-owned scheduled infrastructure (PC-1). A Domain Service cannot own scheduled erasure of `auth.users` rows or the transcendence finalisation without inverting the one-way dependency rule (Domain → Core, never reverse). This is an **additive extension of the existing PC-2 §9 Mist lifecycle capability**, continuing FEAT-PC001 — not a new Core surface invented for convenience.

## Solution sketch

Three substrate clusters, aligned to §9 stages 3-4, ADR-U033, and ADR-U034:

1. **Ephemerality reaper (ADR-U033).** Enable `pg_cron` (verified available, `default_version 1.6.4`, not yet enabled). A scheduled `SECURITY DEFINER` sweep function selects **expired, un-transcended** Mists (inactivity-based TTL) and performs the full erasure cascade (the Mist's `auth.users` row, proto personal group + membership, journeys, any session-scoped rows — no orphans). TTL/inactivity threshold lives as **PC-2 configuration**, not hardcoded. An **explicit-erase** RPC erases immediately on close ("say goodbye"), independent of the scheduled sweep. Sweep cadence ≪ TTL so expiry is bounded by the TTL, not the cadence.

2. **Atomic transcendence (ADR-U031 stage 4).** A `SECURITY DEFINER` finalisation function runs **in one transaction**: it is invoked **after** the Supabase anonymous→permanent conversion (which preserves the **same `auth.users.id`**, so all the Mist's FK-linked rows carry over with **continuity — nothing restarts, no cross-account copy**). The function flips `is_temporary => false`, **enrols the new FIM in "FringeIsland Members"** (the Member baseline a Mist is denied per FEAT-PC001 STORY-3), writes the consent record (cluster 3), and emits the transcendence event — atomically. **Scope: the persistence-and-consent threshold only.** The metamorphosis-at-completion gate (ADR-U031: the ball / Beyond, fired only when "all founding questions answered") is **forward-looking** — the founding-questions assessment is unbuilt; this feature wires the persistence-and-consent half and leaves the completion gate as a documented seam.

3. **Consent substrate (ADR-U034).** A new **append-only** consent-record table (subject = the FIM via the repo actor chain, **open** purpose identifier, policy version, timestamp, capture context), with **RLS** (new table → RLS without exception) and append-only enforcement (no UPDATE/DELETE outside the controlled erasure path). The first record is written **in the same transaction** as the transcendence finalisation. IDN-2 captures only the **transcendence** purpose.

**The clean boundary (both ADRs):** consent records exist **only post-transcendence**; the reaper reaps **only pre-transcendence Mists** — so the reaper's erasure cascade never touches a row carrying durable consent proof. FIM account-level erasure is a **distinct path** (anonymise the consent subject link, retain the consent event as legal proof).

## Appetite

The **departure + transcendence substrate** — one migration enabling pg_cron + the sweep/explicit-erase functions, the transcendence finalisation function, and the consent table + RLS, behind the schema-review gate, all green against the integration suite with the FIM and Mist-arrival paths unregressed. Fixed: the reaper (closing the accumulation gap), atomic persistence-and-consent transcendence with continuity, and the append-only consent substrate. **Out of appetite:** the founding-questions assessment, the metamorphosis-completion gate (ball / Beyond unlock), consent withdrawal / re-consent / multi-purpose UI, and any Hub UX (FEAT-H004).

## Rabbit holes

- **The reaper must not race transcendence (ADR-U031 invariant: "no erase mid-migration").** Because TTL is **inactivity-based**, an actively-transcending Mist is by definition recently active and outside the sweep set; additionally the transcendence finalisation runs in a single transaction with row-level locking, and the sweep excludes any row with an in-flight-migration marker. Test the concurrent-reap-vs-transcend window explicitly.
- **Continuity is id-preservation, not a copy.** Supabase anon→permanent conversion keeps the same `auth.users.id`. Do **not** build a cross-account data migration — transcendence is a **finalise-in-place** (flag flip + Members enrolment + consent write). Building a copy would risk the very mid-migration erasure the invariant forbids.
- **Append-only ≠ never-erasable.** Consent records are insert-only for *state changes* (a withdrawal is a new appended row), but GDPR right-to-erasure of a FIM account must still reconcile: **anonymise the subject link, retain the consent event** as proof. Don't conflate the reaper's hard-delete cascade (pre-transcendence) with FIM account erasure (post-transcendence, retention-bound).
- **pg_cron is a standing platform commitment.** Enabling it is an always-on extension + a monitored job. A failing or runaway sweep is now an ops concern — emit run events (counts swept/erased/skipped) so failures are observable, never silent.
- **`SECURITY DEFINER` + `search_path = ''` discipline.** The sweep, explicit-erase, and transcendence functions bypass RLS by design — keep bodies narrow, document the elevation in the migration comment, and set `search_path = ''` (platform-tier gotcha).
- **New table → RLS without exception.** The consent table needs RLS even though it is "internal-ish": the subject reads only their own consent rows; no broad exposure. Verify the INSERT…RETURNING dual-policy trip if the write returns the row.
- **Migrations run in timestamp order — never rewrite FEAT-PC001's migration.** Add a new corrective/additive migration via the supabase-CLI workflow.

## No-gos

- **No founding-questions assessment, no metamorphosis-completion gate, no ball / no Beyond unlock** — IDN-2 delivers the **persistence-and-consent** threshold only (ADR-U031 stage 4, persistence half). The completion gate ("all founding questions answered" → ball / full function) wires to the assessment when it is built; named here as a forward-looking seam, not built.
- **No consent withdrawal / re-consent / multi-purpose capture / consent UI** — the substrate is shaped for them (open purpose, append-only) but IDN-2 captures only the transcendence purpose; the rest is a later Privacy-vertical feature built *on* this substrate (ADR-U034 §4).
- **No Hub UX** — the transcendence flow, consent gate, and "say goodbye" affordance are FEAT-H004; this feature provides the substrate + contracts they consume.
- **No anonymous cross-session continuity** — unchanged from FEAT-PC001/ADR-U031: a reaped Mist returning is a new Mist; durable memory is the FIM's, granted at transcendence.
- **No breaking change to existing contracts** — the reaper is internal pg_cron infrastructure; transcendence + explicit-erase are **additive** new contracts (PostgREST RPC / `/api/v1`, ADR-U015), not signature changes to FEAT-PC001's SDK-shape anon sign-in. No ADR-U015 version bump.

## Stories

### STORY-1: Scheduled reaper erases expired un-transcended Mists (ADR-U033)
As the platform, I want a scheduled job to erase abandoned Mists after an inactivity TTL, so ephemerality is an enforced guarantee and the accumulation gap closes.

**Acceptance criteria:**
- Given `pg_cron` is enabled by migration and a Mist whose inactivity exceeds the configured TTL, when the scheduled sweep runs, then the Mist's `auth.users` row, proto personal group + membership, journeys, and any session-scoped rows are erased with **no orphaned child rows**.
- Given a Mist active within the TTL, when the sweep runs, then it is **not** erased (inactivity-based, not creation-based).
- Given a **transcended FIM** (`is_temporary = false`), when the sweep runs, then it is **never** in the sweep set (the reaper touches only pre-transcendence Mists).
- Given the TTL/inactivity threshold, when it is read, then it resolves from **PC-2 configuration**, not a hardcoded literal in the function body.

### STORY-2: Explicit-erase on close ("say goodbye") (ADR-U033)
As a Mist who chooses to leave, I want my data erased immediately, so I can end my visit without waiting for the sweep.

**Acceptance criteria:**
- Given a Mist session, when the explicit-erase RPC is invoked, then the same full erasure cascade as STORY-1 runs **immediately** for that Mist, independent of the scheduled sweep.
- Given the explicit-erase RPC, when invoked by a non-owner or against a non-temporary user, then it is denied (a Mist may erase only its own session).

### STORY-3: Atomic persistence-and-consent transcendence (ADR-U031 stage 4)
As a Mist becoming a FIM, I want my session finalised into a persisted account in one atomic step with nothing restarting, so my experience carries over continuously.

**Acceptance criteria:**
- Given the Supabase anonymous→permanent conversion has linked the session (preserving the same `auth.users.id`), when the transcendence finalisation function runs, then **in one transaction** it sets `is_temporary => false`, **enrols the user in "FringeIsland Members"**, writes the transcendence consent record (STORY-5), and emits the transcendence event — all-or-nothing.
- Given transcendence completes, then all the former Mist's FK-linked rows (proto personal group → personal group, journeys) belong to the now-permanent FIM unchanged — **continuity, nothing restarts** (verified: same `personal_group_id`, no row recreation).
- Given the finalisation fails partway, when the transaction rolls back, then the user remains a valid Mist (no half-FIM state) and no consent record is written.
- Given a Mist is mid-transcendence, when the reaper sweep runs concurrently, then the Mist is **not erased** (the race guard holds — ADR-U031 "no erase mid-migration").

### STORY-4: Mist-erasure and transcendence cascades are specified and observable (ADR-U016 / V4)
As the platform, I want erasure and transcendence specified as cascades and emitted as events, so the lifecycle is complete and traceable.

**Acceptance criteria:**
- Given the cascade specifications below, when reviewed, then each documents the effect at every layer (PC-2, PC-3, each vertical) — the ADR-U016 DoR for platform lifecycle work.
- Given a sweep or explicit-erase runs, when it completes, then a **reaper-run / erasure event** (counts swept/erased/skipped, or the erased subject + outcome) is emitted (V4), failures included — flipping the `reaperRealised` signal **true**.
- Given a transcendence completes, when finalisation succeeds, then a **transcendence event** (actor + outcome) is emitted (V4), failures included.

### STORY-5: Append-only consent substrate, captured atomically (ADR-U034)
As the platform, I want consent recorded in an append-only, auditable, extensible substrate written atomically with transcendence, so consent is provable and future-proof.

**Acceptance criteria:**
- Given the consent table, when created, then it carries **RLS** (the subject reads only its own consent rows; no broad exposure), an **open purpose identifier** (text/lookup — **not a sealed enum**), policy version, timestamp, and capture context.
- Given a transcendence finalisation (STORY-3), when it commits, then **exactly one** consent record (purpose = transcendence) is written **in the same transaction** — no consent row without persistence, no persistence without consent.
- Given any actor, when an UPDATE or DELETE is attempted on a consent record outside the controlled erasure path, then it is **rejected** (append-only enforced by RLS/trigger).
- Given FIM account-level erasure (distinct from the reaper), when invoked, then the consent **subject link is anonymised and the consent event retained** as proof — not hard-deleted.

## Cascade specification (ADR-U016)

### Mist erasure (reaper sweep + explicit-erase — stage 3)

| Layer | Effect on Mist erasure |
|---|---|
| **PC-2 Identity** | The Mist's `auth.users` row + `public.users` profile hard-deleted (no PII retained; no consent record exists pre-transcendence, so nothing to retain). |
| **PC-3 Organisation** | Proto personal group, sole-member membership, and "Myself" role removed; no FringeIsland Members row (a Mist never had one). |
| **Privacy (V2)** | Realises the ephemerality guarantee — TTL-after-inactivity + explicit-erase; data minimisation completed by erasure. |
| **Observability (V4)** | Reaper-run event (counts) / explicit-erase event (subject + outcome), failures included; flips `reaperRealised` true. |
| **Administration (V1)** | The erasure sweep is the admin-owned cleanup the FEAT-PC001/H003 accumulation gap was logged for. No DeusEx surface; pg_cron-owned. |
| **Notifications / Transactions** | None — a Mist holds no durable address and no entitlements. |

### Mist → FIM transcendence (persistence-and-consent threshold — stage 4)

| Layer | Effect on transcendence |
|---|---|
| **PC-2 Identity** | `is_temporary => false` on the same `auth.users.id` (anon→permanent conversion preserves identity); consent record written (same txn). |
| **PC-3 Organisation** | The user is **enrolled in "FringeIsland Members"** (the FIM baseline); the proto personal group becomes the durable personal group unchanged (continuity). |
| **Privacy (V2)** | The one moment data binds durably — consent captured atomically; from here the reaper no longer applies; account-erasure becomes retention-bound. |
| **Observability (V4)** | Transcendence event (actor + outcome), failures included. |
| **Administration (V1)** | Transcendence is a lifecycle event; FIM account-state/exit cascades are later Identity features (IDN-9/10/12), named not built. |
| **Notifications (V3)** | Transcendence is the **welcome/onboarding notification trigger** — the trigger is emitted here; copy/routing is the Notifications area's (consumed by FEAT-H004). |
| **Transactions** | None — becoming a FIM grants no entitlement by itself. |

*The metamorphosis-at-completion cascade (ball / Beyond unlock, gated by the founding-questions assessment) is out of scope — named here so the omission is explicit, not silent.*

## Platform dependencies

- **PC-1 Infrastructure** — enabling `pg_cron` (the scheduling substrate, ADR-U033); the anonymous→permanent conversion mechanism (ADR-U004); `SECURITY DEFINER` + `search_path = ''` discipline for the sweep / explicit-erase / transcendence functions; migration discipline (timestamp order, never rewrite applied).
- **PC-3 Organisation** — FringeIsland Members enrolment at transcendence and the proto-group continuity, via the shared seam (the ADR-U016 `handle_new_user` factoring remains a separate queued PC-3 pickup, untouched here).
- **PC-4 Governance** — consumer of the consent substrate for scope-governance decisions (ADR-U034 ownership: PC-2 owns the table, Privacy levies obligations, PC-4 consumes).
- Strict-chain note: PC-2 depends on PC-1; PC-3 work is in the shared seam, documented bilaterally — no downward dependency introduced.

## Cross-product impact

Consumed by **Hub [FEAT-H004](../../../products/hub/features/FEAT-H004-mist-transcendence-and-farewell.md)** (IDN-2) — the transcendence flow, consent gate, and "say goodbye" affordance. The **Gimbal** (senses surface, native) will consume the **same** substrate for its own transcendence + farewell; only the platform-side semantics are shared. Surfaces consume via additive **PostgREST RPC / `/api/v1`** contracts (transcendence finalisation, explicit-erase) plus the Supabase SDK anon→permanent conversion — no breaking change, no ADR-U015 version bump.

## Stability posture (Platform Core §7)

- **What triggered the change:** §9 Mist lifecycle stages 3-4 entering active development via FEAT-H004 (ADR-U031), unblocked by ADR-U033 + ADR-U034. Additive — extends an existing capability, removes no contract.
- **Review escalation:** schema-review gate (human approval) — the migration (pg_cron enablement, the consent table + RLS, the three SECURITY DEFINER functions), its RLS impact, and both cascade specs are reviewed before merge; schema tasks are `review`, not `done`.
- **Deprecation pathway:** none — purely additive (new extension, new table, new functions/RPCs). No existing Internal/Platform API signature changes, so no version bump / consumer migration.

## Vertical impact

- **Privacy/GDPR:** the **core** of this feature. The reaper realises the ephemerality guarantee (TTL-after-inactivity + explicit-erase + complete erasure cascade); consent is captured atomically at transcendence in an append-only, auditable substrate; FIM account-erasure anonymises the subject link while retaining the consent event as proof. New consent table carries RLS; the subject reads only its own rows. Consent state is **authoritative in Platform Core** (other tiers ask, don't infer).
- **Notifications:** transcendence emits the **welcome/onboarding trigger** (the trigger lives here; copy/routing is the Notifications area, consumed by FEAT-H004). The reaper fires **no** FIM-visible notification (a Mist holds no durable address).
- **Administration:** the reaper is the admin-owned cleanup the accumulation gap was logged for; Mist-vs-FIM population visibility and DeusEx surfaces are later features. No raw admin primitive exposed here.
- **Observability:** reaper-run, explicit-erase, and transcendence events (actor/counts + outcome), failures included; flips `reaperRealised` true. SECURITY DEFINER privilege-escalation surfaces documented in the migration comment.
- **Transactions:** **None** — neither erasure nor transcendence involves payment or entitlement.
- **Extensibility:** the consent **purpose** is an **open identifier** (text/lookup), **not a sealed enum** — future consent purposes are data, not schema change (ADR-U018 spirit, ADR-U034). `is_temporary` remains a boolean identity-state flag, not a sealed enum.

## Resolved spec questions

1. **TTL/inactivity threshold + sweep mechanism** (identity-spec §8 Q10) — **resolved by [ADR-U033](../../../architecture/decisions/ADR-U033-mist-ephemerality-reaper.md):** enable pg_cron; a scheduled SECURITY DEFINER sweep + explicit-erase; TTL is PC-2 configuration; the reaper↔transcendence race guard is inactivity-based + transactional. Exact interval/TTL value and config store are build details (TDD).
2. **Consent substrate** (§8 Q8 / X4) — **resolved by [ADR-U034](../../../architecture/decisions/ADR-U034-consent-record-substrate.md):** append-only consent table, **PC-2-owned**, Privacy levies obligations, PC-4 consumes; written atomically with transcendence; open purpose. Exact DDL is a build detail.
3. **Remaining (build-time, not blocking):** the FIM account-erasure anonymise-vs-retain policy detail (named in ADR-U034 §5) is finalised during FEAT-PC002 build / Privacy adjudication; the ADR-U016 `handle_new_user` factoring remains a separate queued PC-3 pickup. **Resolved at build** — see Implementation notes, deviation 4.

## Implementation notes (6-done — 2026-06-27; retroactively backfilled 2026-07-25)

**Backfill honesty.** This section was **absent** when the feature closed. `doc-health-check` Section 5 caught it at the A-JRN cycle boundary (2026-07-18, filed as `TASK-DOC-004`) and again at the A-NTF N-B boundary (2026-07-24, re-filed as `TASK-DOC-006`); it is written here on 2026-07-25 from the **shipped record only** — the five migrations, the four integration suites, the two build bridges ([`2026-06-27_01`](../../../planning/sessions/2026-06-27_01_-_IDN-2-BUILD-FEAT-PC002-01-04-GREEN-SCHEMA-REVIEW-PENDING.md), [`2026-06-27_02`](../../../planning/sessions/2026-06-27_02_-_FEAT-PC002-05-FIM-ACCOUNT-ERASURE-GREEN-SCHEMA-REVIEW-PENDING.md)), and the closing commit `5cdd77b` — **not** from the build session's live context. Every claim below traces to a named file or bridge. Items the record does not establish are marked *unrecorded* rather than guessed.

The departure + transcendence substrate (§9 stages 3-4), consumed by Hub [FEAT-H004](../../../products/hub/features/FEAT-H004-mist-transcendence-and-farewell.md) (IDN-2), continuing FEAT-PC001's arrival half. Built red-first across two sessions (branch `idn-2-build` for tasks 01-04, then a fresh branch off `main` for 05). All five migrations applied to the dev DB + repaired. The **schema-review gate was cleared by Stefan on 2026-06-27** — that clearance is what flipped the feature `5-in-cycle` -> `6-done` (`5cdd77b`); PRs #2/#3 merged, #4 followed the delayed full-suite re-confirmation.

**Migrations (five, all additive — FEAT-PC001's migration untouched):**

| Migration | Story | What shipped |
|---|---|---|
| `20260626202215_feat_pc002_mist_explicit_erase.sql` | S2 | `_erase_mist(uuid)` — the SECURITY DEFINER erasure-cascade primitive (REVOKEd from PUBLIC, does not authorize its caller) + `explicit_erase_mist()` — owner-invoked "say goodbye", authorizes by `auth.uid()` + `is_temporary`, rejects non-temporary callers with `42501`. |
| `20260626204102_feat_pc002_mist_ephemerality_reaper.sql` | S1 | `pc2_config` (key/value PC-2 config, RLS deny-by-default; `mist_inactivity_ttl` = **72 hours**, seeded not hardcoded) + `reaper_runs` (DB-side V4 sink) + `reap_expired_mists()` + **`pg_cron` enabled** + the `mist-reaper` job at `*/15 * * * *`. Cadence << TTL, as the sketch required. The accumulation gap closes here. |
| `20260626205412_feat_pc002_consent_substrate.sql` | S5 | `consent_records` (`subject_user_id`, `subject_group_id`, `purpose` **open text**, `policy_version`, `capture_context jsonb`, `captured_at`) + a **single** policy `consent_records_select_own` + the `enforce_consent_append_only()` trigger. |
| `20260626205932_feat_pc002_atomic_transcendence.sql` | S3 (+ S4 half) | `finalise_transcendence(p_policy_version, p_capture_context)` — one transaction: authorize `auth.uid()` + `is_temporary`, flip `is_temporary => false` **in place** (same row, same id), enrol the personal group in "FringeIsland Members", write the transcendence consent record. GRANTed to `authenticated`. |
| `20260627120000_feat_pc002_fim_account_erasure.sql` | S5 crit-4 (+ S4 DoR) | `erase_fim_account(uuid)` — anonymise-then-retain, then delegate teardown to the existing `admin_hard_delete_user` (reused unmodified — no Platform Core change, no ADR-U015 bump). |

**Deviations from the solution sketch** (the sketch was not wrong, but the build resolved it differently in five places):

1. **One erasure primitive, not two paths.** `_erase_mist` is shared by the reaper and explicit-erase. Its cascade **order** mirrors `admin_hard_delete_user`: journeys (FK RESTRICT) -> `auth.users` (CASCADE drops the profile) **before** the proto group — which dodges the `personal_group_id` ON-DELETE-SET-NULL immutability trigger. The order is load-bearing, not incidental.
2. **The race guard is not an in-flight-migration marker.** The rabbit hole proposed excluding rows carrying such a marker. The build instead relies on inactivity (`auth.users.last_sign_in_at`) plus `FOR UPDATE SKIP LOCKED` in the sweep — an actively-transcending Mist is recently active *and* row-locked by the finalisation transaction. Same invariant ("no erase mid-migration"), simpler mechanism, no marker column.
3. **The consent table has no write policies at all.** Not "append-only enforced by RLS/trigger" as sketched, but `SELECT`-own only, with every write arriving through a SECURITY DEFINER path and the trigger refusing UPDATE/DELETE except under the controlled `app.consent_erasure_in_progress` bypass.
4. **FIM account-erasure landed admin-gated, not self-service** (resolves spec question 3 / ADR-U034 §5): `erase_fim_account` requires `manage_all_groups`. Anonymise-first is **structural, not procedural** — the consent FK `ON DELETE RESTRICT` blocks a raw hard-delete (`23503`), so the subject link (`subject_user_id` / `subject_group_id`) must be NULLed first; `purpose` / `policy_version` / `captured_at` / `capture_context` are retained intact as proof. A Hub self-service affordance would route through this same privileged path (named seam, not built).
5. **The reaper<->consent boundary became enforceable rather than merely stated.** `erase_fim_account` refuses `is_temporary = true`; the reaper touches only un-transcended Mists, which hold no consent. The two erasure paths cannot reach the same row by construction.

**Testing honesty (PROCESS §9).** Four new integration suites under `hub/tests/integration/auth/`, all red-first: `mist-reaper.test.ts` (S1 + S2, 4 tests), `mist-transcendence.test.ts` (S3, 4), `mist-consent.test.ts` (S5, 1), `fim-account-erasure.test.ts` (S5 crit-4, **4 at close**; the suite carries 5 today — FEAT-PC012 added the pending-email-invitation assertion on 2026-07-04, closing a PC002 erasure gap). Bridge `01` records 20 auth-integration tests green across 8 suites at that point. New helper: `runAdminSql` in `hub/tests/helpers/supabase.ts` (Management-API admin SQL — backdating `last_sign_in_at`, reading the `cron` schema).

Two **pass-at-red catches** worth keeping: (a) the transcendence **rollback** test first passed at red, because a missing function leaves the same observable state as a real rollback (Mist intact, no consent) — it was strengthened to assert the consent `NOT NULL` violation `23502`, reachable only once the function exists, flips, enrols, then fails on the consent insert; (b) all denial tests assert the specific `42501`, so a missing function's `PGRST202` is a genuine red rather than a vacuous pass. One **labelled characterization (test-after)**: the consent FK `RESTRICT` (`23503`) lock in `fim-account-erasure`, already true from the consent migration.

**Environmental, not a regression:** the integration suite shares one Supabase anonymous-sign-in budget, and rapid re-runs tripped `Request rate limit reached` in the pre-existing Mist suites. `signInAnonWithRetry` (backoff) was added **local to the new test file**; the pre-existing Mist suites still have no retry — latent fragility, not touched then or here.

**Observability (V4) — split sink, by necessity.** The reaper writes `reaper_runs` rows (swept / erased / skipped counts + `success`|`error` + `SQLERRM`) **DB-side**, because pg_cron has no Hub to emit from. Explicit-erase and transcendence emit V4 telemetry **Hub-side** over the existing FEAT-H004 seam — the platform function returns the outcome. `hub/lib/auth/AuthContext.tsx` flipped `reaperRealised: false -> true` (honestly: the reaper is realised, but no test asserts that flag). Transcendence emits the Notifications welcome/onboarding trigger; copy and routing are FEAT-H004's.

**Forward seams — still unbuilt as of this backfill:** the founding-questions assessment and the metamorphosis-completion gate (ball / Beyond unlock), and FIM self-service erasure. The consent substrate's extensibility bet **did** hold: later features built on it without schema change to the purpose column — `FEAT-PC006` consent read (`20260629211504`), `FEAT-PC007` consent decision write (`20260630062757`), and the ADR-U038 sign-up consent boundary (`20260702120100`).

**Unrecorded.** Per-task test counts at the moment each of `TASK-PC002-01..05` closed are not recoverable — the task files were swept per the task lifecycle and the bridges report totals, not per-task splits. The root `CHANGELOG.md` has **no standalone PC002 line**; its shipped record lives inside the FEAT-H004 entry (2026-06-27), which is the house convention for a platform half paired with a product slice, not an omission.

Tasks: `TASK-PC002-01..05` (files swept post-retro per the task lifecycle).

### Post-6-done corrective (2026-08-13) — TASK-TRX-01: the finalisation carries the entered identity

Found on a live walk: a Mist transcending as "Erik Hopper" kept `full_name='Mist'`, `email=NULL`, and a personal group named `'Mist'` — the entered identity lived only in `auth.users` (the Hub's SDK conversion), `handle_new_user` fires at INSERT only, and `finalise_transcendence` never touched the profile columns. The NULL email was the sharp half: email-addressed invitations and `users.email` lookups could never match the member. Migration `20260813204500` carries `display_name`/email into `public.users` (nickname = first token, the house rule) and renames the proto personal group to the nickname (the `handle_new_user` step-2 mirror), inside the same atomic txn; the COALESCE chain keeps the `'Mist'` defaults for a still-anonymous caller, so the substrate-direct path is unchanged for the nameless. A one-shot idempotent backfill repaired the single stranded live row. Red-first cells in `mist-transcendence.test.ts` (TASK-TRX-01 describe, direct PostgREST after a real `updateUser` conversion); the sibling-assertion sweep is enumerated in the migration header. The Hub-half race the same walk surfaced is [TASK-TRX-02](../../../planning/backlog/tasks/TASK-TRX-02-post-transcendence-read-race-poisons-session.md) (FEAT-H004).
