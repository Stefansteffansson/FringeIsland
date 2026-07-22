# Retrospective — the Communication area (A-COM), closed at the gate

**Scale:** area retro (six cycles, C-A..C-F, 2026-07-19 → 2026-07-22 — four days). **Gate:** [2026-07-21-communication-area-gate.md](../hub-v2/2026-07-21-communication-area-gate.md) — **PASS with riders dispositioned** (Stefan, 2026-07-22), carrying forward the standing deep-cold labelled exception plus its never-skip-the-measurement-pass rider.

## What the area shipped

Six paired cycles, all `6-done`, each through its own schema gate with a named approval: **C-A** the conversation model redesign (CB-7 participants junction + data-driven `conversation_kinds`, `direct_messages` → `messages`, eight write-narrowed contracts) ↔ the Messages surface (PD008↔H025); **C-B** the group forum, moderation, and the COM-14 attribution ladder that finally un-seamed MEM-9 — "Former member" rendered rather than promised (PD009↔H026); **C-C** the ADR-U039 live layer, the area's one fresh socket build serving both surfaces — content-free hints on private broadcast channels, ping-then-fetch, verify-on-signal, plus reconnect reconciliation (PD010↔H027); **C-D** announcements with a durable home and routed delivery (ADR-U049), the 15-minute own-edit window, and content reports (PD011↔H028); **C-E** the lifecycle dues and the GDPR export composition — D2 settled as preserve-and-seal, `get_own_messages_export()` folded into the right-of-access export, closing PC008 §155 (PD012, deliberately surface-neutral); **C-F** the identity dues A-JRN parked — self-service pause and the delete ceremony with its farewell, IDN-10 un-parked, `admin_exit_user_from_platform` dropped, and the ADR-U050 four-state lifecycle split by `deactivation_origin` (PC017↔H029, PC005↔H007).

Twelve migrations, two new ADRs (U049, U050), and the DS-5 specification advanced `proposed` → `active` — the first domain-service spec ever to do so.

## What went well

- **The gate protocol earned its keep before the walk even started.** The W12 per-RPC roll-up walked all 30 callable contracts body-against-spec and found a real gap no test could see — `get_own_data_export()`'s EXECUTE grant was live-correct but *unreproducible from source*, a rebuild-from-migrations landmine. The oracle port was made exact rather than assumed: two spine assertions the port had left implicit (inbox ordering, zero-notification-rows) were written as explicit probes at the gate.
- **Red-first held at the contract tier through all six cycles** — 20-red at C-A, 19-red at C-F, every refusal pinned to its exact SQLSTATE so an absent function could never satisfy a refusal test. Green-for-the-right-reason, six times running.
- **Adaptations were labelled, never silent.** Where the v1 oracle didn't fit the CB-7 model, each adaptation is named in the suite header. Where a suite was written test-after (the C-C surface tier), it says so. The area produced no quiet weakening.
- **The performance discipline matured into a standing rule.** Warm all-PASS; three deep-cold windows at full protocol depth; the W3 tail miss recorded as a **FAIL by 66 ms** rather than re-rolled for a pass. Stefan's disposition turned the exception into a rule with teeth: the cold exception never waives the measurement pass, and warm budgets stay fully binding — which is why the group page's 941–993 ms warm hug of the 1.0 s ceiling is carried as live work, explicitly *not* exception-covered.
- **Verify-before-asserting worked in the direction that matters.** A journal-export "finding" was retracted before it landed; the kickoff sweep's substrate-audit staleness flag turned out to be **inverted** — the audit was right and the plan was wrong — and the plan was corrected rather than the audit.

## What to learn (carried forward)

1. **Every walk finding was a seam, not a defect.** Four riders, and not one lived inside a unit of work: RIDER-1 sat between a seed and the rows it should have reached; RIDER-2 between a contract tier and a surface nobody rendered; RIDER-3 between one cycle's carry rule and the next cycle's new write; RIDER-4 between two account states. **Cells get tested; seams get assumed.** The gate's per-RPC roll-up is a cell-level instrument — the walk is currently our only seam-level one, and it found four things in one afternoon.
2. **A permission seed is only half-done at the template.** `has_permission()` resolves through instantiated roles, so a catalog row plus a template grant leaves the permission **dead on arrival for every group that already exists** (160 role instances across 84 groups here). C-D got this right one day later, C-A didn't, and no test could tell because fixtures always create fresh groups. Rule now written into FEAT-PD008: template grant **plus** instantiated-role backfill, in the same migration.
3. **"Covered at the integration tier" is valid for contracts and invalid for affordances.** RIDER-2's leave button had a contract, a route, and a client function — and no rendered button, for weeks, because the coverage split delegated it to a tier that never crosses the surface. Before accepting any such split, ask: *does any tier actually render this?*
4. **A cycle's carry rule outlives its cycle unless someone re-asks.** C-D shipped under "no socket work" and diligently checked that its self-delete rode the existing trigger — then never asked the same question of its *edit* write, which is how RIDER-3 was born. When a cycle carries a deliberate exclusion, the next cycle that adds a write inherits the question, not the answer.
5. **The consume-once adoption cache has now bitten three times** (twice at the 2026-07-10 boot-scope fix, once as RIDER-4). Three instances of one class is a design signal, not a run of bad luck: a cached *promise* captured under one identity-or-account state and consumed under another is the recurring shape. The next occurrence should be met with a structural answer — state-keyed adoption, or invalidation on every state transition — rather than a fourth point fix.
6. **Environment before product, twice more.** A stale dev server produced 37 spurious E2E failures in one session and 2 more at this gate's close — both times the code was healthy and production proved it. The E2E storageState trap fired a **third** time (a fixture's `signOut()` is global scope and revoked the shared session, felling 14 downstream specs). Candidate rules, both now well-evidenced: E2E fleets run against `next start`, never a shared dev server; and fresh-identity specs rather than a shared storageState.
7. **When the user brings evidence, the evidence is canonical.** The Facebook-threading claim was written from recollection, merged, and then disproved by Stefan's own screenshot — a verify-before-asserting failure recorded in the gate record rather than quietly edited away. Comparative claims about other products are exactly where memory feels most reliable and is least checkable; ask for the artifact, or say the claim is from memory.
8. **Three of the walk's ten scenarios were wrong in the script, not the build** — a forum "title" field that PD009 explicitly scopes out, a platform-announcement composer that H028 assigns to A-ADM, and a leave affordance described in the wrong place. All three came from writing the script off capability names instead of verifying each affordance exists. A walk script is a spec artifact: verify it against the specs before handing it to a human.
9. **Task hygiene decayed quietly.** Ten of thirty-four A-COM task files still read `status: todo` for work that shipped and is `6-done` at the spec; the previous area's `TASK-JF-*` files were never swept at its retro; and the tasks README still advertised cycle J-E as "Active tasks" long after those files were deleted. The lifecycle is documented and precedented — the discipline is what lapsed. Swept in this retro (39 files), README rewritten.

## Standing items into Notifications (A-NTF)

- **A-NTF's opening surface is already named by A-COM's own deferrals:** the `account:<auth_uid>:notifications` topic is reserved in PD010's taxonomy and joins the existing conventions unchanged (a synthetic-tenant test already proves the manager needs no edits); announcement live-delivery is H028 §99's named forward home; the `notifications` table's `supabase_realtime` publication membership is A-NTF's disposition (DS-5 §8 Q7 + ADR-U048); **D4 comes due** (MEM-2 email dispatch); **NTF-6** closes against COM-13's report store.
- **Carried seams:** the group page's 12–14-read fan-out (warm 941–993 ms — live work, not exception-covered) · the titleless-forum experience question · [TASK-FORUM-01](../backlog/tasks/TASK-FORUM-01-reply-addressing-and-collapse.md) (reply collapse + addressing; the 2-vs-3-tier depth cap as a recorded open decision, and FEAT-PD009's missing depth rationale to be written either way) · DS-5 §8 **Q6** seamed forward to DS-1 at FEAT time.
- **Standing carries:** TASK-MIST-01 · TASK-DOC-003 · TASK-DOC-004 · **TASK-DOC-005** (new, from this retro's doc health) · TASK-OBS-01 · TASK-E2E-01 · logo · launch checklist · the Vercel Pro scale-to-one decision, now carrying two gates' worth of data.
- **Operational:** the DeusEx walk password (`Walk-2026-DeusEx!`) is a temporary walk credential on a public URL — **rotate before launch**.

## Doc health

Run at this close (2026-07-22) — trigger: area close with 3 migrations, a spec status advance, three feature-spec amendments, and a new backlog task.

```
Sections run:
1.   Terminology drift            — skipped: no renames this area
1.5  Architectural drift          — clean (U039 retired postgres_changes for v2 at C-A; comm tables left the publication by migration, verified live)
1.6  Unfiled deviation markers    — clean (6 grep hits, all the substring "one-directional" in oracle notes — false positives)
2.   Schema drift                 — 3 close migrations checked; 1 finding FIXED IN-PLACE (the RIDER-1 backfill was recorded only in planning docs; FEAT-PD008 now carries the amendment + the generalised seed rule)
3.   Path + README sync           — 1 finding FIXED IN-PLACE (backlog tasks README advertised cycle J-E as "Active tasks"; those files were swept long ago). Gate-record cross-links all resolve
3.5  Archived-tree leak           — skipped: no trees archived this area
3.6  Deleted-file refs            — n/a before the sweep; sweep + README rewrite performed together in this retro's commit
3.7  Snapshot drift               — skipped: no new inventory-restating snapshots
4.   Parked items                 — clean (IDN-10 / PC005 / H007 un-parked at C-F, frontmatter flags removed with them)
5.   Maturity consistency         — 58 specs at 6-done checked; 1 genuine empty Implementation-notes (FEAT-PC002) — already tracked as TASK-DOC-004. Three initial hits (H007, PC005, PC016) were false positives of the line-count heuristic; their notes are substantial single-paragraph blocks
6.   Entity coverage              — clean
7.   Expected placeholders        — registry reviewed, no entries authored or newly introduced
8.   Feature-inventory summary    — clean (all five A-COM Hub features carry §L4 rows; C-B and C-E specs verified 6-done at source)
9.   CLAUDE.md cascade            — clean (one apparent absence, docs/platform/domain/features/, is a spec directory rather than an entity)
10.  Graduation tracker           — skipped: no core ratified, no discovery-sourced ADR this area
11.  Anatomy freshness            — FINDING: stamp reads ADR-U048; U049 (announcements ownership split) and U050 (account-lifecycle states) are both anatomy-relevant and outstanding → TASK-DOC-005 created (backlog per Section 11's severity rule — doc, diagram and stamp move together in one pass)
```

**Critical findings:** none.

**Backlog items created:** TASK-DOC-005 (anatomy refresh through U050).

**Notes for the next check:** the stale-status finding (nine, above) is the one worth watching — the sweep clears the symptom, but status fields drifting mid-cycle means the retro is the only thing standing between a done cycle and a backlog that lies. Section 5's line-count heuristic for Implementation notes needs judgement applied to every hit; a substantial single-paragraph note reads as "1 line" to a naive counter.
