---
name: doc-health-check
description: >
  Runs the periodic health audit across FringeIsland's active documentation tree to catch
  drift before it accumulates. Use this skill whenever someone asks to: run a doc health check,
  audit the docs, check for stale references, verify README indexes, find broken links in docs,
  check for orphaned files, review parked features, look for unfilled Implementation notes,
  verify documentation consistency, check for references to deleted files, find active references
  into archived trees (old_products, old_universe, old_implementation), check for obsoleted
  concepts or retired workflows (Sprint Agent, boot-up ritual, PRD as an artifact, etc.), or
  validate that the active tree is consistent with the latest architectural decisions, or
  verify the CLAUDE.md cascade (entity-CLAUDE coverage, tier-file content categorisation, load-order pointer integrity).
  Also fires automatically at cycle boundaries (part of the cooldown-week ritual, per
  PROCESS.md §3) and on-demand after any cross-cutting change — renames, terminology shifts,
  schema migrations, folder restructures, tree archivings, file deletions, ADR-triggered
  document moves, or CLAUDE.md authoring/restructuring. Produces a summary suitable for
  pasting into the cycle retrospective.
---

# Doc Health Check

This skill performs a periodic audit of the FringeIsland documentation tree to catch drift — stale paths, terminology that moved on, concepts that have been retired, active references into archived trees, references to deleted files, README indexes that no longer match their directories, missing entity docs, unfilled Implementation notes in shipped features, parked items whose reason no longer holds, and broken cross-references.

The skill is the execution layer for the "Continuous learning and quality" goal (B2) as it applies to documentation. PROCESS.md §3 names the cycle boundary as the baseline cadence; this skill runs the checks.

The skill has eleven sections. Four (1.5, 3.5, 3.6, 3.7) exist to catch drift introduced by decisions — concept retirements, tree archivings, file deletions, and stale snapshots of renumbered inventories. One (7) protects architectural scaffolding from being pruned as drift: intentional placeholders (files the design expects to exist but that haven't been authored yet) are registered there so references to them are correctly read as scaffolding rather than broken links. These four sections — 1.5, 3.5, 3.6, and 7 — were the gaps that caused the 2026-04-17 first-invocation miss on root `CLAUDE.md` and the sub-folder `CLAUDE.md` erosion concern.

## When to run

| Trigger | Scope |
|---------|-------|
| **Cycle boundary (baseline)** | Full check — all sections below. Part of the cooldown-week ritual. Findings feed the cycle retrospective. |
| After a cross-cutting terminology change (role, entity, permission, concept) | Section 1 (Terminology drift) |
| **After a decision retires a concept, workflow, or artifact type** | Section 1.5 (Architectural drift) — and also update Section 1.5's table in the same session |
| After a schema migration (table, column, RLS policy, trigger) | Section 2 (Schema drift) |
| **After a build cycle that touched product or substrate code** | Section 1.6 (Unfiled deviation markers) |
| After a folder rename, file move, or doc restructure | Section 3 (Path references + README indexes) |
| **After archiving a tree or major set of files** | Section 3.5 (References into archived trees) |
| **After deleting files** | Section 3.6 (References to deleted files) — and also update Section 3.6's table in the same session |
| **After adding a reference snapshot or session-input that restates a canonical inventory** | Section 3.7 (Snapshot drift) — and feed Section 3.7's registry in the same session |
| After a wave transition or significant scope shift | Section 4 (Parked items) + Section 5 (Maturity consistency) |
| After a feature ships (maturity → `6-done`) | Section 5 (Maturity consistency) applied to just that feature |
| **After scoping a new product/studio/service, or writing a feature spec that references pending structural docs** | Section 7 (Expected placeholders) — and update Section 7's registry in the same session |
| **After a feature is created, advances in maturity, or is deleted** | Section 8 (Feature-inventory summary consistency) |
| **After authoring or restructuring any `CLAUDE.md` file** | Section 9 (CLAUDE.md cascade consistency) |
| **After ratifying a `universe/` core, or adding an ADR sourced from universe-discovery** | Section 10 (Graduation-tracker completeness) — and add the matching tracker row in the same session |
| **After adding or amending any ADR, or moving/renaming files under `docs/architecture/`** | Section 11 (Anatomy freshness) — stamp, retired vocabulary, and current-pointer checks on the living anatomy pair |
| On-demand, any time | Any subset — the skill is cheap to invoke partially |

**Skip a section** when nothing has triggered it since the last run. Don't skip all ten just because the cycle was quiet — a quiet cycle is still worth 15 minutes of checking. **Never skip Section 1.5 or 3.6 after a refactor session** — those are the sections that catch the drift a refactor is most likely to introduce.

## Scope

**In scope (edit targets):**
- All active `.md` files under `docs/` (ecosystem + planning trees)
- Root files: `README.md`, `AGENTS.md`, `CLAUDE.md`, per-tier `CLAUDE.md` files
- Skill files under `.claude/skills/*/SKILL.md`
- Templates under `docs/templates/`
- **Assertion-bearing diagrams (`.svg`)** — their text labels and `<title>`/`<desc>` elements are detection AND edit targets; see the registry below

**Assertion-bearing diagrams (registry — feed it like the Section 1.5 / 3.6 tables; added 2026-06-10):**

| Diagram | What it asserts |
|---------|-----------------|
| `docs/architecture/ECOSYSTEM_ANATOMY_V6.svg` | The entity anatomy: products (equipment profiles), Universe Studio + children, DS-1..DS-7, PC-1..PC-4, verticals |
| `docs/architecture/DOMAIN_SERVICE_DEPENDENCIES.svg` | Domain-service dependency arrows + studio write-paths |
| `docs/ecosystem/how-we-work/assets/01-decomposition-cascade.svg` | The L1-L5 vertical axis + its own gap notes (two open: G-02 sync, G-03 scaffolds; the Whisp L2-placement gap shows as RESOLVED 2026-06-10 per the split-by-face decision in `decisions/PENDING.md`) |

Three rules, learned from the 2026-06-05 Session A sweep initially MISSING the SVGs (caught 2026-06-07):
1. Every Section 1 and 1.5 sweep includes `*.svg` (the grep blocks below do this).
2. Every assertion-bearing SVG carries a current `<title>` + `<desc>` whose prose summarizes its assertions — the single greppable source of truth lives INSIDE the artifact. **No `.md` twin files** (duplicated truth drifts).
3. A new diagram that asserts structure is added to this registry in the same session that creates it.

**Out of scope (don't edit):**
- Anything under `docs/old_universe/`, `docs/old_products/`, `docs/old_implementation/` — these are archived; drift is fine
- Session files under `docs/planning/sessions/` — these are historical records; never rewrite them
- Retrospective files under `docs/planning/retrospectives/` — also historical; only update the current in-flight one if it's not yet committed
- `CHANGELOG.md` — append-only historical record; entries describing deletions / retirements / migrations are correct there, not drift. Also excluded from every detection grep (see below).
- `.claude/skills/doc-health-check/SKILL.md` (this file) — the skill's own Section 1.5 and 3.6 tables contain every keyword and filename being searched for; unfiltered grep would report false positives against the skill's own documentation. Excluded from every detection grep.

**Critical distinction — "out of scope as edit target" is NOT "out of scope as detection target":**

The archived trees should not have their content fixed. But active files **referencing** those archived trees for live workflows are a drift signal and MUST be caught. If `CLAUDE.md` tells agents to load `docs/old_products/ferd/development/BOOT_UP.md` as part of the boot-up ritual, that's a critical finding even though `BOOT_UP.md` lives in the archived tree. The fix is in `CLAUDE.md` (active), not in `BOOT_UP.md` (archived).

The same applies to references to deleted files regardless of path. Grep the full active tree for known-deleted filenames; every hit is a finding, whether the hit is in an archived-tree path reference or anywhere else.

**Sections 3.5 and 3.6 enforce this distinction.** Do not skip them on the grounds that the referenced files are archived.

---

## Section 1 — Terminology drift

**Question:** Have any role names, entity names, permission names, or core concepts been renamed since the last check?

This section catches **renames** (old term → new term). For **obsoleted concepts** (whole workflows or artifact types that Model A / later decisions retired), see Section 1.5.

Common drift patterns to watch for:
- Role renames (e.g., *Group Leader* → *Steward*, *Admin* → *DeusEx*)
- Domain term shifts (e.g., *sprint* → *cycle*, *phase* → *wave*, *product* vs *project*)
- Capitalisation drift (*FIM* vs *fim*, *Hub* vs *hub*)
- Structural concept renames (e.g., Model B → Model A; *PRD* retired in favour of *feature spec*)

### Procedure

1. List the old → new terms for this run.
2. For each pair, grep the active tree for the old term:
   ```
   grep -rniI "<old term>" docs/ .claude/skills/ AGENTS.md CLAUDE.md README.md \
     --include="*.md" --include="*.svg" \
     --exclude-dir=old_universe --exclude-dir=old_products --exclude-dir=old_implementation \
     --exclude-dir=sessions --exclude-dir=retrospectives \
     --exclude=".claude/skills/doc-health-check/SKILL.md" \
     --exclude="CHANGELOG.md"
   ```
   Exclude this file (`SKILL.md`) and `CHANGELOG.md` for the same reasons as Section 1.5 — the skill lists old terms in its examples (drift would be false-positive there), and the CHANGELOG is an append-only record.
3. For each hit, decide: rename in place, or leave as-is (quotations, historical references in explanatory paragraphs, glossary-of-old-terms entries). If in doubt, rename.
4. Verify no code references use the old name (grep `app/`, `components/`, `lib/`, `supabase/`).

**Skip if:** No renames happened since the last check.

---

## Section 1.5 — Architectural drift (obsoleted concepts)

**Question:** Do any active files still describe workflows, artifacts, or rituals that Model A (or a later decision) retired?

This is subtler than Section 1 because there's no "old term → new term" mapping. An obsoleted concept is a whole *thing* that no longer exists in the system — a workflow file, an artifact type, a ritual, a role that's been dissolved. Grep for a surviving keyword, read the surrounding context, and judge whether the reference is describing a current practice (stale) or a historical one (fine).

### Known obsoleted concepts (as of 2026-04-17)

| Concept | What it used to be | Current state | Keyword to grep |
|---------|--------------------|--------------|-----------------|
| **Boot-up / close-down ritual** | Mandatory session-start/end protocol tied to `BOOT_UP.md` + `CLOSE_DOWN.md` | Retired in T1.13; replaced by skills | `BOOT_UP`, `CLOSE_DOWN`, "boot up", "close-down", "boot-up ritual" |
| **Sprint Agent** | Context file describing a stepwise-plan agent for feature work | Retired; replaced by `feature-development` skill | `Sprint Agent`, `sprint-agent.md`, `agents/contexts/` |
| **`SPRINT.md`** | Per-sprint active-work file at repo root | Deleted April 11 2026; cycles replace sprints | `SPRINT.md`, "Sprint file", "update SPRINT" |
| **`PROJECT_STATUS.md`** | Rolling project-state dashboard | Not maintained as a file; state is generated on demand | `PROJECT_STATUS.md` |
| **`PRODUCT_SPEC.md` + `REQUIREMENTS.md`** | Two-file product authoritative spec (pre-Model-A) | Superseded by `DESCRIPTION.md` + `SPECIFICATION.md` under each product | `PRODUCT_SPEC.md`, `REQUIREMENTS.md` |
| **Separate behavior specs** (`docs/specs/behaviors/*.md`) | Standalone files for Given/When/Then behaviors | Stories embedded inline in feature specs under Model A | "behavior spec", "behaviour spec", `specs/behaviors/` |
| **Agent playbooks** (`agents/contexts/`) | Per-agent context files (sprint-agent, close-down agent, etc.) | Replaced by skills under `.claude/skills/` | `agents/contexts/`, "agent playbook" |
| **PRD + separate user story** | Two-file feature artifact (PRD.md + user-story.md) | Retired by DECISION-01; single feature-spec.md with stories embedded | `prd.md`, `prds/`, `user-story.md`, "PRD" as a current artifact type |
| **`backlog/discovery.md`, `backlog/product.md`, `backlog/icebox.md`** | Flat backlog files as the home for maturity 0–4 items | Feature specs in the ecosystem tree are the home; parking is a YAML flag | `discovery.md`, `product.md`, `icebox.md` |
| **Four workflow files** (`BOOT_UP.md`, `CLOSE_DOWN.md`, `DOC_HEALTH_CHECK.md` old, `WORKFLOW.md`) | Standalone workflow markdown files | Deleted 2026-04-17; replaced by skills. The containing directory `docs/planning/workflows/` was also deleted. | See Section 3.6 for the deleted-file check |
| **`docs/planning/workflows/` directory** | Home for operational-playbook markdown files | Deleted 2026-04-17; skills under `.claude/skills/` are the canonical execution-mechanics home (per DECISION-02). Directory no longer exists on disk. | `planning/workflows`, `workflows/` (when referring to the planning subdirectory) |
| **Phase 1/2/3/4 model** | Sequential phase progression for the platform | Superseded by Wave model (Ferd → Eid → … → Urd) | "Phase 1", "Phase 2", "Phase 1.5", "phase timeline" (outside wave context) |
| **The Game as a product** (added 2026-06-10) | Third product entity (Unreal Engine, prefix GM, `docs/products/game/`) | Retired by ADR-U025 — the Game is a depth setting of journeys, not a product; GM prefix retired | "The Game" as a current product, `FEAT-GM`, `products/game` |
| **Device sub-entities** (added 2026-06-10) | `gimbal/ios/` + `gimbal/android/` as cascade sub-entities | Dissolved by ADR-U025 — devices are points in equipment space; native builds are shipping targets of the one Gimbal surface | `gimbal/ios`, `gimbal/android`, "Gimbal-iOS vs Gimbal-Android" as the sub-entity canonical case |
| **Sibling-studios model** (added 2026-06-10) | Journey/Universe/Arc as three sibling studios; Universe Studio excluding Arc; "FringeIsland Studio" as the world-authoring tool | Superseded by ADR-U026 — Universe Studio is the parent/binding frame over World, Arc, Journey Studios | "three studios" as siblings, "FringeIsland Studio", flat `docs/studios/{name}` paths |
| **Three Worlds cosmology** (added 2026-06-10) | Ordinary World / Safe Harbour / The Other Side as the cosmological frame; the "three-dimensional void" | Superseded by the cosmology core (`docs/ecosystem/universe/cosmology/README.md`, ratified Session B): Ordinary World -> Shimmer -> Fringe (place 2 + place 3, near side + Beyond); the Void as the axis of separation | "Three Worlds", "Safe Harbour" (as a world), "The Other Side", "void dimensions" |
| **"Affordance" as the device-capability term** (added 2026-06-10) | The discovery log's term for what features require from devices | Renamed to **equipment** in canon (ADR-U025); plain-English "affordance" (UI affordances) remains fine | `affordance` used as the technical keying term (not ordinary UI prose) |
| **Shadow as the anonymous entrant** (added 2026-06-21) | The pre-signup anonymous identity state was named the **Shadow** (ADR-U027) | Renamed the **Mist** (ADR-U031, discovery S47-48); ADR-U027 superseded by ADR-U031. **"Shadow" reassigned to the place-3 / sleep-paralysis menace** (cosmology core). Two senses now: entrant-sense "Shadow" is drift → Mist; menace-sense "Shadow" (place 3) is correct. **Classify each hit by sense; never blind-replace.** Lifecycle cross-refs also moved ADR-U027 → ADR-U031 | `Shadow` (entrant sense = drift → Mist; place-3-menace sense = correct), and `U027` (lifecycle cross-refs → U031) |
| **Suspended as the only group hold** (added 2026-08-03) | Group lifecycle enumerated `active / closed / archived / suspended`, with `suspended` the single hold state | Retired by FEAT-PC023 (Cycle HYG-A): two-mode holds — **`resting`** (the visible steward-fix hold, `rest_group`-gated) + **`suspended`** (the hard hazard hold); enumerations are `active / resting / suspended / closed / archived`. **Classify by sense: account-`suspended` (ADR-U050, the users axis) is a different axis and is NOT drift** — only group-status enumerations omitting `resting` are | Group-status lists without `resting`; "suspend" as the only group-hold verb in active docs (account-suspension hits are correct as-is) |
| **AI Mentor as a separate companion entity** (added 2026-06-24) | The member's AI companion was modelled in Hub §L3 A-COI as a separate "AI Mentor" distinct from the Whisp | Retired by the F-04 Whisp reconciliation (2026-06-22; ADR-U029, beings core): the **Whisp** IS the AI-driven inner-dialogue companion; "mentoring" is a *function* it performs (warm "tough love" challenge), not a separate entity. **Three legitimate senses survive — never blind-replace:** (a) the function-word ("the Whisp mentors") is fine; (b) CQ-009's *human* 50+ Mentor/Elder role is a different concept; (c) novel/NPC story-mentors are unrelated. Drift = "AI Mentor", or a "Mentor" companion entity distinct from the Whisp | `AI Mentor`, `Mentor` as the companion entity (classify by sense; never blind-replace) |
| **Answering outside the notification surface** (added 2026-07-24) | Two answerable events were answered in bespoke panels: the `PendingNominations` section above `/groups` (stewardship nominations) and the Accept/Decline on `GroupMembershipsPanel` (group-of-groups acting-invitations) | Retired by A-NTF Cycle N-B (FEAT-H031 / ADR-U051): the bell + inbox are the answer home. `PendingNominations` (component, mount, test) is **deleted**; the panel keeps a **read-only** invited status plus a pointer to the notifications. **Classify by sense:** describing the retirement, or the surviving read-only status, is correct; presenting either panel as a current place to *answer* is drift. Note the `/api/me/overview` bundle's `nominations` slice is orphaned-but-live pending its N-C rider | `PendingNominations`, `pending-nominations`, `accept-as-group-`, `decline-as-group-`, "answer on the group page" |
| **Email-as-membership invitation (`invite_by_email`)** (added 2026-07-05) | Off-platform "invite by email" modelled as a pre-committed group membership — a durable `pending_email_invitations` row auto-claimed at sign-up (FEAT-PC012 MEM-2 / FEAT-H015) | Retired going-forward by ADR-U040: off-platform invitation is **referral-to-the-platform** (a FIM-shared link/code; transcendence + consent precede any membership invitation). **The shipped substrate stays live until the MEM-2 referral rebuild** (downstream decomposition, not yet scoped). Drift = presenting email-as-membership as the go-forward model; describing the live substrate as awaiting-rebuild is correct. Name-based FIM invitation is unaffected | `invite_by_email`, "invite by email" (classify by sense: go-forward-model claims = drift; live-substrate-pending-rebuild notes = correct) |
| **Invitations as a mutable `membership` notification** (added 2026-07-28) | `invitation_received`, `acting_invitation` and `stewardship_nomination` sat in the suppressible `membership` / `stewardship` categories, labelled *"Group membership & invitations"* and *"Stewardship & leadership transfer"* — so one switch silenced both news and questions only the recipient could answer | Retired by A-NTF gate board GB-3 (migration `20260727180000`): the three **asks** moved to an `asks` category with `member_suppressible = false` — *a question only you can answer always reaches you*. `membership` and `stewardship` are now news-only and relabelled **"Group & membership updates"** / **"Stewardship updates"**. **Classify by sense:** describing the old grouping historically is fine; instructing someone to mute invitations via the membership switch, or naming either old label as a current UI string, is drift | `Group membership & invitations`, `Stewardship & leadership transfer`, "mute invitations", `invitation_received` described as suppressible |
| **"Mists hold no durable notification rows"** (added 2026-07-28) | Stated as an established structural fact in `FEAT-PD015:59` and in `notify_notification_hint`'s own comment, and used to justify "no Mist realtime" | **Refuted by the NB-8 proof** (2026-07-27): every Mist held a `role_assigned` row from its own personal-group bootstrap, readable / mark-readable / exportable, and a realtime topic *did* resolve for them (a Mist has a `users` row and an `auth_user_id`; only a **group-addressed** row resolves NULL). Made true by construction afterwards by `20260727180000`. **The conclusion is now correct for a different reason — "no row is written", never "no topic resolves".** Drift = repeating the old rationale, or citing structural exclusion as pre-existing rather than enforced | "no topic resolves", "Mists hold no durable", "structurally excludes Mist" |
| **"Always on — these tell you about your own account and access" as the locked-on explanation** (added 2026-07-30) | The one sentence shown beneath **every** non-suppressible notification category on `/notifications/preferences`, written when `account` was the only such category | Board **GB-3** made `asks` the second non-suppressible category (2026-07-28) and it silently inherited the sentence — so *"Questions waiting for your answer"* claimed to be about account and access, which it is not. Retired 2026-07-30: the line is now true of **any** non-suppressible category (*"Always on — this one can't be switched off."*). **The category-specific WHY is owed to the registry**, beside `member_suppressible`, server-authored — a `RETURNS TABLE` change to a live DS-5 contract, recorded not yet built. **Classify by sense:** the sentence quoted in walk findings / changelog as the thing that was wrong is historical and correct; it appearing as **current surface copy**, or any doc asserting that non-suppressible means account-and-access, is drift. **This is the third instance of one pattern** — a sentence written about *the members of a set* becomes false the moment the set grows (W-08 and the `membership` relabel were the first two) | `tell you about your own account and access`, "non-suppressible" described as account-scoped |
| **"Deactivated" as an account state** (added 2026-07-27) | The account lifecycle carried three mechanical states on two booleans; the middle one (off-but-not-closed) was spoken of as *deactivated* and recorded nothing about who switched the account off | Retired by ADR-U050: **four** states — `active`, `paused`, `suspended`, `decommissioned` — split by `deactivation_origin`. A member may return their own `paused` account to active and may never escape a `suspended` one; an off row of unknown origin always reads `suspended`. **Classify by sense — the column name `deactivation_origin` is canonical and is NOT drift**, nor is the verb ("the admin deactivates"); drift is *"deactivated"* used as the name of a **state**. Historical migration comments are left unedited (migrations are never rewritten) | `deactivated` as a state name (exclude `deactivation_origin` before judging) |
| **"A role adopted from a template can never be removed from its group"** (added 2026-08-06) | An adopted `group_roles` row was permanent. `delete_group_role` raised `42501 'template-derived role instances cannot be deleted'`, and `RolesPanel` never rendered the affordance — a Steward who adopted a role by mistake had no way back | Retired by RD-A FEAT-PC027 STORY-4 (migration `20260806170000`): an adopted role is the group's own property and the group may put it down. The refusal that stood is **removed**; the held-by-members `P0001` is inherited unchanged, and a new self-lockout guard refuses removing the group's **only definer** of a protected permission. **Also retired in the same pass: the claim that the refusal was RLS-backed** — HYG-A had already dropped the `group_roles_delete` policy and the DELETE grant (`20260803190000:4533,:4545`), so the contract is the only door and the migration adds no RLS. **Classify by sense:** describing the old permanence historically is correct; asserting that adopted roles cannot be removed, or that an RLS delete rule gates `group_roles`, is drift | `template-derived role instances cannot be deleted`, "adopted role is permanent", `group_roles_delete` as a live policy, "three layers deep" |
| **"Retire is not available — a template can only be deleted"** (added 2026-08-06) | The role-template catalogue had no off-switch: the only way to stop offering a template was to delete it, which `ON DELETE SET NULL` would have turned into a silent mass provenance wipe across every adopted copy | Retired by RD-A FEAT-PC027 STORY-3: `role_templates.retired_at`/`retired_by` plus `admin_retire_role_template` / `admin_unretire_role_template`. Retire flips **offerability only** — it never reaches into a group and never deletes (RD-2/RD-4); system templates are refused. **Classify by sense:** "retire, never delete" is current law; any doc offering central *deletion* of a role template as an available act, or implying a retired template's copies changed, is drift | "delete the role template", "no way to stop offering", retire described as unavailable |
| **"Template-less instantiation copies every role template"** (added 2026-08-06) | `create_engagement_group`'s no-template-chosen path copied **every** row in `role_templates` — so any new row, including an admin's clone, rode every future template-less instantiation. Pinned deliberately as FEAT-PC025 STORY-2 and hardened by the `20260804210000` gate fix | Retired **one day later** by Stefan's WA-6 walk ruling (2026-08-05): template-less instantiation carries the **system templates only**; clones are **pull-only** (a chosen group template's registered set, or `create_group_role` from the picker). Realised by migration `20260805150000`; FEAT-PC025 carries the Amendment, and its as-found statement now carries an inline supersession marker. **Classify by sense:** describing the old behaviour as what the substrate *did* is correct; asserting it as current instantiation physics is drift. `get_role_templates` still lists clones — that half did not change | "every role template", "all role templates", "rides every template-less instantiation", clone-instantiation claims |

### Procedure

1. For each row in the table above, grep the active tree for the keyword(s):
   ```
   grep -rniI "<keyword>" docs/ .claude/skills/ AGENTS.md CLAUDE.md README.md CHANGELOG.md \
     --include="*.md" --include="*.svg" \
     --exclude-dir=sessions --exclude-dir=retrospectives \
     --exclude=".claude/skills/doc-health-check/SKILL.md" \
     --exclude="CHANGELOG.md"
   ```
   Notes:
   - Do **not** exclude `old_*` directories for this check. References to obsoleted concepts inside `old_*` are fine (those trees ARE the historical record), but a mention of *Sprint Agent* in the active `CLAUDE.md` is drift.
   - Exclude this file (`SKILL.md`) from the grep targets — the keyword table above contains every keyword being searched for, so every unfiltered run would find the skill's own documentation and report false positives.
   - Exclude `CHANGELOG.md` as a grep target because it's an append-only historical record; entries like "removed `BOOT_UP.md`" are correct there, not drift.
2. For each hit, read the surrounding context and classify:
   - **Active directive** (file tells agents/humans to do something with this concept now) — **critical finding**. Fix in-place or flag as a backlog item if the fix needs judgement.
   - **Historical narrative** (file describes what used to be the case, typically in a migration note or "updated 2026-04-XX" section) — fine as-is.
   - **Glossary / retrieval helper** (file explains the old term so future contributors understand legacy references) — fine as-is, ideally tagged as such.
3. For any active directive:
   - If the fix is a one-line path replacement or keyword substitution, apply it.
   - If the fix requires rewriting a section (e.g., an entire "Session Management" subsection that depends on retired ritual files), create a backlog item and flag as high priority. Do NOT patch such sections inline — partial rewrites leave internally inconsistent prose.

### Adding to this table

Whenever a decision retires a concept, add a row to the table above in the same session that locks the decision. This is the skill's only defence against its own knowledge going stale — the table must be fed.

**Skip if:** No decisions have retired concepts since the last check AND you're confident the existing table is complete. Default is to run the check; the cost is one grep per row.

---

## Section 1.6 — Unfiled deviation markers (code comments that should be filed deviations)

**Question:** Does the codebase carry `directional` / `not yet realised` (or `for now`, `TODO: spec`) markers that record a real deviation from a spec or ADR but were never filed and triaged per `docs/planning/PROCESS.md` §9?

A code comment is **not** a filed deviation (PROCESS.md §9.2): a `// directional` note satisfies the *letter* of "never silent" while bypassing triage. This is the ADR-U038 failure mode — five features carried "the spec's `/api/v1` + Bearer is directional" across DoD, and the load-bearing question underneath (were those routes even the canonical API surface?) surfaced only by accident, months later.

### Procedure

1. Grep the code tree for deviation markers:
   ```
   grep -rniIE "(^|[^-])directional|not yet realised|not yet realized|TODO: *spec" \
     hub/app hub/lib supabase/ \
     --include="*.ts" --include="*.tsx" --include="*.sql"
   ```
   **The `[^-]` guard is deliberate** (added 2026-08-06): the unguarded pattern matched **`one-directional`** seven times — the Oracle B-JRN-003 dual-enrolment comments carried across five migrations — and would have returned the same seven false positives at every future run. A check that always reports the same benign hits trains its reader to skip it.
2. For each hit, read the surrounding context and classify:
   - **Filed** — a matching, triaged deviation exists in the owning feature spec's notes or a task (tagged local / upstream-bearing / open-question). Fine.
   - **Unfiled** — the comment is the *only* record of the deviation. **Finding.** Either file it now (spec notes or task, with a triage tag), or — if the underlying question has since been resolved — update the comment to cite the resolving ADR/spec and drop the marker word.
3. A marker whose underlying tension is load-bearing (e.g. "is this even the canonical surface?") is a **critical finding**, not a cleanup.

**Skip if:** No product or substrate code changed since the last check.

---

## Section 2 — Schema drift

**Question:** Were any tables added/dropped, columns changed, RLS policies modified, or migrations applied since the last check?

### Procedure

1. List the schema changes from the migrations applied this cycle (look in `supabase/migrations/` for new files).
2. For each change, verify the following docs describe it correctly:
   - `docs/platform/core/SPECIFICATION.md` (once it exists — see T3.3 in the 2026-04-17 session notes)
   - `docs/platform/domain/{service}.md` for any domain-service surface
   - The feature spec(s) whose stories introduced the change (look for `FEAT-*.md` files referencing the migration)
3. If a migration dropped something, grep for references to the dropped artifact and either remove them or update them.
4. If a new table was added without RLS, that's a DoD failure — flag it as a backlog item, don't try to fix it in the doc pass.

**Skip if:** No schema changes happened since the last check.

---

## Section 3 — Path references + README indexes

**Question:** Have any files been moved, renamed, or added? Do README directory listings match what's actually on disk?

### Procedure — stale paths

1. Build the mapping of moves/renames since last check (from commit history or session notes).
2. For each old path, grep the active tree for that path substring.
3. Fix every hit that isn't in `sessions/`, `retrospectives/`, or the `old_*` trees.

### Procedure — README index synchronisation

README files at these locations are expected to list their directory contents (or a curated subset) accurately:

| README | Expected to reflect |
|--------|---------------------|
| `docs/README.md` | Top-level ecosystem + planning map |
| `docs/ecosystem/README.md` | Files directly under `ecosystem/` |
| `docs/products/README.md` | All product subdirectories + their status |
| `docs/products/{name}/README.md` | Files and subdirectories under that product |
| `docs/platform/README.md` | Core + domain structure |
| `docs/platform/core/README.md` | Core tier contents |
| `docs/platform/domain/README.md` | Domain service files |
| `docs/studios/README.md` | All studio subdirectories |
| `docs/studios/{name}/README.md` | Files under that studio |
| `docs/design-system/README.md` | Design system contents |
| `docs/verticals/README.md` | Vertical spec files |
| `docs/architecture/README.md` | Architecture docs + decisions/ |
| `docs/templates/README.md` | All templates with use-when descriptions |
| `docs/planning/README.md` | Planning tree structure |
| `docs/planning/waves/README.md` (if present) | Wave files + status |
| `docs/planning/retrospectives/README.md` | Retro scales + naming conventions |
| `docs/planning/reference/README.md` | Reference snapshots |
| `docs/planning/backlog/README.md` | Task lifecycle guidance |
| Per-`features/` README | Feature specs in that owner's directory |

For each README in this list:
1. Compare its listed contents against a direct directory listing.
2. Any file present on disk but not in the README: add it.
3. Any file in the README but not on disk: remove the reference.
4. Check one-line descriptions are still accurate.

### Procedure — broken cross-references

1. Scan the active tree for markdown link targets that don't resolve:
   - **Relative links to `.md` files** — verify the target file exists at the cited path. ADR citations, skill citations, sibling-spec citations, and template citations are particularly prone to this failure mode: filenames drift over time and authors often cite a filename inferred from the file's *description* rather than verified from a directory listing.
   - **Links to sections** (`#anchor`) — verify the heading still exists in the target file.
   - **Links to skill files** — verify `.claude/skills/{name}/SKILL.md` exists.
   - **Links to anatomy diagrams or other binary architecture artifacts** — verify the file exists at the cited path.
2. Cross-check expected-placeholder targets against Section 7's registry. A relative link to a registry entry is scaffolding, not a broken cross-reference — record under "Placeholders confirmed scaffolding," not under critical findings.
3. For each genuinely broken link, fix the target or remove the link. When fixing, **verify the corrected filename against a directory listing** — do not infer it from another stale citation.
4. **Watch for citation-by-inference patterns.** When the same wrong filename appears in multiple files, the failure mode was usually "author A cited the filename from memory; authors B, C, D copied A's citation without verifying." Surface multi-hit broken-link clusters as a finding worth its own line in the output — they suggest a citation discipline gap, not just an isolated drift.

**Skip if:** No files moved, no READMEs touched, and no new features/docs added.

---

## Section 3.5 — References into archived trees (active → archived leak)

**Question:** Do any active files point at `docs/old_universe/`, `docs/old_products/`, or `docs/old_implementation/` for live workflows?

This is the complement of Section 3. Section 3 checks that active paths resolve. Section 3.5 checks that active files **aren't depending on archived paths for current work**. The two are different failure modes: Section 3 catches "I moved a file and forgot to update its referrers"; Section 3.5 catches "I archived a whole tree but some active files still treat it as current."

An active file referencing an archived path is only a problem when the reference is **directive** — i.e., the active file is telling agents or humans to load, follow, update, or treat-as-authoritative something in the archived tree. Historical notes ("this used to live in `old_products/` before the April 12 migration") are fine.

### Procedure

1. Grep the active tree for any `old_*/` path reference:
   ```
   grep -rnI "old_universe/\|old_products/\|old_implementation/" \
     docs/ .claude/skills/ AGENTS.md CLAUDE.md README.md \
     --include="*.md" \
     --exclude-dir=old_universe --exclude-dir=old_products --exclude-dir=old_implementation \
     --exclude-dir=sessions --exclude-dir=retrospectives \
     --exclude="CHANGELOG.md"
   ```
   Exclude `CHANGELOG.md` because it's an append-only historical record; migration notes describing the `old_*/` tree move are correct there, not drift.
2. For each hit, read the surrounding context and classify:
   - **Directive reference** ("load `docs/old_products/.../X.md`", "update `docs/old_implementation/shared/Y.md`", table row listing the path as authoritative) — **critical finding**.
   - **Historical reference** ("previously lived in `old_products/`", "migrated from `old_universe/` on April 12") — fine.
   - **Comparison reference** ("unlike the old_implementation approach, we now…") — fine.
3. For directive references:
   - If the replacement is obvious and local (e.g., a single link needs repointing to the new tree), fix in-place.
   - If the replacement requires rewriting a section (the original `docs/old_products/X.md` no longer exists, or its replacement is a skill rather than a file, or the whole workflow being described has been retired) — flag as a backlog item. Do NOT fix inline; the fix requires judgement about the current Model A equivalent and may require coordinating with Section 1.5 findings.

### Why this check exists

The skill's path-exclusion logic was originally designed to prevent edits to archived content. That was correct. But it accidentally excluded active files from having their `old_*/` references detected, because the grep invocation in Section 3 was typically written with `--exclude-dir=old_*`, which excludes both the archived files *and* any active file whose line of interest matches the pattern. This section fixes that by scanning active files **for** `old_*/` path substrings — the opposite direction.

**Skip if:** No archived trees exist (rare), or a prior run confirmed zero directive references and nothing has changed since.

---

## Section 3.6 — References to deleted files

**Question:** Do any active files reference files that have been deleted from the tree?

This is different from Section 3 (README sync) because it doesn't require knowing the delete-log up front. It's a positive check: maintain a small list of **known deleted filenames** (with the sessions in which they were deleted), and grep the active tree for each one.

### Known deleted files (as of 2026-04-17)

| Filename | Deleted in | Original location | Replacement |
|----------|-----------|-------------------|-------------|
| `BOOT_UP.md` | T1.13 (2026-04-17) | `docs/planning/workflows/` (directory also deleted) | Skills (no direct replacement; boot-up ritual retired) |
| `CLOSE_DOWN.md` | T1.13 (2026-04-17) | `docs/planning/workflows/` (directory also deleted) | Skills + cycle-boundary checklist in PROCESS.md §3 |
| `DOC_HEALTH_CHECK.md` (old) | T1.13 (2026-04-17) | `docs/planning/workflows/` (directory also deleted) | `.claude/skills/doc-health-check/SKILL.md` (this file) |
| `WORKFLOW.md` | T1.13 (2026-04-17) | `docs/planning/workflows/` (directory also deleted) | `feature-development` + `ecosystem-decomposition` skills |
| `user-story.md` | T1.9 (2026-04-17) | `docs/templates/` | Stories embedded inline in `feature-spec.md` |
| `SPRINT.md` | April 11 2026 | Repo root | Cycles (PROCESS.md §3); per-cycle content in `docs/planning/cycles/cycle-current.md` |
| `ROADMAP.md` (old, repo-root or old_products tree) | April 11 2026 | Repo root + `docs/old_products/ferd/planning/` | Product-specific `ROADMAP.md` files under `docs/products/{name}/` (when written) + ecosystem roadmap (when written) |
| `sprint-agent.md` | Retired with agent-playbook model | `docs/old_products/ferd/development/agents/contexts/` | `feature-development` skill |
| `docs/products/game/README.md` + `CLAUDE.md` + `features/README.md` | Session B G-2 (2026-06-10, commit 50a5dae) | `docs/products/game/` (directory deleted) | ADR-U025 + `PRODUCTS_AND_PLATFORM.md` carry the Game-as-depth lock and revisit trigger |
| `docs/products/gimbal/ios/README.md` + `docs/products/gimbal/android/README.md` | Session B G-2 (2026-06-10, commit 50a5dae) | `docs/products/gimbal/{ios,android}/` (directories deleted) | `docs/products/gimbal/` (the one senses surface; native iOS/Android are shipping targets, ADR-U025) |
| `docs/planning/hub-v2/2026-07-27-cold-load-investigation-brief.md` | 2026-07-27 (commit b021879, PR #309) | `docs/planning/hub-v2/` | None — the cold-load question was closed (accepted for demo); the measurements it fed live in `2026-07-27-antf-gate-measurements.md` |

**Ephemeral `TASK-*.md` files are out of scope for this table.** They are deleted by design at each area retro (the task lifecycle in `docs/planning/backlog/tasks/README.md`), in batches of thirty-plus, and the sweep line in that README is their record. Adding a row per swept task would bloat the table without adding signal — the sweeps deliberately leave only prose mentions, never markdown links. Verified 2026-07-27: the `TASK-NA-*` / `TASK-NB-*` / `TASK-C*` sweeps left zero broken links.

### Procedure

1. For each row in the table above, grep the **full active tree** for the filename:
   ```
   grep -rnI "<filename>" docs/ .claude/skills/ AGENTS.md CLAUDE.md README.md \
     --include="*.md" \
     --exclude-dir=old_universe --exclude-dir=old_products --exclude-dir=old_implementation \
     --exclude-dir=sessions --exclude-dir=retrospectives \
     --exclude=".claude/skills/doc-health-check/SKILL.md" \
     --exclude="CHANGELOG.md"
   ```
   Notes:
   - Unlike Section 3.5, this check DOES exclude `old_*` — references to deleted files inside the archived trees are expected (the archive is a frozen record of the pre-deletion state). The goal here is to catch references in active files.
   - Exclude this file (`SKILL.md`) from the grep targets — the table above names every filename being searched for, so an unfiltered run would always find the skill's own documentation and report false positives.
   - Exclude `CHANGELOG.md` as a grep target because it's an append-only historical record; entries like "removed `BOOT_UP.md`" are correct there, not drift.
2. For each hit, classify:
   - **Directive reference** (link, "load X", "update X", table row presenting X as authoritative) — **critical finding**. Fix or flag.
   - **Historical / migration note** ("X was deleted in T1.13 and replaced by Y") — fine.
3. For directive references, apply the "Replacement" column as the fix target where possible. Where the replacement is "no direct replacement" (e.g., boot-up ritual), the fix is to remove or rewrite the surrounding section, not to repoint the link. Flag as a backlog item.
4. **Cross-check the deleted-files table with actual disk state**: for each filename in the table, confirm via direct listing that the file is indeed absent from its original location (per AGENTS.md cross-check rule). If a file reappears, remove its row from the table.

### Adding to this table

Whenever a file is deleted, add a row to the table above in the same session that performs the deletion. This is the skill's only defence against its own knowledge going stale — the table must be fed, just like Section 1.5's.

**Skip if:** No files were deleted since the last check AND you're confident the existing table is complete.

---

## Section 3.7 — Restated canonical inventories in non-canonical files (snapshot drift)

**Question:** Do any non-canonical files (reference snapshots, session-input drafts) restate a canonical inventory — capability IDs (`IDN-N`, `GRP-N`, …), the ADR index, the wave list — with content that diverges from the canonical source, and without a "superseded / not-canonical" banner pointing at it?

This is the complement of Sections 5 and 8, which check that *canonical* docs are internally consistent. Section 3.7 checks the other direction: that a *non-canonical* doc restating a canonical inventory cannot be mistaken for current. A draft that was an honest input at authoring time becomes a trap once the canonical inventory is renumbered — a reader, or a fact-finding sub-agent, that lands mid-file sees an authoritative-looking table and never reaches the header disclaimer.

### Why this check exists

(Added 2026-06-28.) A research sub-agent asked to compile the remaining A-IDN capabilities reported the **2026-04 `hub-l3-working-set` draft's IDN-1..14** as if current, instead of the canonical **IDN-1..12** in `docs/products/hub/SPECIFICATION.md` §L3 (the L3 author had renumbered in the fresh derivation). The draft self-discloses non-authority *in its header*, but its IDN tables carried no inline banner, so the agent blended the stale numbering and nearly seeded a wrong multi-cycle build plan. The orchestration fix (name one canonical source; canonical-wins; cite file:line; flag self-declared non-authoritative sources) lives with whoever dispatches the agent; this section is the doc-side guardrail that stops the trap from forming.

### The canonical-inventory registry

| Inventory | Canonical home | Restated in (non-canonical) |
|-----------|----------------|------------------------------|
| Hub capability inventory (A-IDN / A-GRP / A-* `*-N` IDs) | `docs/products/hub/SPECIFICATION.md` §L3 | `docs/planning/reference/2026-04_hub-l3-working-set/hub-l3-input.md` (banner'd 2026-06-28); `docs/planning/sessions/2026-04-27_02_-_HUB-L3-INSPIRATIONAL-INPUT.md` (banner'd 2026-06-28) |
| Platform capability inventories (PC-*, DS-* IDs) | the relevant `docs/platform/**/*-specification.md` §L3 | (none known) |
| ADR index | `docs/architecture/decisions/` (the files themselves) | any "ADR list" table under planning/reference |

### Procedure

1. Enumerate non-canonical files that restate an inventory:
   ```
   grep -rlnE "^\|\s*(IDN|GRP|JRN|COM|NTF|COI|DIS|ADM|PC|DS)-[0-9]+" \
     docs/planning/reference/ docs/planning/sessions/ --include="*.md"
   ```
2. For each file restating an inventory in the registry:
   - Confirm it carries a **"SUPERSEDED / NOT canonical → <canonical home>"** banner both at the top AND adjacent to each restated table. A header-only banner is insufficient — a mid-file landing misses it (that was the 2026-06-28 failure).
   - Spot-check divergence: does the restated max-ID / row-count differ from canonical? If yes and there's no inline banner, it's an **active trap → critical finding**.
3. Fix: add the inline banner above each unbannered restated table, pointing at the canonical home. Do **not** rewrite the historical table — annotate it. For session files (historical records, normally never edited), the inline banner is the one permitted annotation ("Historical record — table left intact").
4. Feed the registry: when a new reference snapshot or session-input restates a canonical inventory, add a row in the same session.

**Skip if:** No new reference snapshots or session-input drafts that restate a canonical inventory have been added since the last check, AND the registry's known files are all banner'd.

---

## Section 4 — Parked items review

**Question:** Do parked features still have a valid `parked_reason`? Is anything parked that should be un-parked?

Under Model A (see PROCESS.md §1), the icebox is a YAML flag, not a separate file.

### Procedure

1. Grep the active tree for `parked: true`:
   ```
   grep -rlI "^parked: true" docs/products/ docs/platform/ docs/studios/ docs/design-system/ docs/verticals/ --include="*.md"
   ```
2. For each parked feature, open the spec and read its `parked_reason`.
3. Decide one of:
   - **Still parked, same reason** — leave untouched.
   - **Still parked, reason has evolved** — update `parked_reason` to reflect current thinking.
   - **Un-park** — remove both `parked: true` and `parked_reason` from frontmatter. Note in the cycle retro why.
   - **Drop the spec entirely** — if the feature is no longer relevant at all and will never return, delete the file. This is rare; prefer un-park-and-reduce-scope over deletion.
4. Flag any parked feature with missing `parked_reason` — that's a hard rule violation (DECISION-11 requires both fields together).

**Skip if:** No parked items exist in the tree.

---

## Section 4.5 — Ownership-manifest gate-review flags (COR-C W7, Audit III GC-11)

**Question:** Does `supabase/ownership.manifest.json` carry any note self-flagging an unresolved classification tension — and has each been surfaced at an area gate rather than silently carried?

Precedent: the R-4 tension (`notification_kinds`/`notification_categories` vertical-vs-DS-5) sat as a "Gate-review flag:" note through one full area gate without being raised; Audit III had to find it. Flags are a legitimate carrying mechanism — this row makes sure they are *read*.

### Procedure

1. Grep the manifest for flag notes:
   ```
   grep -n "Gate-review flag" supabase/ownership.manifest.json
   ```
2. For each hit, record it in the health-check summary under "Open gate-review flags", with the table/function it sits on.
3. At the next area gate (or cycle boundary, whichever first), each listed flag gets a disposition: resolved by ruling, or explicitly re-carried with the reason noted on the flag itself.

**Skip if:** the grep returns nothing (the R-4 relabel of 2026-07-31 cleared the set; a clean run is expected until someone flags a new tension).

---

## Section 5 — Maturity consistency

**Question:** Does each feature spec's internal state match its declared YAML `maturity:`?

Under Model A, maturity is a declaration. This section verifies the declaration matches reality.

### Procedure

For each feature spec (grep `docs/**/features/FEAT-*.md`):

1. **`maturity: 0-raw` or `1-concept`** — expect: minimal content, possibly just a one-sentence Problem section. No stories required. No check needed beyond "does the frontmatter exist."

2. **`maturity: 2-explored`** — expect: Problem filled in, Solution sketch present (forward-looking specs), risks or rabbit holes noted. Verify: Solution sketch section is not empty.

3. **`maturity: 3-specified`** — expect: Stories with Given/When/Then acceptance criteria. Verify: at least one Story section with acceptance criteria bullets. No unchecked placeholder text (`{role}`, `{capability}`, `{benefit}`).

4. **`maturity: 4-ready`** — expect: all of 3-specified, plus DoR compliance (PROCESS.md §4). Verify: no open questions marked in the spec, stories are concrete.

5. **`maturity: 5-in-cycle`** — expect: corresponding tasks exist in `docs/planning/backlog/tasks/TASK-*.md` with `feature: FEAT-{id}` in their frontmatter. Verify: at least one task file references this feature.

6. **`maturity: 6-done`** — expect: Implementation notes section is filled in; Solution sketch / Appetite / Rabbit holes may be omitted per the template's retroactive mode. Verify: Implementation notes section exists and is non-empty. Flag as a critical drift item if a `6-done` spec has an **absent or empty** Implementation notes section.

   **This check runs against every `6-done` spec in the tree on every run — never only the specs that changed in-cycle** (see the amended skip clause below). It is one command, so there is no cost argument for narrowing it:

   ```bash
   for f in $(grep -rl '^maturity: 6-done' docs/*/*/features/FEAT-*.md docs/*/*/*/features/FEAT-*.md); do
     grep -q '^## Implementation notes' "$f" || echo "ABSENT:  $f"
   done
   ```

   **The prefix match is deliberate — do not "tighten" it with a `$` anchor.** Many specs suffix the heading (`## Implementation notes (6-done — Cycle C-F, 2026-07-21)`, tranche labels, dates); at the 2026-08-03 HYG-A run a `$`-anchored variant falsely reported 53 of 77 specs as ABSENT (35 distinct suffixed heading forms). Anchor the start, never the end.

   Absent and empty are the same finding class in different shapes: `ABSENT` means the heading is missing entirely (the spec ends at an earlier section), `EMPTY` means the heading exists with no prose under it. Check both — the grep above finds the first; eyeball each heading's body for the second.

   **Why this is carved out of the skip clause:** an unchanged `6-done` spec is exactly the case that hides this defect. The notes were owed at close; if they were never written, nothing will ever change the spec again to pull it back into a narrowed scan. FEAT-PC002 sat undetected from 2026-06-27 to 2026-07-18 for precisely this reason, and the whole-tree sweep was not actually run until 2026-07-25 (62 specs, one hit).

### Also verify

- `owner:` field is set and points at a valid owner in the ecosystem tree
- `consumers:` field is a list (possibly empty) with only products/studios listed (not platform services)
- `wave:` field names one of the six waves
- `maturity:` value is one of the seven canonical values (`0-raw` through `6-done`)

**Skip if:** No new feature specs written and no specs advanced maturity since last check — **except step 6, which always runs.** The `6-done`-without-notes sweep is whole-tree and unconditional; a spec that has not changed since it closed is the case this skip clause would otherwise hide forever.

---

## Section 6 — Entity coverage

**Question:** Does every active entity have the docs it's expected to have?

| If an entity is... | It needs... |
|--------------------|-------------|
| A product with a `DESCRIPTION.md` | That description should still accurately describe the product's identity |
| A product in active development (has a `features/` directory with content) | `SPECIFICATION.md` + `ROADMAP.md` (per `ecosystem-decomposition` skill Level 2) |
| A domain service with a `{name}.md` under `docs/platform/domain/` | That spec should describe its current surface |
| A studio with a `DESCRIPTION.md` | That description should describe its scope + lifecycle |
| A vertical with a spec under `docs/verticals/` | That spec should list all features tagged with it |

### Procedure

1. Walk `docs/products/`, `docs/studios/`, `docs/platform/domain/`, `docs/verticals/`.
2. For each subdirectory, check for the expected files.
3. Missing file + entity is pre-scope (no `features/` content, no active work): acceptable, note in the summary as "{name}: pre-scope, no DESCRIPTION.md — fine for now."
4. Missing file + entity is active (has feature specs, has work in flight): flag as a gap, add a task to the next cycle.

**Skip if:** No entities changed status (no new products scoped, no studios activated) since last check.

---

## Section 7 — Expected placeholders

**Question:** Do any active files reference structural documents that are architecturally expected but not yet authored — and if so, are those references being correctly treated as scaffolding rather than drift?

The FringeIsland architecture has intentional placeholders: files the design expects to exist eventually, but that haven't been written yet. Examples: `docs/ecosystem/ECOSYSTEM_ROADMAP.md` (deferred as T3.5), `docs/platform/DEPENDENCIES.md` (deferred as T4.1), per-product `SPECIFICATION.md` and `ROADMAP.md` files for products not yet in active development. References to these files in active docs (feature specs, tier-level `CLAUDE.md` files, PROCESS.md, templates) are **scaffolding, not drift** — they describe the designed structure and point future contributors at where content will land.

Without this section, Sections 3, 3.6, and 6 would flag placeholder references as broken links, missing files, or entity-coverage gaps. That would start an erosion loop: each sweep would prune more architectural scaffolding, and the designed structure would silently degrade with every run.

This section is the explicit protection.

### The expected-placeholders registry

| Path | Purpose | Why it's expected | Pending-since |
|------|---------|-------------------|---------------|
| `docs/ecosystem/ECOSYSTEM_ROADMAP.md` | Ecosystem-level NOW/NEXT/LATER roadmap | Referenced by `wave-planning` skill, `product-roadmap.md` template, `wave-spec.md` template, PROCESS.md §3 cycle-boundary checklist, PROCESS.md §6 trigger table | T3.5 (deferred at 2026-04-17 WoW review) |
| `docs/platform/DEPENDENCIES.md` | Cross-service dependency table | Referenced by `docs/platform/README.md`, `docs/platform/CLAUDE.md` Where-to-go-next | T4.1 (deferred at 2026-04-17 WoW review) |
| `docs/products/hub/ROADMAP.md` | Hub NOW/NEXT/LATER | Referenced by `products/hub/DESCRIPTION.md`, `products/hub/README.md` | T3.4 (deferred at 2026-04-17 WoW review) |
| `docs/products/gimbal/DESCRIPTION.md` | Gimbal product identity | Expected per `products/gimbal/README.md`; product is planned, not yet scoped | Pending — wave Eid+ |
| `docs/products/gimbal/SPECIFICATION.md` | Gimbal build spec | Expected per product-tier pattern | Pending — wave Eid+ |
| `docs/products/gimbal/ROADMAP.md` | Gimbal roadmap | Expected per product-tier pattern | Pending — wave Eid+ |
| `docs/platform/core/SPECIFICATION.md` | Platform Core technical spec | Referenced by PROCESS.md §5 DoD ("Platform Specification updates for shared API surface changes") | Pending |
| `docs/platform/core/ROADMAP.md` | Platform Core roadmap | Expected per platform-tier pattern | Pending |
| `docs/platform/core/infrastructure/CLAUDE.md` | PC-1 Infrastructure entity-level CLAUDE.md | Referenced by `docs/platform/core/CLAUDE.md` Where-to-go-next four-areas pointer | Pending — when area-specific rules warrant a delta |
| `docs/platform/core/identity/CLAUDE.md` | PC-2 Identity entity-level CLAUDE.md | Referenced by `docs/platform/core/CLAUDE.md` Where-to-go-next four-areas pointer | Pending — when area-specific rules warrant a delta |
| `docs/studios/universe-studio/DESCRIPTION.md` | Universe Studio (parent) identity | Expected per `studios/universe-studio/README.md`; parent entity per ADR-U026 | Pending — wave Eid+ |
| `docs/studios/universe-studio/SPECIFICATION.md` | Universe Studio (parent) build spec | Expected per studio-tier pattern | Pending — wave Eid+ |
| `docs/studios/universe-studio/world-studio/DESCRIPTION.md` | World Studio identity | Entity created 2026-06-10 (ADR-U026); README exists, DESCRIPTION pending | Pending — wave Heim+ |
| `docs/studios/universe-studio/world-studio/SPECIFICATION.md` | World Studio build spec | Expected per studio-tier pattern | Pending — wave Heim+ |
| `docs/studios/universe-studio/journey-studio/DESCRIPTION.md` | Journey Studio identity | Expected per its README ("to be written"); path nested per ADR-U026 | Pending — wave Eid+ |
| `docs/studios/universe-studio/journey-studio/SPECIFICATION.md` | Journey Studio build spec | Expected per its README ("to be written") | Pending — wave Eid+ |
| `docs/studios/universe-studio/arc-studio/DESCRIPTION.md` | Arc Studio identity | Expected per its README ("to be written"); path nested per ADR-U026 | Pending — wave Urd |
| `docs/studios/universe-studio/arc-studio/SPECIFICATION.md` | Arc Studio build spec | Expected per its README ("to be written") | Pending — wave Urd |

### Procedure

1. **Before flagging a missing-file finding in Sections 3, 3.6, or 6, cross-check the registry above.** If the missing file is listed here, the reference is scaffolding — do not flag. Record in the output summary under "Placeholders confirmed scaffolding" rather than under "Critical findings."
2. **When a registry entry is authored** (someone finally writes `ECOSYSTEM_ROADMAP.md`, for example), remove its row from the registry in the same commit that adds the file. A stale registry entry pointing at a file that now exists is its own kind of drift.
3. **When a new architectural placeholder is introduced** (a decision locks a new expected structural doc), add a row to the registry in the same session that locks the decision. Same discipline as Sections 1.5 and 3.6 — the registry's value depends on it being fed.
4. **The registry is for structural placeholders, not wishlists.** A file belongs here only if (a) it has a defined purpose, (b) it is referenced by at least one active doc, and (c) its eventual authoring is committed (locked decision, roadmap entry, or session record). Speculative files that someone might write someday do not belong here — they bloat the registry and dilute its signal.
5. **Review the registry at wave boundaries.** At each wave transition (PROCESS.md §3), walk the registry and confirm each pending item still reflects current plans. Items whose purpose has evaporated (the capability was scoped out, the dependency was absorbed elsewhere) are removed. Items whose authoring should happen imminently get promoted to backlog items.

### How Sections 3, 3.6, and 6 use this registry

- **Section 3 (path + README sync)** — when a markdown link points at a registry entry, the "target exists" check passes. The link is valid scaffolding. Record it as such.
- **Section 3.6 (references to deleted files)** — before adding a filename to the deleted-file table, confirm it is not a registry entry. An expected placeholder that has never existed is not a deleted file.
- **Section 6 (entity coverage)** — missing `DESCRIPTION.md` / `SPECIFICATION.md` / `ROADMAP.md` for an entity whose files are in the registry is **not** a gap flagged as critical. It is a pending item, reported in the entity-coverage summary line as "pending (registry)" rather than "gap."
- **Section 8 (feature-inventory summary consistency)** — if an entity's `SPECIFICATION.md` is in the registry (not yet authored), Section 8's consistency check does not run for that entity. The feature-inventory summary cannot drift from its parent file if the parent file does not yet exist. Report as "pending (registry)" in the Section 8 summary line.

**Skip if:** No new architectural placeholders have been introduced, no registry entries have been authored (and thus need removal), and no entity has moved from "planned" to "active" since the last check. Default is to run the registry review briefly — it's cheap, and the erosion loop it prevents is expensive.

---

## Section 8 — Feature-inventory summary consistency

**Question:** For each active entity, does the feature-inventory summary section in its `SPECIFICATION.md` (§L4) accurately reflect the actual state of `FEAT-*.md` files under that entity's `features/` directory?

The L4 feature-inventory summary is a reconciliation output maintained by the `ecosystem-decomposition` skill (L4 write scope) and updated operationally by the `feature-development` skill at maturity transitions 4→5 and 5→6. Closes the prevention loop for the feature-inventory maintenance discipline (formerly G-21, closed 2026-06-10) by detecting drift that prevention missed.

### What counts as drift

Four drift signals, in descending order of severity:

1. **Feature-on-disk, not-in-summary.** A `FEAT-*.md` file exists under `{entity}/features/` that has no corresponding row in the summary. Either the spec was created and the summary not updated, or the summary was never written. Critical finding.
2. **Summary row, no-feature-on-disk.** The summary lists `FEAT-XYZ` but no such file exists under `features/`. Either the spec was deleted and the summary not updated, or the summary references a spec that never existed. Critical finding. Cross-check against the absorb-and-delete discipline (G-22) — if the spec was correctly deleted as part of a fresh L3 run, the summary row should also have been removed.
3. **Maturity column out of sync.** A summary row exists, a matching `FEAT-*.md` exists, but the summary's Maturity column disagrees with the spec's YAML `maturity:` field. Most often caused by maturity 4→5 or 5→6 transitions where the `feature-development` skill's step was missed. Finding; severity depends on the direction of drift (summary claims `6-done` but spec says `4-ready` is more misleading than the reverse).
4. **Capability-row missing or stale.** A capability in the §L3 inventory has no row (either no-spec-yet row with em-dashes, or a feature-spec row); or a capability has been removed from §L3 but its row survives in the summary. Lower severity; often a signal that L4 hasn't run for capabilities added in the most recent L3 revision.

### Procedure

1. **Enumerate active entities** that have both a `features/` directory with at least one `FEAT-*.md` file AND a `SPECIFICATION.md` file. Entities whose `SPECIFICATION.md` is in Section 7's registry are skipped (report as "pending (registry)" per the registry interaction note above).
2. For each such entity:
   - List `{entity}/features/FEAT-*.md` from disk. Extract the spec ID and YAML `maturity:` from each.
   - Parse the feature-inventory summary section of `{entity}/SPECIFICATION.md` (§L4). Extract rows.
   - Compute the four drift signals above by comparing the two sets:
     - (1) files on disk not in summary — by spec ID
     - (2) rows in summary with spec ID but no file on disk
     - (3) matching rows where summary Maturity ≠ spec `maturity:`
     - (4) rows with blank or em-dash capability mapping, or capabilities in §L3 with no row in §L4
3. For each drift signal:
   - **Fix in-place** if the fix is obvious: add a missing row from the spec's YAML, update a stale Maturity column value, remove a row for a non-existent spec.
   - **Flag as backlog item** if the fix requires judgement: e.g., summary row for a spec that correctly should not exist (was absorb-and-delete applied correctly?), or §L3 and §L4 diverge in ways that suggest L4 hasn't run for recent L3 changes.
4. **Cross-reference the maintenance discipline (formerly G-21)** in the output. If consistent drift is found, surface whether the drift came through the `feature-development` skill's maturity-transition step (Steps 3 and 5 of that skill) or through the `ecosystem-decomposition` skill's L4 write (creation / deletion / advance 0→4) — the pattern tells us where prevention is weakest.

### What this section does NOT do

- Does not verify that each summary row's entry is correctly *placed* under its capability in the summary table (that's L4's authorial judgement; the check verifies presence and maturity, not organisation).
- Does not verify that the §L3 capability inventory itself is current (that's L3's property — fresh derivation is not a drift-repair concern).
- Does not verify that FEAT-*.md files have the correct owner's directory (Section 3 path-reference covers that if a feature is misplaced).

### Interaction with the feature-inventory template language

The specification templates (`product-specification.md`, `domain-service-spec.md`, `platform-core-spec.md`, `studio-specification.md`, `design-system-specification.md`, `vertical-spec.md`) each point the §L4 authorship note at this check: "Maintenance discipline: the `feature-development` skill updates this section in the same commit as any maturity transition; the `doc-health-check` skill (Section 8) verifies it reflects the current state of `features/`." Section 8 is the verification that closes the reference.

**Skip if:** No entity has had a FEAT-*.md created, advanced in maturity, deleted, or otherwise changed since the last check. Default is to run briefly — the check is cheap per entity.

---

## Section 9 — CLAUDE.md cascade consistency

**Question:** Does the agent-context cascade hold? Every active entity has a `CLAUDE.md`; tier files don't carry entity-specific rules; load-order pointers resolve.

The cascade is named in `ecosystem-decomposition` skill ("Agent context cascade" section) and policed by the five-row content policy in root `CLAUDE.md`. This section verifies the cascade in three dimensions: presence, content categorisation, and load-order integrity. Cheap checks (presence/absence, pointer resolution) are hard fails; expensive checks (content miscategorisation) are soft flags for human review.

### Procedure — presence check

1. List active entities under each tier: `docs/products/{name}/`, `docs/platform/core/{component}/` (if instantiated), `docs/platform/domain/{service}/` (if instantiated), `docs/studios/{name}/`, `docs/verticals/{name}/`. Design system is tier-only; the existing `docs/design-system/CLAUDE.md` *is* its entity CLAUDE.
2. For each active entity, check that `{tier}/{entity}/CLAUDE.md` exists.
3. **Cross-check absences against Section 7's expected-placeholders registry before flagging.** A `CLAUDE.md` listed in the registry is scaffolding, not drift — record it under "Placeholders confirmed scaffolding" in the output summary, not under critical findings.
4. For sub-entities with genuinely divergent rules (the canonical case since ADR-U026: Universe Studio's children `world-studio` / `arc-studio` / `journey-studio` — all three have CLAUDE.md files), check that `{tier}/{entity}/{sub-entity}/CLAUDE.md` exists. Sub-entity CLAUDE.md files are opt-in by divergence; absence is only a finding if the sub-entity is named in the parent entity's CLAUDE.md as having divergent rules. (The former canonical case, Gimbal-iOS vs Gimbal-Android, was dissolved by ADR-U025.)

Genuinely missing files (active entity, no `CLAUDE.md`, not in registry) are critical findings.

### Procedure — content categorisation check

This is a soft-flag check. The five-row content policy in root `CLAUDE.md` defines what each level must, may, and must not contain; this procedure surfaces likely violations for human review.

1. For each tier `CLAUDE.md`, scan for entity-specific patterns. Heuristic flags include: entity-named headers (e.g., "Hub-specific gotchas" in `products/CLAUDE.md`), tier-singular language ("our Hub", "the Hub" referenced as if it were the only product), or technical-stack references that apply only to one entity (`useAuth()` and `proxy.ts` are web-stack; `sb_publishable_*` is Hub-specific; tier files mentioning these without explicit "only for entity X" framing are flagged).
2. For each entity `CLAUDE.md`, scan for sibling-generalisable patterns. Heuristic flags include: rules phrased without entity-specific anchoring (a rule that applies to every product belongs in the tier file, not the entity file), or duplications of tier-file content (the entity file should read as a delta from tier, not a restatement).
3. Surface flags as soft findings. Each one needs human judgment: is the pattern genuinely miscategorised, or is it correctly placed and just visually similar to a miscategorisation pattern? Soft findings drive review at cycle boundaries; they don't auto-fix.

The reference standard: G-30 in `gaps.md` documents the known categorisation problems in `products/CLAUDE.md` and `platform/CLAUDE.md` as of 2026-05-01. Cascade-plan Session 4 is the resolution session for those known problems; Section 9 catches future drift after that resolution.

### Procedure — load-order integrity check

1. For each `CLAUDE.md` in the cascade (root, tier, sub-tier where applicable, entity, sub-entity), verify the file's load-order line cites real upstream files. Tier files cite root `CLAUDE.md` and `AGENTS.md`; entity files cite tier `CLAUDE.md`; sub-entity files cite entity `CLAUDE.md`.
2. Apply the citation-verification rule (`ecosystem-decomposition` Quality checklist; G-28): every cited file path is verified against a directory listing, never inferred from another document's citation.
3. Broken pointers are critical findings — the cascade is only as strong as its weakest pointer.

### Adding to this section

When the cascade structure changes (new tier, new sub-tier convention, new sub-entity divergence), update this section's procedures alongside the change. Same discipline as Sections 1.5, 3.6, and 7 — the section's value depends on it being fed.

**Skip if:** No `CLAUDE.md` files have been authored, restructured, or moved since the last check, AND no new entities have entered active development. Default is to run the presence check briefly — it's cheap, and the cascade-erosion failure mode it prevents is structural.

---

## Section 10 — Graduation-tracker completeness

**Question:** Does every concept that has graduated from universe-discovery into canon have a row in the graduation tracker?

Universe-discovery sessions (`docs/ecosystem/thinking/universe-discovery/`) are working notes, **not** canon. When a concept crystallises it graduates into a **canonical home** — a `docs/ecosystem/universe/` core, or an ADR when the concept is an architectural decision — and that move must be recorded in the graduation tracker (the "## Graduation tracker" table in `docs/ecosystem/thinking/universe-discovery/README.md`). The tracker is hand-maintained, so it lags silently: a concept can be firmly canonical while the tracker still implies it never graduated. This check is the guardrail that keeps the record matching canon. (Added 2026-06-14 after an audit found the tracker missing the beings core, the narrative respawn section, and ADRs U025–U028.)

### Procedure

1. Enumerate the canonical homes that should be tracked:
   - **Universe cores** — every `docs/ecosystem/universe/*/README.md` whose top-of-file Status line reads "Canonical" (cosmology, roles, beings today; narrative is partial — its ratified sections count). Confirm each cites the universe-discovery work as its source:
     ```
     grep -rniE "canonical|ratified|rewritten|universe-discovery|session 0|S[0-9]" docs/ecosystem/universe/*/README.md
     ```
   - **Discovery-sourced ADRs** — every ADR under `docs/architecture/decisions/` whose Source/provenance line cites the universe-discovery work or the 2026-06-05 product locks:
     ```
     grep -rlniE "universe-discovery|2026-06-05 product lock|session 0" docs/architecture/decisions/
     ```
2. Read the graduation tracker table in `docs/ecosystem/thinking/universe-discovery/README.md`.
3. **Forward check:** for each canonical home from step 1, assert a tracker row names it. A core or ADR that cites discovery as its source but has **no** tracker row is a finding — the tracker is lagging.
4. **Reverse check:** for each tracker row, confirm its "Canonical home" target still exists and still carries canonical/ratified status. A row pointing at a downgraded, renamed, or deleted home is stale.
5. **Open-list check:** confirm the tracker's "not yet graduated / still open" note lists nothing that has since acquired a canonical home — an open item that quietly graduated should move up into the table.

### What is and isn't in scope

- **In scope:** concepts whose source is the universe-discovery sessions/notes.
- **Out of scope:** docs sourced from `OLD_VISION.md` / the founding-vision extraction (most of `personal-growth/`, `community/`, `kickstarter/`). That is a different graduation path, not discovery promotion — do not flag those for the discovery tracker. (A discovery *graft* onto an old-vision doc — a single statement folded in — may warrant a tracker footnote but is not a missing-row finding.)

### Fixing

Missing rows are a one-line fix: add the row (Concept | Source | Canonical home | Type | Date) from the home file's own provenance line. If the tracker schema cannot express the destination (e.g. a new destination type), generalise the schema in the same pass. Both are in-place fixes, not backlog items.

**Skip if:** No `universe/` core has been authored or ratified, and no discovery-sourced ADR has been added, since the last check.

---

## Section 11 — Anatomy freshness (the living overview pair)

**Question:** Do the living anatomy overview (`docs/architecture/ARCHITECTURE_ANATOMY.md`) and the current `ECOSYSTEM_ANATOMY_*` diagram still reflect current canon — and do all "current anatomy" pointers resolve to them?

The anatomy pair is a **derived one-stop overview** — deliberately a restated inventory (Section 3.7's banner discipline applies; its header declares "derived — canon wins"). Derived documents rot silently: an ADR lands, the specs and tier docs absorb it, and the overview keeps describing the previous shape. The "Reflects decisions through: ADR-U0XX" stamp is the contract that makes the rot visible. (Added 2026-07-18 after the J-E-boundary finding that the V1 anatomy and the V4/V5 diagrams had drifted with no check watching them.)

### Procedure

1. **Stamp check.** Read the "Reflects decisions through" stamp at the top of `ARCHITECTURE_ANATOMY.md`. List every accepted ADR in `docs/architecture/decisions/` numbered above the stamp. For each, one glance: does it change what the overview or diagram shows (tiers, services, cores, ownership splits, contract boundaries, lifecycle states)?
   - Anatomy-relevant ADRs newer than the stamp → **finding**: the pair needs an update pass (doc + diagram + stamp move together) — backlog item, not an inline fix.
   - No anatomy-relevant ADRs above the stamp → move the stamp to the newest ADR with a "reviewed, no anatomy impact" note; record it in the summary.
2. **Retired-vocabulary grep** over the living pair only (the Section 1 terminology list applies). Frozen snapshots (`ARCHITECTURE_ANATOMY_V1.md`, superseded `ECOSYSTEM_ANATOMY_V*`) are exempt from vocabulary checks — but each must carry its historical banner (MD) or SUPERSEDED watermark (SVG); a frozen snapshot without one is a finding.
3. **Pointer integrity.** These must resolve to the living doc and the current diagram version: the root `CLAUDE.md` document-map row, `PROCESS.md`'s companion-docs line, the architecture `README.md` tree + table, and any ADR "(current visual)"-style pointers. A pointer landing on a superseded version is a finding (fix in-place).

**Severity:** retired vocabulary in the living pair, or a "current anatomy" pointer resolving to a superseded snapshot, is **critical** (it misleads every future session at orientation time); a lagging stamp with anatomy-relevant ADRs outstanding is a standard finding (backlog); a stamp lagging with no anatomy impact is an inline fix.

**Skip if:** no ADR has been added or amended, and nothing under `docs/architecture/` has moved or been renamed, since the last run.

---

## Output format

After running the check, produce a summary in this shape. Paste it into the cycle retrospective under a "Doc health" heading, or into `SESSION_NOTES.md` if run on-demand.

```
Doc Health Check — <date> — <trigger>

Sections run:
1.   Terminology drift            — [N terms checked / N updates made / clean / skipped: <reason>]
1.5  Architectural drift           — [N concepts checked / N critical directives found / N fixed / N flagged as backlog / clean / skipped: <reason>]
2.   Schema drift                  — [N changes checked / N updates made / clean / skipped: <reason>]
3.   Path + README sync            — [N stale refs fixed / N README updates / clean / skipped: <reason>]
3.5  Archived-tree leak            — [N old_*/ refs found / N directive / N historical / N fixed / N flagged / clean / skipped: <reason>]
3.6  Deleted-file refs             — [N deleted filenames checked / N directive refs found / N fixed / N flagged / clean / skipped: <reason>]
3.7  Snapshot drift (inventories)  — [N restated-inventory files checked / N unbannered / N divergent (critical) / N fixed / clean / skipped: <reason>]
4.   Parked items                  — [N parked features reviewed / N un-parked / N reason-updated / clean / skipped: <reason>]
5.   Maturity consistency          — [N specs checked / N drift items / N critical (e.g., 6-done with empty Implementation notes) / skipped: <reason>]
6.   Entity coverage               — [N entities checked / N gaps flagged / N pending-per-registry / clean / skipped: <reason>]
7.   Expected placeholders         — [N registry entries reviewed / N newly authored (removed from registry) / N newly introduced (added) / N still pending / clean / skipped: <reason>]
8.   Feature-inventory summary     — [N entities checked / N drift items / N fixed in-place / N flagged as backlog / N entities pending (registry) / clean / skipped: <reason>]
9.   CLAUDE.md cascade consistency — [N entities checked / N missing CLAUDE.md / N pending (registry) / N content-categorisation soft flags / N load-order pointer breaks / clean / skipped: <reason>]
10.  Graduation-tracker completeness — [N cores + N discovery-ADRs checked / N missing tracker rows / N stale rows / clean / skipped: <reason>]
11.  Anatomy freshness              — [stamp ADR-U0XX vs newest ADR-U0YY / N anatomy-relevant ADRs outstanding / N retired-vocab hits in the living pair / N stale pointers fixed / N unbannered snapshots / clean / skipped: <reason>]

Critical findings (sections 1.5, 3.5, 3.6, 5, or 11 with active-directive / empty-6-done / living-anatomy hits — **excluding** registry entries per Section 7):
- <file>:<line> — <short description> — <fix applied in-place | backlog item created>
- ...

Backlog items created (from critical findings):
- <feature spec / doc> — <what needs to happen>
- ...

Re-finds (already-open backlog items this run re-surfaced — escalated, not re-filed):
- <TASK-id> — raised <original boundary>, re-found here — priority now <N>
- ...

Placeholders confirmed scaffolding (per Section 7 registry):
- <file>:<line> — references <registry entry> — scaffolding, not drift
- ...

Table updates made during this run:
- Section 1.5 table — <N rows added for concepts retired this cycle>
- Section 3.6 table — <N rows added for files deleted this cycle>

Notes:
- <any observations worth preserving for the next check>
```

### Before filing anything: diff against the open backlog

Every finding about to become a backlog item is first checked against the open tasks in `docs/planning/backlog/tasks/` — including the standing-tasks table in that folder's [`README.md`](../../../docs/planning/backlog/tasks/README.md). Grep for the feature id, the file path, and the finding's distinctive noun.

- **No match** — file it normally.
- **Match, still open** — this is a **re-find, not a new finding.** Do **not** create a second task. Instead: (a) append a dated re-find line to the existing task naming the boundary that re-surfaced it, (b) raise its `priority` one step, and (c) name it in the cycle retrospective as a *carried* item. A finding surfacing twice is evidence the backlog is not being read — a bigger problem than the finding itself, and it must not be filed away silently.
- **Match, marked done** — either the fix regressed or the task was closed without the work being done. Say which, in the finding.

**The failure this prevents:** at the A-NTF N-B boundary (2026-07-24) a run re-found FEAT-PC002's absent Implementation notes and filed `TASK-DOC-006` — a duplicate of `TASK-DOC-004`, filed at the A-JRN boundary six days earlier and sitting in the standing-tasks table the whole time. Both filings also recommended a whole-tree sweep that neither performed. Filing is not resolving, and a duplicate filing reads as diligence while erasing the age signal on the original.

### When to create backlog items vs fix in-place

- **Fix in-place:** stale paths, broken links, missing README entries, outdated one-line descriptions, orphaned references, terminology drift in explanatory prose, single-line Section 3.6 hits where the replacement is obvious (e.g., link update), Section 3.5 hits that need only a path repoint.
- **Create a backlog item:** missing SPECIFICATION.md or ROADMAP.md for an active product, `6-done` specs with empty Implementation notes, missing RLS on a table (DoD failure), missing vertical spec for a vertical that's been referenced, structural inconsistencies that need a decision, **Section 1.5 findings that require rewriting a whole section** (e.g., a "Session Management" block built around a retired ritual), **Section 3.6 findings where the deleted file has no direct replacement** (e.g., `BOOT_UP.md` references where the whole ritual was retired), **Section 3.5 findings where the archived-tree reference is structural** (e.g., a Document Map table row listing an `old_*/` file as "authoritative").

The rule of thumb: if fixing it takes more than 5 minutes or requires thinking, it's a backlog item — not something to do inline during the health check.

**Why this matters for sections 1.5 and 3.5/3.6 specifically:** these sections catch drift from *decisions*, not from typos. Fixing the drift often requires understanding the decision that created it, the current Model-A equivalent, and how the surrounding prose needs to change. That's the kind of work that should be its own focused pass with the session context loaded — not a side effect of a health-check run. When in doubt, flag rather than fix.

---

## Related

- **PROCESS.md §3** — cycle-boundary checklist, where this skill is invoked as part of the cooldown ritual
- **PROCESS.md §1** — Model A pipeline + `parked` YAML mechanism (Section 4 of this skill operates on it)
- **PROCESS.md §6** — trigger-artifact map (Section 6 of this skill checks coverage against it)
- **PROCESS.md §6.5** — Skills as the execution layer (Section 1.5 and 3.6 of this skill depend on the skills-over-workflows transition being complete)
- **`ecosystem-decomposition` skill** — defines what each entity needs at Level 2 (Section 6 enforces it); defines the feature-inventory summary as L4's write scope (Section 8 enforces it); defines the agent context cascade (Section 9 verifies cascade integrity)
- **`feature-development` skill** — responsible for setting `maturity: 6-done` correctly with Implementation notes filled in (Section 5 catches failures); responsible for updating the feature-inventory summary row at maturity 4→5 and 5→6 transitions (Section 8 catches failures)
- **AGENTS.md** — cross-check rule: when a grep returns no hits, confirm with a direct listing before concluding something is absent. Section 3.6 applies this rule explicitly (cross-check the deleted-files table against disk every run).
- **`docs/ecosystem/how-we-work/gaps.md`** — the feature-inventory maintenance discipline (formerly G-21, closed 2026-06-10) is what Section 8 verifies; G-22 (legacy spec absorb-and-delete) is cross-referenced by Section 8 signal (2); G-29 (lateral routing for cross-entity findings) and G-30 (tier-CLAUDE miscategorisation) are referenced by Section 9 as the routing target and the reference standard for content categorisation.

## Known gaps / skill calibration

Session 1 of the 2026-04-17 way-of-working refactor surfaced three blind spots in the skill's original design:

1. **Scope exclusion conflated "don't edit" with "don't detect."** The original `--exclude-dir=old_*` pattern prevented fixes inside archived trees (correct) but also prevented detection of active files referencing those trees (incorrect). Fixed by splitting Scope into "edit targets" and "detection targets," and adding Section 3.5.

2. **Workflow-file detection was keyword-scoped to archived-path results.** The skill looked for deleted filenames like `BOOT_UP.md` but didn't recognise hits where the path prefix was in `old_*`. Fixed by Section 3.6, which explicitly scans active files for deleted filenames and treats any directive reference as a finding regardless of the path prefix inside the reference.

3. **"Terminology drift" (Section 1) couldn't model obsoleted *concepts*.** Section 1 handles renames (A → B). It doesn't handle whole workflows being retired ("boot-up ritual no longer exists as a concept, not just renamed"). Fixed by Section 1.5.

4. **README index file-count lag.** (Surfaced 2026-04-17 Session A Step 1.) Section 3's README-sync procedure checks that every file listed in a README still exists on disk, but does not check the inverse — that every file on disk is listed in the README. `docs/planning/sessions/README.md` passed its Section 3 check despite being ~10× out of date (4 files listed, 43+ files actually present), because all 4 listed files did still exist. The inverse check — directory listing vs. README content — catches drift like this. **Mitigation:** in Section 3's README-sync procedure, add as step 2.5 after the existing steps: "Compare total README entries against directory listing count. If the ratio is off by more than ~20%, the README is lagging and needs a refresh pass even if no individual entry is broken." A stricter version would list every file on disk in the README; a lighter version tolerates curated subsets but at least flags the count gap. The lighter version is probably correct default. **(2026-06-10 refinement, TASK-DOC-002):** a README that *explicitly declares* curation — stating that the directory listing is the canonical index and the README is deliberately partial (as `docs/planning/sessions/README.md` does) — passes the count-lag check by policy; for such READMEs, check instead that the curated highlights are not stale (the newest highlighted entry should be within a wave of the newest file on disk).

These gaps allowed the root `CLAUDE.md` file to pass the 2026-04-17 first-invocation check despite having nine separate stale references (four to deleted workflow files, the Sprint Agent handoff, the PRODUCT_SPEC.md + REQUIREMENTS.md model, etc.). The user caught them by eye during review. The skill has been updated; next invocation should catch all nine.

**2026-06-28 — stale snapshots of renumbered inventories (Section 3.7).** A research sub-agent reported the 2026-04 `hub-l3-working-set` draft's A-IDN inventory (IDN-1..14) as current, instead of the canonical IDN-1..12 in `docs/products/hub/SPECIFICATION.md` §L3. The draft self-disclosed non-authority in its *header*, but its inline tables had no banner, so a mid-file landing (human or agent) missed the disclaimer. The blend nearly seeded a wrong multi-cycle build plan; it was caught only by an independent cross-check against the shipped feature specs' own deferred-IDN notes. Fixed by Section 3.7 (the doc-side guardrail — inline banners on each restated table) plus an orchestration rule for dispatching fact-finding agents (name one canonical source, canonical-wins, cite file:line, flag self-declared non-authoritative sources). The deeper lesson: a self-disclaimer at the top of a file does not protect against grep/agent landings deeper in it — the warning must sit beside the asset it guards.

If future runs reveal further blind spots, document them here before fixing, so the pattern of the failure is captured alongside the fix.
