# Design note — role distribution ("publishing" permission sets), Stefan's model + the named decisions

**Filed:** 2026-08-05, at the Part-3 walk pause (during the WA-6 hold). **Status: parked for the next planning boundary** (AB-6 kickoff / Eid planning). Not Ferd scope unless the named kernel is pulled early.
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
