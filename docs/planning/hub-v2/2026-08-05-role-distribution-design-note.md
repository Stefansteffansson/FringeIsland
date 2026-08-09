# Design note — role distribution ("publishing" permission sets), Stefan's model + the named decisions

**Filed:** 2026-08-05, at the Part-3 walk pause (during the WA-6 hold).
**Status (2026-08-06): PULLED INTO FERD, PRE-CUTOVER — Stefan's call** ("I want to build the publish sets of permissions by roles before closing Hub v1"). No longer parked and no longer Eid-class by default: it becomes build cycles in the [Platform-Ops completion plan](./phase-3-platform-ops-completion-plan.md), sequenced **ahead of AB-6** so the FULL audit covers what they ship (the RB-1 precedent). **The decision board below is CLOSED** — RD-1 settled 2026-08-06 at the walk close (both cycles, RD-A then RD-B), RD-2..RD-10 confirmed explicitly at the RD-A kickoff the same day ("all as recorded"). Decomposition proceeds against the settled rows.
**Origin:** the S10/S11 walk discussion — WA-6 ruled template-less groups instantiate the **system set only** (clones pull-only), which leaves *all* clone distribution needing a deliberate story. Stefan sketched one; this note is its record.

---

## Stefan's model (the spine — his sketch, 2026-08-05)

- Sets of permissions are collected under the name of **roles**. Created by (a) Admins platform-wide, (b) Stewards per group.
- Admins create/offer platform-wide roles by publishing them to the **central record** where the four system roles already live (today: the role-template registry — seeds + clones, the ADM-F editor).
- From the central record, an admin **publishes** a role to **one group / multiple groups / all groups**.
  - Stewards of targeted groups get a **notification of availability**; adoption is a considered act in the group's roles panel — the Steward reviews available roles and **copies** any into their group. (Copy = snapshot; the sovereignty/snapshot law holds.)
  - Stewards can **retire/delete any non-system role in their own group**; members holding it are stripped of its permissions.
- Admins can **retire** roles at the central record — group copies are untouched; targeted Stewards are notified.
- Admins can **edit/update** central roles — targeted Stewards are notified and may copy the update into their group.

**Why this shape is right:** it adds the missing *distribution* layer to ADR-U007's three (define / instantiate / customise); it matches standard RBAC practice (central definitions, scoped distribution); adoption stays Steward-initiated (sovereignty preserved with less machinery than an accept/decline-in-the-bell model — the notification is news, the act happens in the roles panel); copies are snapshots, so the WA-6/RB-5 physics survive unchanged.

## The named decisions (flagged at filing — to be ruled at design time)

1. **No silent merge — the dangerous sentence.** The sketch's "if the name already exists, the sets will be merged" must not mean a silent union: a Steward who deliberately removed a permission from their copy would get it silently re-granted on the next copy — permission escalation by merge. Rule to adopt: on name collision or update-copy, a **diff ceremony** (current set vs incoming, added/removed lists, Steward confirms) — the admin Apply ceremony's shape, reused.
2. **Retire needs the lockout guard.** Stripping members of a retired role's permissions is correct, but retiring must **refuse when it would remove the group's last management role** (nobody left holding `assign_roles` = a bricked group) — the leave/remove family's guard shape. The ceremony states the stripping consequence before the click.
3. **Centrally: retire, never delete.** Version history is the audit evidence (the ADM-13 waiver's compensating control) and provenance (`created_from_role_template_id`) must never dangle. Group-side delete of an adopted/custom role is legitimate (the role is the group's property).
4. **Creation-time wrinkle:** publications to *specific groups* can only affect existing groups' pickers; the group-creation template choice predates the group, so only **platform-wide** publications can appear there. A rule to write down, not a problem.

## Sizing

- **Full shape (Eid-class):** publications/scope table (data-driven, open — `role_template_publications`), availability + update + retirement notifications (registered kinds through the existing registry/dispatcher), the Steward-side "available roles" view, the diff-on-copy ceremony, central retire + group retire ceremonies with the guards. A real subsystem, not a rider.
- **Ferd kernel (pull early only if clutter bites):** visibility scoping alone — a clone is choosable where published, adoption stays pull. Cheap; no sovereignty questions.
- **First slice candidate (standalone, small; no WA number — WA-7 was subsequently allocated to the save-draft repaint finding):** **central retire** ("clones can be retired — hidden from all pickers — never deleted"): a flag, filters on the two picker reads, a retire/unretire ceremony. Solves the immediate "Walk Editor Test lives forever" gap independent of the rest.

## WA-8 (ruled 2026-08-05, after filing) — the first data slice

The walk's "Nya gruppen #2" moment (a v1-snapshot copy read against a v5 template — lawful, illegible) produced **WA-8: group role copies show their source version + copied-date** (build shape in the [findings doc](./2026-08-05-ne-walk-findings.md) §WA-8). It is this note's first concrete slice: the provenance column is the substrate the update-notification half needs anyway.

## Standing context at filing

WA-6 held at PR #435 (template-less = system set only); the walk's Part 3 paused at S11 pending its nod. "Walk Editor Test" (the walk's clone) persists platform-wide until retired/removed — substrate-side cleanup offered at walk close.

---

## Decision board — role distribution (CLOSED 2026-08-06; opened the same day on Stefan's pre-cutover call)

Presented whole, recommendations marked; settle with "go with recommended" or row-by-row. Settlement is followed by decomposition to 4-ready paired specs per cycle (spec → held schema gate → build → walk), then AB-6.

| # | Question | Recommendation | Default if unaddressed |
|---|---|---|---|
| **RD-1** | Cycle shape | **Two cycles.** **RD-A (foundation):** WA-8 provenance stamp (source version + copied-date on every group role) · **central retire** (a template stops being offerable; history and copies untouched) · **group-side retire/delete of a template-derived role** (today only *custom* roles can be removed — `RolesPanel` gates deletion on `created_from_role_template_id` being null, so an adopted role is currently permanent in its group). **RD-B (distribution):** the publications table + scoped publish (one/many/all) · the availability/update/retirement notices · the Steward's "available roles" view · the diff-on-copy ceremony. RD-A is genuinely prerequisite — "your copy is behind" is unsayable without provenance, and publishing without retire makes every clone permanent | two cycles, RD-A first |
| **RD-2** | What "publish" does | **Offer, never write.** Publishing changes *where a template is offerable*; it never reaches into a group and creates a role. Adoption stays the Steward's act in the roles panel (your model's own shape — the group stays sovereign, and it needs no consent machinery beyond a notice) | offer-only |
| **RD-3** | Name collision / copying an update | **Diff ceremony, never silent merge.** "Merged" as a silent union would re-grant permissions a Steward deliberately removed — escalation by merge. The Steward sees current-vs-incoming with added/removed lists and confirms (the admin Apply ceremony's shape, reused) | diff ceremony |
| **RD-4** | Central delete | **Retire only, never delete.** Version history is the audit evidence and provenance must not dangle. Group-side delete of an adopted role is legitimate (it's the group's property) — that's RD-A's third leg | retire-only |
| **RD-5** | Retire guard | **Refuse the retire that strips a group's last management role** (nobody left holding `assign_roles` = a bricked group), the leave/remove guard shape; the ceremony states the member-stripping consequence before the click | guard required |
| **RD-6** | Sequence vs AB-6 | **Both cycles ahead of AB-6**, per RB-1's own rule ("all ahead of AB-6, so the FULL audit covers everything the re-scope ships"). Phase-4 cutover therefore moves out by these two cycles — the explicit cost of the pre-cutover call | ahead of AB-6 |
| **RD-7** | Notification shape | **Passive news, not asks.** Three registered kinds (published / updated / retired) through the existing registry + dispatcher, `dispatch_segment` NULL — the Steward acts in the roles panel, not in the bell. No new framework; contrast N-E, where the *invitation* was genuinely answerable in place | passive kinds |
| **RD-8** | Targeting "all" | **Data-driven publication rows** — a row with a NULL group target means platform-wide; targeted rows name their group. Keeps "all" from being a special code path (ADR-U008/U018 non-closure) | data-driven |
| **RD-9** | Creation-time visibility | Only **platform-wide** publications can appear in the group-creation template chooser (a targeted publication has no group yet to be targeted at). Write the rule down; no build cost | as stated |
| **RD-10** | WA-8 backfill | Existing copies predating the provenance column: **backfill by grant-set match where unambiguous, else render "version unknown"** — never guess a version onto a role | honest-unknown |

**Open for Stefan beyond the rows:** whether RD-A alone satisfies "before closing Hub v1" (it delivers provenance + retire, i.e. the legibility and the off-switch) or whether RD-B's publishing is the actual must-have pre-cutover. The recommendation assumes both, since RD-B is the thing you named.

### Board settlement (2026-08-06, Stefan: "go with both A and B but in a new session")

- **RD-1 SETTLED as recommended:** both cycles, **RD-A first, then RD-B**. The open question under the board ("is RD-A alone enough pre-cutover?") is answered — **it is not; RD-B's publishing ships too**, before Phase-4 cutover.
- **RD-2..RD-10:** not named individually, so each stands at its recorded **Default if unaddressed** — which equals its recommendation in every row (offer-never-write · diff-ceremony-never-silent-merge · retire-never-delete centrally · lockout guard on retire · both ahead of AB-6 · passive notice kinds · data-driven targeting · platform-wide-only at creation time · honest-unknown backfill). **The RD-A kickoff should re-read these aloud for a confirming nod** before decomposition commits to them — cheap, and it keeps a defaulted row from hardening into an unexamined law.
- **Execution deferred to a new session** at Stefan's request. Nothing starts here.

### Board CLOSED (2026-08-06, next session open — Stefan: "all as recorded, start with the rituals")

The nine defaulted rows were re-read back to Stefan at the RD-A kickoff and **confirmed explicitly**. RD-2..RD-10 are no longer defaults-by-silence — they are **settled law** for the RD-A and RD-B decompositions, and a spec that contradicts one of them is wrong, not merely unusual:

| Row | Settled |
|---|---|
| RD-2 | Publish **offers**, never writes; adoption stays the Steward's act in the roles panel |
| RD-3 | Copying an update runs the **diff ceremony** (current-vs-incoming, added/removed, confirm) — never a silent merge |
| RD-4 | Central **retire only**; group-side delete of an adopted role is legitimate and is RD-A's third leg |
| **RD-4a** | **AMENDMENT, settled 2026-08-09** (Stefan: *"RD-4a: i accept and agree"*), raised by walk finding **W-10**. Retire-only stands for every template that was **ever offered or ever adopted**. A template that was **never published** and has **no copies** has no provenance to dangle and no audit evidence of anything a Steward ever saw — for that case only, **delete is permitted**. Narrow by construction, not by convention: the guard in [FEAT-PC029](../../platform/core/features/FEAT-PC029-role-template-catalogue-disposal-contracts.md) is exactly the set of conditions under which RD-4's own stated rationale does not bind, so if the rationale applies the delete refuses. **RD-4 is not weakened** — the amendment carves out the case RD-4 never contemplated: the mistake clone nobody ever saw |
| RD-5 | **Lockout guard**: refuse a retire that would strip a group's last role holding `assign_roles`; the ceremony states the member-stripping consequence before the click |
| RD-6 | **Both cycles ahead of AB-6**; Phase-4 cutover moves out by them — the accepted cost of the pre-cutover call |
| RD-7 | **Passive notice kinds** (published / updated / retired) through the existing registry + dispatcher, `dispatch_segment` NULL — no answerable ask in the bell |
| RD-8 | **Data-driven publication rows**; a NULL group target means platform-wide, so "all" is never a special code path |
| RD-9 | Only **platform-wide** publications appear in the group-creation template chooser |
| RD-10 | Provenance backfill by grant-set match where unambiguous, else **"version unknown"** — never a guessed version |

**The board is CLOSED.** Reopening a row is a new decision with its own record, not a decomposition-time reinterpretation.

---

## Decomposition boards — what each cycle had to settle that this board did not reach

This board rules on *what role distribution is*. Each cycle's decomposition then meets questions the board never posed. Those are recorded in the cycle's substrate dossier, not here, so this note stays the record of the model rather than of its construction.

- **RD-A** — settled at build, two of them by correction: the delete refusal was **two** layers, not three (the third was a tombstone — HYG-A had already dropped the policy), and RD-5's lockout guard was specified unreachably and was re-specified **by definer** rather than by holder. Both are written into [FEAT-PC027](../../platform/core/features/FEAT-PC027-role-provenance-retirement-and-group-side-removal-contracts.md).
- **RD-B** — seven rows (RDB-1..RDB-7), raised in the [RD-B substrate dossier](./2026-08-06-rd-b-substrate-dossier.md) and settled **all-as-recommended** on 2026-08-06 *before* the specs hardened them: the scoped picker read is a **new** function with the zero-arg dropped (RDB-1); notice recipients resolve by **`manage_roles`** (RDB-2); the three kinds get their **own `roles` category** (RDB-3); RD-9's guard is written even though its stated path does not exist (RDB-4); re-publishing is **idempotent** (RDB-5); publication rows **survive** retirement and are filtered at read (RDB-6); the pair is [FEAT-PC028](../../platform/core/features/FEAT-PC028-role-template-publication-scoped-offer-and-diff-on-copy-contracts.md) + [FEAT-H044](../../products/hub/features/FEAT-H044-available-roles-view-and-diff-on-copy-ceremony.md) (RDB-7).

### One row of this board is amended by verification: RD-9

**RD-9 as settled reads:** *"Only platform-wide publications appear in the group-creation template chooser."*

**Verified 2026-08-06, and it describes a mechanism that does not exist.** Publications are `role_template ↔ group`; creation-time instantiation runs through `group_template_roles`, which is `group_template ↔ role_template` and which no publication row touches. There is no path by which a *role* publication reaches the group-creation chooser at all — platform-wide or targeted. RD-2 is why: publish **offers**, it never registers anything anywhere.

This is not a reopening. RD-9's *intent* — that a targeted publication must never leak into a surface that predates the group it targets — is honoured, and holds by construction. What is corrected is the belief that a mechanism existed which needed the rule. RD-B ships the `retired_at IS NULL` predicate on both `create_engagement_group` branches anyway (RDB-4), because that hole is real, currently unreachable, and one future junction row from live.
