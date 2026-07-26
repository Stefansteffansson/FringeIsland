# Session bridge — A-NTF N-D built and closed; the preference home settled; the area's build is complete

**Date:** 2026-07-26 (session 01) · **Wave:** Ferd · **Area:** A-NTF (Notifications), Cycle **N-D — the last**
**Follows:** [`2026-07-25_02_-_A-NTF-N-C-BUILT-BELL-LIVE-PUBLICATION-EMPTY.md`](./2026-07-25_02_-_A-NTF-N-C-BUILT-BELL-LIVE-PUBLICATION-EMPTY.md)

---

## One-paragraph state

N-D opened, adjudicated, cleared the blocking reds, decomposed and **built end-to-end in one session**. Both halves are `6-done`: **FEAT-PD016** (preferences + the shared suppression dispatcher) and **FEAT-H033** (the matrix surface + the operator nudge console). **A member can now say no, and it is respected however the notification was written.** With N-D closed, **all four A-NTF cycles are built** — what remains for the area is the *gate*, not the build. Four PRs merged (#293 TASK-INT-02 + triage, #294 decomposition, #295 the build at the schema gate on a named nod, #296 the close); `main` at the N-D close; discovery synced 0/0. The suite carries **no known reds anywhere**: integration 690/690, unit 982/982, E2E 89/89.

## The three things asked for, in order

### 1. The preference home — adjudicated on paper before any code

**Ruled: DS-5 owns the preference table *and* the get/set contract. Consent is unmoved.**

The filing described a three-way tension. Verifying each claim at its cited line found a **fourth**: `communication.md` contradicts *itself* — §Entities `:44` claims DS-5 tables while its §L3 dependency column `:126` names PC-2. That is why it survived four cycles: each document was locally coherent.

The reasoning, in force order:

1. **The house had already solved this shape for consent** (ADR-U034 + G-35): "where does it live" is always *two* questions — which tier owns the **table**, and which owns the **member-facing contract**. Read that way the claims stop contradicting and start answering different questions.
2. **But preferences fail the Core bar.** `core/CLAUDE.md:20` requires "cannot be modelled in Domain", not "cleaner in Core".
3. **Decisive:** a preference row must FK `notification_categories(key)` — a DS-5 table. In Core that FK points **Core → Domain**, which `platform/CLAUDE.md:38` forbids with a *named* failure mode: *"creates circular dependencies in SQL functions that PG17 silently miscompiles."* Domain → Core stays legal, so a DS-5-homed table can still consult Core for consent; the reverse cannot.
4. **Every escape is worse.** Drop the FK → re-open the free-text defect N-A cured (V3 `:42` states it in its own words). Duplicate the catalog → drift, whose failure mode is *a muted category sending anyway* — V3 `:55`'s named "preference bypass", graded in trust terms, not legal ones.
5. **Preference is not consent, and both docs already said so.** V3 `:55` calls it "consent-**adjacent**"; G-34 had already ruled preference data "current-state… a different grain from the append-only consent ledger".

**What it costs if wrong** (asked for explicitly): not latency — same Postgres, so anyone arguing this on dispatcher speed is on the wrong axis. It costs (a) a silently-miscompiled dispatcher on the write path of every notification, (b) muted-but-delivered notifications, which V3 calls "a one-way ticket out of the member's trust", (c) a cross-tier migration of member trust decisions to reverse, ~a cycle, and (d) a **Core precedent** the next four settings features would cite — the expensive part. **DS-5 is also the cheaper thing to be wrong about**, since Domain→Core was already the legal direction; that asymmetry is itself an argument.

**A premise correction that mattered.** The completion plan said N-D depends on "IDN-7's preference-persistence pattern". **It does not exist** — IDN-7's realized half is an append-only *consent ledger*; its preference-shaped half is **G-34, unbuilt**. N-D reused IDN-7's **contract idiom**, never its storage. Copying the ledger would have made every read a `DISTINCT ON … ORDER BY created_at DESC` for no benefit.

All four disagreeing lines amended, plus two more found at the doc-health pass (below).

### 2. TASK-INT-02 cleared — both reds stale, **neither user-facing**

| Finding | Verdict | Evidence |
|---|---|---|
| **A** — `create_group_conversations` backfill invariant | **Stale: a scale-dependent test bug** | The invariant **holds — 0 missing of 416**, both templates still granting. The test fed 416 UUIDs into one PostgREST `in.()` (~15.5 KB). Bisected: **n=300 (11.2 KB) → HTTP 200; n=416 → `fetch failed`**, dying in the proxy with no status. supabase-js returned `data: null` and `grants ?? []` **coalesced a transport failure into the empty set**, so every role read as missing. `Received length: 418` — *all* of them — was itself the tell; a real gap hits a subset |
| **B** — no forum hint on a content edit | **Stale: deliberately superseded upstream** | `trg_ds5_emit_forum_edit_hint` exists **by canon** — FEAT-PD010 **RIDER-3** added `forum_post_edited` on 2026-07-22 to fix a live-walk finding. Proved live: a content UPDATE moves the count **exactly +1**. RIDER-3's migration header names only its own guarded test, so this sibling was never adapted |

Fixes: A chunked at 100 ids **and asserts `error` is null** instead of coalescing it (the null-swallow is what let a transport fault masquerade as a permission gap); B **inverted, not loosened** — exactly one `forum_post_edited` per content change, scoped by `event`, plus a WHEN-clause idempotency case that did not exist before.

**The filing's user-facing worry is closed: no member ever lost the affordance.**

**Process finding — the same defect, now three times.** A change to shipped semantics leaving a sibling assertion pinning the old shape: N-B's payload, A-COM RIDER-3's topology. Both were caught only by a *later* area's sweep and both first read as environment faults. **This is no longer a one-off, so the house rule needs a mechanical check, not a norm** — proposed: a migration-template line requiring the author to grep the suite for assertions naming the changed object and list them in the header. Routed to the area retro.

### 3. N-D built — board settled, all eight rows as recommended

| Row | Outcome |
|---|---|
| **ND-1** | DS-5 owns table + contract (above) |
| **ND-2** | **All six categories are `transactional`** — read against V3 §7's "lawfully compelled", NTF-10 would have shipped a page with **every switch disabled**. Suppressibility became its own axis (`member_suppressible`, `account` seeded false). `lawful_basis` untouched: re-labelling a category to unlock a UI toggle would move a legal field for a cosmetic reason |
| **ND-3** | Email **stored, not rendered** (`delivers = false`) — binds when email ships, promises nothing now |
| **ND-4** | Nudge toggle gets a door **and a live cost line** — N-C's 857/1,274 measurement had been sitting in a bridge where the person flipping the switch would never see it |
| **ND-5** | Per-category nudge folded in — gold-plating standalone, near-free riding along |
| **ND-6** | Shared topic **deferred to Eid: the saving is currently zero**, because NC-2 already defaults the platform nudge off. It would optimise a switched-off path while changing the channel taxonomy |
| **ND-7 / ND-8** | MINIMAL confirmed; one migration, held at the gate, merged on a named nod |

**The dispatcher is one `BEFORE INSERT` trigger** on `public.notifications` — the NC-1 precedent applied to the write side, catching all ~38 writers by construction. A suppressed notification is never written, so N-C's `AFTER INSERT` hint trigger never fires either: **suppression costs no realtime message, with no second mechanism.**

**`ds5_may_deliver` fails OPEN — deliberately opposite to N-C's fail-quiet.** N-C's failure mode was *cost*; this one's is a *missed notification*, invisible to the member and leaving no trace, while an unwanted one is visible and recoverable. Stated in the migration so the asymmetry reads as a decision.

## Honest record — six corrections, all mine

1. **A vacuous pass caught by the pair discipline.** The `admin_send_notification` test passed its *muted* half because the RPC was **refused** (service_role, where `is_platform_admin()` is false), not because anything was suppressed. Only the failing "delivers when unmuted" half made the false green visible — N-C's vacuous test wearing a different hat. Fixed with a real DeusEx fixture.
2. **Two id/key-space errors in my own tests.** `target_user_ids` takes `users.id` but `TestUser.user` is the *auth* user (the RPC returned success with count 0); the list contract's payload key is `kind`, not the column name `type`.
3. **A real migration bug.** `RETURNS TABLE` OUT params collide with column references — `ON CONFLICT (category_key, …)` was ambiguous (`42702`). Moved to `RETURNS jsonb` + the `DROP` a return-type change requires.
4. **A payload-walk miss, caught before the migration.** I had asserted preferences inside `get_own_notifications_export()` — a shipped jsonb **array** composed into `get_own_data_export()`. Reshaping it would have broken PC008 and FEAT-H010: **the exact sibling-breakage class I had just finished diagnosing three times.** Preferences got their own additive contract.
5. **Two conformance gates failed on the first sweep, both mine.** The new tables were unclassified, and `functionOwner()` defaults to `CORE`, so the operator contracts read as CORE touching DS-5 — flagged `core-to-domain`. Classification, not defect. `notification_preferences` is classified **DS-5 rather than `vertical:notifications`** deliberately: `dsTables()` filters `/^DS-\d$/`, so a vertical label would have made the table **invisible to that gate**, and keeping Core out is the whole point of ND-1.
6. **The Hub half was test-after, not red-first — a process deviation.** The platform half was demonstrated red (21 of 24 failing pre-apply). FEAT-H033 was implementation-first, and all six panel tests plus the adversarial integration test **passed on their first run**. Surfaced rather than absorbed. Routed to the area retro.

**I also reported a clean-so-far sweep that finished dirty** (2 failures at the end vs "no failures yet" at 4/55), and briefly mis-stated where cycle CHANGELOG entries live (root, not `hub/`). Both corrected in-session.

## What the DoD checklist earned

Three real gaps, none of which I would have found without walking it:

- **The rollback path had no coverage at all** — a refused save must visibly revert *and* say why. The pyramid rule surfaced it; now unit-tested.
- **ADR-U038's direct-caller question was answered in prose.** Prose is not a guard. Now an adversarial test proves a member *and a Mist holding `authenticated`* can write nothing directly.
- **The ADR-U043 deep-cold measurement is OWED**, not done — needs 20+ min enforced idle on a deployed environment.

## Doc health (cycle boundary) — three findings, all fixed in-place

- **The live completion plan still directed preferences to Core** — in three places including a **DoD checkbox**. My own omission: I amended the four canonical docs and forgot the plan agents actually read. Fixed; status advanced to v5.
- **V3 §3 `:46` contradicted V3 §6** — I amended §6 and missed §3 in the same file. Fixed.
- **Section 3.7 trap, live:** the 2026-04 `hub-l3-working-set` snapshot carries banners on its A-IDN tables but **none on its A-NTF table**, whose numbering diverges by *meaning* (snapshot `NTF-8` = preferences; canon `NTF-10`. Snapshot `NTF-2` = actionable; canon `NTF-2` = the bell). Inline banner added.

Sections run: 1.5 · 1.6 (clean) · 2 · 3 · 3.6 (clean — prose mentions only) · 3.7 · **5 (whole-tree: 66 `6-done` specs, all with Implementation notes — clean)** · 8. Skipped: 1, 3.5, 4, 6, 7, 9, 10, 11 (no triggers).

## Backlog triage (PROCESS.md §3) — the third-carry rulings

- **`TASK-DOC-003` → BET, re-scoped by merger into `TASK-DOC-005`** as one architecture-doc pass, named to the A-NTF area close. Separately they lose every prioritisation; together they are one coherent pass over the two docs the root `CLAUDE.md` points agents at. Dropping was rejected: these docs are *agent orientation*, so wrong costs more than missing.
- **`TASK-OBS-01` → BET, because its gate arrived**, not because it aged. It waits on the A-ADM area-open design session, and **A-ADM is next** — N-D was the last cycle of the fifth Phase-3 area.
- **Swept:** `TASK-NA-01..05`, `TASK-NB-01..05` (10 files). `TASK-NC-01..06` + `TASK-ND-01..05` held for the area retro (`TASK-NC-05` still carries the owed measurement). Also fixed the backlog README's stale *"A-NTF has not opened"*.

## Where the next session starts

**The A-NTF area gate.** The build is done; the gate is not. Standing items:

- **Two owed ADR-U043 measurements** — N-C's `/groups` before/after and N-D's new preferences page. Both need a deployed environment and a ≥20-minute idle window.
- **Stefan's live walk** of the area.
- **ADR-U039 is still `Status: Proposed`** after five realizations, and its §31 rationale is void (NB-7 executed). ADR edits are a fuller-auto carve-out — untouched. Recommended: accept, and append a dated amendment rather than rewriting.
- **ADR-U039 Amendment 1** names the shared-topic optimisation; ND-6 deferred it to Eid with the zero-saving rationale recorded.
- U049 §8 Q1 adapter ownership · NB-8 Mist-posture proof · email-deferral recording · DS-5 spec advance · W12 per-RPC verification.
- **The missing N-A / N-B CHANGELOG entries** (root CHANGELOG jumps 07-21 → 07-25). N-C declined to backfill from outside their cycles; still routed here.
- **The area retro**, which should carry: the three-strikes sibling-adaptation defect (with the proposed mechanical check), the Hub-half test-after deviation, and `runAdminSql`'s missing retry against a flaky Management API.

**Then A-ADM (Platform-Ops)** — the sixth and last Phase-3 area, whose area-open design session is where `TASK-OBS-01` finally lands.
