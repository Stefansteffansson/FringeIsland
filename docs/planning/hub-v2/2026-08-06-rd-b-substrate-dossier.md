# RD-B substrate dossier — role distribution: scoped publish, passive notices, available-roles view, diff-on-copy

**Filed:** 2026-08-06 (session 13), at the RD-B decomposition open.
**Cycle:** RD-B, the second and last of the role-distribution pair. RD-A closed the same day (both specs `6-done`, migration `20260806170000` applied and merged, #448).
**Board:** [`2026-08-05-role-distribution-design-note.md`](./2026-08-05-role-distribution-design-note.md) — **CLOSED**. RD-1 settled at the walk close; RD-2..RD-10 confirmed explicitly at the RD-A kickoff. A spec that contradicts a settled row is wrong, not merely unusual.
**Purpose:** state what the substrate *actually is* before the specs are written, with a disk anchor on every load-bearing claim. RD-A's dossier carried two premises that verification later overturned; this one leads with the checks.

---

## Method note — why this dossier reads differently from RD-A's

RD-A's Finding 3 named an RLS rule that HYG-A had already dropped, and its RD-5 guard was specified against a condition that could never fire. Both were caught at the build, not at decomposition. The generalised lesson, recorded at the RD-A close:

> **A comment naming a mechanism proves the mechanism was once there; the catalogue is the authority for whether it is there now.**

Applied here: every finding below cites `file:line` read **in this session**, and every claim that a filter, guard, or door *does not exist* is stated as a grep with its scope named, so the zero is falsifiable. Findings 2, 3 and 5 are gaps whose *reachability* is asserted from source only — each carries an explicit **"prove it red first"** note, because reading a missing predicate is not the same as driving the hole.

---

## Finding 1 — the publication layer is greenfield. Zero substrate exists.

```
grep -rli "role_template_publication|publish_role_template" \
     supabase/migrations supabase/seeds docs/platform docs/products
→ (no hits)
```

Nothing to reconcile, nothing to re-issue, no naming already spoken for. RD-8 settles the shape (data-driven rows, NULL group target = platform-wide), so the table is the cycle's one genuinely new object.

**Consequence for decomposition:** this is a **first-of-its-kind object class** question and must be answered before `4-ready`, per the N-E lesson (GC-8 refused a DS-5 function mounted on a PC-3 table because nothing like it had existed before, and the licence had to be written under time pressure). A new PC-3 table with an FK to `groups` and an FK to `role_templates` is *not* novel in itself — `group_template_roles` is exactly that shape (`20260222000000:169`). What is worth naming: the table's **nullable** group FK is the mechanism by which "all groups" avoids being a special code path, and a nullable FK carrying semantic meaning is a pattern the ownership manifest and the privacy classifier both have to be told about explicitly (`supabase/ownership.manifest.json` — `role_templates` and friends are all `PC-3` / `memberData: false`, lines 18-22 and 323-326).

---

## Finding 2 — RD-A filtered the picker read but **not** the write door. The hole is open today.

Two doors, and only one of them learned about retirement.

**The read — filtered.** `get_role_templates()`, re-issued by RD-A at `supabase/migrations/20260806170000_rd_a_pc027_role_provenance_retirement_and_removal.sql:608`:

```sql
    FROM public.role_templates t
    -- RD-A FEAT-PC027 STORY-3: a retired template is no longer offered.
   WHERE t.retired_at IS NULL;
```

Zero-arg, `SECURITY INVOKER`, `STABLE`, returns `{id, name, description}` ordered by name, granted to `authenticated` (`20260722190000:79-80`).

**The write — unfiltered.** `create_group_role(uuid, text, text, uuid, text[])`, re-issued by RD-A at the same migration `:350`. Its template branch validates **existence and nothing else** (`:404-408`):

```sql
    if not exists (
      select 1 from public.role_templates rt where rt.id = p_role_template_id
    ) then
      raise exception 'role template not found' using errcode = 'P0002';
    end if;
```

No `retired_at IS NULL`. No scope predicate. The contract is reachable directly over PostgREST by any `authenticated` caller holding `manage_roles` in the target group (`:392`) — and under ADR-U038 that RPC *is* the API, so "the Hub's picker doesn't show it" is not an access control.

**This is the same class of defect as TASK-RDA-03** — a rule enforced at one door while a neighbouring door onto the same state stays open. RD-A closed the delete-side brick and left the revoke-side one; here RD-A closed the offer-side read and left the adopt-side write.

> **Prove it red first.** The claim is read from source, not driven. The RD-B build opens with a failing integration cell: retire a clone via `admin_retire_role_template`, then call `create_group_role` with that template id as a Steward, and assert the refusal. If it *succeeds* today, the cell is the proof and the fix is RD-B's; if it already refuses, the premise is wrong and this finding is corrected in the spec before build — the RD-A discipline, applied on time for once.

---

## Finding 3 — `get_role_templates()` is group-agnostic, and scoping it costs a new function, not a re-issue

The contract takes no arguments. Scoped publish (RD-2/RD-8) requires the Steward's picker to answer *"what is offered **to this group**"*, which needs `p_group_id`.

Adding a parameter changes the signature, and **COR-A's re-issue discipline** is that a re-issued function keeps a byte-identical signature so `create or replace` preserves its ACL (stated verbatim in RD-A's own header, `20260806170000:~60`). A different signature is a **new function** — new grant, new manifest registration, and the zero-arg original left standing beside it.

So the decomposition owes an explicit ruling, not a drift:

- **(a) New scoped sibling, retire the old** — e.g. `get_available_role_templates(p_group_id uuid)`; the zero-arg `get_role_templates()` is dropped in the same migration once its callers move. One live door. Costs a drop, which is a real (if small) schema-gate item.
- **(b) New scoped sibling, keep both** — the zero-arg stays for any caller that legitimately wants the unscoped catalogue. Two doors onto template offerability is precisely the shape Finding 2 is a complaint about; if it is kept, it must be kept for a *named* caller, not "just in case".
- **(c) Overload** — Postgres permits `get_role_templates()` and `get_role_templates(uuid)` side by side. Cheapest to write, worst to reason about: PostgREST resolves overloads by supplied argument names, and a caller that omits the argument silently gets the unscoped catalogue. This is a footgun with the same signature as Finding 2's.

**Recommendation: (a).** One door, the drop paid once, and the name states what it now means. Named in the decision board below as **RDB-1**.

The Hub side is already positioned for it — `hub/lib/groups/queries.ts:239-244` wraps the RPC in one place (`RoleTemplateOption[]`), and `RolesPanel.tsx` consumes it as a prop (`:87`, `:357`). One call site moves.

---

## Finding 4 — the diff-on-copy ceremony's *apply* half is entirely new contract surface

```
grep -rli "sync_group_role|refresh_group_role|update_group_role_from_template" supabase/migrations
→ (no hits)
```

The PC-3 group-role doors that exist today (`supabase/ownership.manifest.json:~133-150`): `create_group_role`, `update_group_role`, `delete_group_role`, `set_group_role_permission`, `remove_member_role`, `get_group_roles`, `role_fabric_entry`, plus the `copy_template_permissions_on_role_create` trigger.

Read that list against RD-3 and the shape of the gap is exact:

- **Adoption** (a template becomes a *new* role in the group) has a door: `create_group_role` with `p_role_template_id`, and the trigger materialises the grants (`20260806170000:428` — *"copy_template_permissions materialises the grants; never copy twice"*).
- **Re-copying** (an *existing* adopted role takes its template's newer version) has **no door at all**. `update_group_role` edits name/description; `set_group_role_permission` flips one grant at a time. Neither knows what a template version is.

So RD-B owes two new contracts, not one:

1. a **read** that computes the diff — the group role's current grant set versus the template's live materialised set — and returns it as added / removed / unchanged, plus the version numbers on both sides (`group_roles.created_from_version_number`, RD-A's stamp, vs. `role_templates.default_version_id → version_number`);
2. a **write** that applies it, transactionally, and re-stamps the provenance.

**The diff read is where RD-3's whole point lives.** "Silent merge" is a *union*; the ceremony exists so a Steward who deliberately revoked a permission sees that the incoming copy re-grants it. That means the diff must be computed against the group role's **actual current grants** — not against the version it was copied from — because the Steward's own edits since the copy are exactly what would be silently overwritten. A diff of *version N vs version N+1* would render the template's changelog and hide the Steward's divergence. **A spec that computes the template-side delta is wrong under RD-3.** Naming it here because it is the single most inviting wrong turn in this cycle.

**The payload walk owes this one a copy check.** Per the N-E rider: an acceptance criterion that *quotes* user-facing text is verified against what the surface renders, not against the key that feeds it. The diff ceremony is nearly all quoted copy.

---

## Finding 5 — the group-creation instantiation path still does not filter retirement (the standing item, now verified on both halves)

The RD-A close recorded this as *"recorded not decided… RD-B must settle it."* Both halves now carry a disk anchor.

**Half one — the path does not filter.** `create_engagement_group`, re-issued by RD-A at `20260806170000:274-284`:

```sql
  insert into public.group_roles
    (group_id, name, description, created_from_role_template_id,
     created_from_version_number)
  select v_group_id, rt.name, rt.description, rt.id, dv.version_number
    from public.role_templates rt
    left join public.role_template_versions dv on dv.id = rt.default_version_id
   where (p_group_template_id is null and rt.is_system)
      or rt.id in (
        select gtr.role_template_id
          from public.group_template_roles gtr
         where gtr.group_template_id = p_group_template_id
      );
```

Neither branch carries `retired_at IS NULL`.

**Half two — why it is unreachable today.** `admin_retire_role_template` refuses system templates outright (`20260806170000:~700`), and logs the refusal:

```sql
  -- The four seeded roles are the floor every group is built on.
  if v_template.is_system then
    ... 'role_template.retire_refused' ...
    raise exception 'a system role template cannot be retired' using errcode = '42501';
  end if;
```

The template-less branch selects only `rt.is_system`, which can never be retired. The template-chosen branch selects through `group_template_roles`, which registers only the four system templates (ADM-F's finding, `20260804210000:10-13` — *"a clone … never in group_template_roles, so it never instantiated"*). **Both branches are therefore provably retirement-free today** — and both go live the moment anything registers a clone in that junction.

**Does RD-B register clones there?** Not necessarily — RD-8's publications table is a *different* junction (`role_template ↔ group`, for the Steward's picker), whereas `group_template_roles` is `group_template ↔ role_template`, for automatic instantiation at group creation. RD-2 is decisive: publish **offers**, never writes. A published clone appears in a Steward's available-roles view; it does not thereby join any group template. **So RD-B as scoped does not open the hole.**

But RD-9 points straight at it: *"only platform-wide publications appear in the group-creation template chooser."* That is a rule about a chooser whose contents come from `group_templates`, and whose role set comes from `group_template_roles` — a junction no publication row touches. **RD-9 as written describes a mechanism that does not exist**: there is no path by which a *role* publication reaches the group-creation chooser at all, platform-wide or otherwise. It is a rule against a door that isn't there.

Two honest options, on the board below as **RDB-4**: write the guard anyway as defensive depth (a `retired_at IS NULL` predicate on both branches, cheap, one line, plus a cell), or record RD-9 as satisfied-by-construction and leave the predicate unwritten. **Recommendation: write the predicate.** It is one line against a hole that is one future junction-row away, and RD-A's `is_protected` lockout guard is the precedent for shipping a guard that is defensive depth and rarely reached.

---

## Finding 6 — the notification substrate takes the three passive kinds with no framework work

**The registry.** `notification_kinds(kind TEXT PK, category_key TEXT → notification_categories, label TEXT, created_at)` at `20260723120000:43`; `dispatch_segment TEXT` added by COR-C W3 at `20260731140000:63`. Reference-data posture — `notification_kinds_select` to `authenticated`, **no user-facing write policies**, migrations/service_role only (`20260723120000:59-60`).

**The six categories** (`20260723120000:78`): `membership`, `group-lifecycle`, `stewardship`, `account`, `journeys`, `platform` — the last labelled *"Platform & admin communications"*, all `transactional` / `badge` in Ferd.

**How a notice is written.** Direct `INSERT INTO public.notifications (recipient_group_id, type, title, body, payload, group_id)` inside the acting contract. The C-E lifecycle fan-out (`20260721100000:279-290`) is the canonical set-valued shape; N-E is the most recent instance (`20260805120000:106,141`).

**Why RD-B is cheaper than N-E.** N-E had to set `dispatch_segment = 'invitation-response'` (`20260805120000:183-184`) because its notice was *answerable in the bell*. RD-7 settles RD-B's three as **passive news** — the Steward acts in the roles panel, not the bell — so `dispatch_segment` stays NULL, which is the column default. **The three kinds are three seed rows and nothing else.** No dispatcher segment, no handler, no new framework. `ds5_may_deliver` / `ds5_apply_notification_preference` (`20260726120000`) gate delivery as they already do for every kind.

**One open: which category.** `platform` fits the letter ("Platform & admin communications" — an admin published something). But the preference surface lets a member mute a whole category, and muting *platform announcements* would then also mute *"a role you adopted was updated"*, which is operational news about their own group. On the board as **RDB-3**.

---

## Finding 7 — "notify the Steward" needs a permission, not a role name

The model says *"Stewards of targeted groups get a notification of availability."* The substrate has no `is_steward`:

```
grep -rhoiE "function public\.[a-z_]*steward[a-z_]*" supabase/migrations → (no hits)
```

The codebase resolves stewardship **permission-derived, never by role-name string** — RD-A's own `create_engagement_group` says so at `:294-301` when it binds the creator, deriving the management role from whichever instantiated role's template grants `assign_roles`.

Two candidate permissions, and they are not the same set:

- **`assign_roles`** — the Steward-defining permission today (unique to the Steward template, per the comment above), and the one RD-5's lockout guard is written against.
- **`manage_roles`** — the permission `create_group_role` actually gates adoption on (`20260806170000:392`), i.e. **exactly who can act on the notice**.

**Recommendation: `manage_roles`.** A notice should reach the people who can do the thing it is about. Today the two sets coincide (the Steward template grants both — `supabase/seeds/02_role_templates.sql:28`), so the choice is invisible at launch and load-bearing the moment a group defines a roles-only delegate. On the board as **RDB-2**.

---

## Decision board — RD-B (open; recommendations marked)

The RD-2..RD-10 board is CLOSED and is not reopened by any row here. These are the questions the *decomposition* must answer that the design board did not reach.

| # | Question | Options | Recommendation |
|---|---|---|---|
| **RDB-1** | How does the picker read become group-aware? (Finding 3) | (a) new `get_available_role_templates(p_group_id)`, drop the zero-arg original · (b) new sibling, keep both · (c) overload | **(a)** — one door; the overload's omitted-argument path is Finding 2's footgun again |
| **RDB-2** | Which permission defines a notice recipient? (Finding 7) | `manage_roles` · `assign_roles` · both | **`manage_roles`** — the permission that gates the act the notice is about; identical set today, correct set later |
| **RDB-3** | Which notification category holds the three kinds? (Finding 6) | existing `platform` · new `roles` category | **new `roles` category** — `platform` is mutable as one unit by the member, and muting admin announcements should not silently mute "your group's role changed". One seed row |
| **RDB-4** | RD-9's creation-time rule, which describes a path that doesn't exist (Finding 5) | write the `retired_at IS NULL` predicate on both `create_engagement_group` branches anyway · record satisfied-by-construction | **write the predicate** — one line, one cell, against a hole one junction-row away; the RD-A `is_protected` guard is the precedent |
| **RDB-5** | Does publishing to a group the template is *already published to* error, or no-op? | error · idempotent no-op returning current state | **idempotent** — matches `admin_retire_role_template`'s own `already_retired: true` return (`20260806170000:~715`) rather than raising |
| **RDB-6** | What happens to publication rows when a template is retired? | rows deleted · rows kept, retirement filters at read | **kept, filtered at read** — RD-4's reasoning exactly (history is the audit evidence); and unretire must then restore the prior reach rather than silently publishing to nobody |
| **RDB-7** | Spec split across the pair | one PC + one H, as every cycle since ADM-B | **one PC + one H** — `FEAT-PC028` (publications table, scoped read, diff read + apply write, three kinds, notice emission) + `FEAT-H044` (available-roles view, diff-on-copy ceremony, admin publish surface, the three bell renders) |

---

## What RD-B ships (scope, restated against the settled board)

**Platform (`FEAT-PC028`)** — one schema gate:
1. `role_template_publications` — data-driven scope rows, nullable group FK = platform-wide (RD-8).
2. Admin publish / unpublish contracts, idempotent (RDB-5), audit-logged like RD-A's retire.
3. `get_available_role_templates(p_group_id)` — the scoped picker read (RDB-1), retirement-filtered *and* publication-scoped.
4. The **write-door fix**: `create_group_role` refuses a retired template, and refuses one not offered to that group (Finding 2).
5. The diff read + the apply write (Finding 4), diffing against the group's **current** grants (RD-3).
6. Three `notification_kinds` seed rows, `dispatch_segment` NULL (RD-7), in a new category (RDB-3); emission from the publish / apply-version / retire contracts to `manage_roles` holders (RDB-2).
7. The defensive `retired_at IS NULL` predicate on both `create_engagement_group` branches (RDB-4).

**Hub (`FEAT-H044`)** — the Steward's available-roles view, the diff-on-copy ceremony (consequences stated before the click), the admin publish surface on `AdminRoleTemplateDetail.tsx`, and the three passive bell renders.

**Not in RD-B:** anything reopening RD-2..RD-10. TASK-RDA-03's `set_group_role_permission` revoke-side brick is a *neighbouring* hole in the same family and is tempting to fold in — it stays its own task unless Stefan says otherwise, because it has its own unverified premise to drive red first.

---

## Standing risks carried into the build

- **ADR-U043**: the available-roles view is a new panel read. If it lands on a first-paint path rather than behind an affordance, the cycle-level deep-cold spot measurement triggers. RD-A avoided it by riding an existing fabric read; RD-B probably cannot. Decide at spec time, not at the gate.
- **The bare-accessible-name E2E trap** (RD-A's sibling-sweep miss): RD-B *adds* affordances to the roles panel — publish, copy-update, diff-confirm. Before the build closes, grep the E2E fleet for positional selectors like `getByRole('button', {name: /^Copy$/}).last()`, not just for assertions naming changed objects.
- **Ownership manifest**: one new table + four-to-six new functions. Unregistered ⇒ two conformance suites fail, silently attributed to CORE.

---

## Post-filing verification — Findings 2 and 5 confirmed against the **live catalogue**

Filed above from migration source. Confirmed 2026-08-07 against the deployed contracts on the dev DB (`pg_get_functiondef` over `pg_proc`), which is the authority the RD-A lesson names — source says what was written, the catalogue says what is *there*.

| Contract | References `retired_at` | Reading |
|---|---|---|
| `get_role_templates` | **yes** | RD-A's picker filter is deployed |
| `admin_retire_role_template` | **yes** | the retire door is deployed |
| `create_group_role` | **no** | **Finding 2 confirmed** — the write door does not know about retirement |
| `create_engagement_group` | **no** | **Finding 5 half-one confirmed** — neither instantiation branch filters |

No contract references publications, confirming Finding 1's greenfield read at the catalogue level too.

**What this does and does not settle.** It settles that the *predicate is absent* from the deployed contracts — the premise both FEAT-PC028 STORY-3 and STORY-7 rest on. It does **not** settle reachability: STORY-3's red cell must still drive an actual retired-template adoption to completion, because a refusal could come from somewhere other than this function body (a trigger, a grant, a downstream check). The spec's prove-it-red-first instruction stands unchanged — this narrows what the red cell is likely to show, it does not replace it.
