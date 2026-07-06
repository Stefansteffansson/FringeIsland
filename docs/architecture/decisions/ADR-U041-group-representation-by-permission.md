# ADR-U041: Acting as a group is a permission; representatives are always people

**Status:** Accepted
**Date:** 2026-07-06
**Deciders:** Stefan (design session 2026-07-06, run against the prepared decision board `docs/planning/sessions/openers/group-as-actor-decision-board.md`, authored 2026-07-05 from canonical reads)
**Tags:** scope:platform-core · product · wave:ferd

> Architecture Decision Record (MADR-style). Captures *one* decision and *why* it was taken at a moment in time. ADRs are append-only — when a decision changes, add a new ADR that supersedes the old one. Never edit history.

---

## Context and problem statement

All memberships are group-to-group: a personal group joins an engagement group, and an engagement group can itself join another engagement group (the universal group pattern, ADR-U006/U007). When engagement group A is a member of group B, A holds roles in B — but a group has no hands. Someone must exercise A's agency in B: enroll A, post as A, accept on A's behalf.

**How should representation of a group be governed — which people inside A may act as A inside B — and how do system members (DeusEx) behave in member-facing surfaces?**

The wielding question was parked by FEAT-PC011 Open Q1; FEAT-H014 shipped the act-as selector honestly v1 (one context, "Myself") so G-F could extend a real control. Live testing on 2026-07-05 added two riders via FEAT-H017: after a real decline-to-DeusEx fallback, DeusEx sat in the nominate pick-list as an eligible successor, and no surface could distinguish it from a human member (the payload carries no system-member flag; name checks are barred by house rule).

## Decision drivers

- **ADR-U028 rails:** one permission mechanism (the group + role + permission walk); membership is the *container*, the role's permission set is the *authority*; gates key off permission keys or typed columns, never role/group names; the acting principal is an acting group id.
- **D5 / OQ-6:** MEM-10 ships depth-1; transitive resolution beyond depth 1 (Hub SPECIFICATION OQ-6) stays open. This decision must not smuggle depth back in.
- **The legacy oracle:** v1 had group-as-actor (group enroll by Steward) and group-keyed attribution (`sender_group_id` / `author_group_id`) that v2 preserves byte-for-byte.
- **Honest surfaces:** no affordance a contract will refuse; no hidden actors (the G-E live-testing fixes).
- **Asymmetric regret:** granting more later is additive; revoking shipped reach is breaking. Prefer the tight default.

## Considered options

- **Option A** — Representation is a dedicated catalog permission (`act_as_group`) held within the acting group, granted through roles; Steward template carries it by default.
- **Option B** — Reuse an existing catalog key (e.g. `assign_roles`) as the representation gate.
- **Option C** — Every active member of A may act as A automatically.
- **Option D** — Per-target delegation (A designates who represents it in B specifically, per B).
- **Option E** — Transitive membership: members of A are treated as effective members of B themselves.

## Decision outcome

**Chosen option:** Option A, because it is the only option that simultaneously satisfies every ADR-U028 rail (key-not-role, authority-not-membership, single mechanism), matches the legacy oracle, and leaves loosening as a per-group configuration rather than a platform migration.

The full decision is five clauses:

1. **Representation is a permission.** A new catalog permission, **`act_as_group`**, held *within* the acting group and granted through its roles like any other key. Seeded into the Steward role template by default; any group may grant it to further roles (or all of them) for itself. Whether a member may wield A is exactly `has_permission(member, A, 'act_as_group')`.
2. **Wielding semantics.** (a) *Substitution:* while acting as A in B, the actor's effective permission set is A's effective set in B — the wielder's personal standing in B does not mix in. (b) *Attribution:* acts are authored as A (`sender_group_id` / `author_group_id` = A, preserving the four-hop spine); the wielding human is recorded at the audit/observability layer only, never surfaced as authorship. (c) *Outward only:* wielding grants nothing new inside A itself. (d) **No chaining — the wielding actor is always a personal group.** A group cannot be appointed another group's representative; if B wants a specific person's voice, B admits that person and grants the key there. Representation is always a direct, explicit, human-level appointment.
3. **Depth unchanged.** D5 stands: depth-1 only. The wielding rule is worded depth-agnostically ("a member of A holding the key in A may act as A wherever A is a member") so it composes if OQ-6 ever lands transitive resolution — which this ADR neither builds nor advances. With clause 2d, both resolution depth and representation depth are 1.
4. **System groups are not nominatable.** Stewardship-successor eligibility excludes members with `group_type = 'system'` (typed column, never a name check). DeusEx is the designed last resort (ADR-U019); the all-decline path reaches FringeIsland stewardship honestly and needs no pickable shortcut. A deliberate "hand this group to FringeIsland" affordance, if ever wanted, is its own future decision.
5. **System members are visible but never treated as people.** Contract payloads gain a typed system-member marker (derived from `groups.group_type = 'system'`). Surfaces then: exclude system members from successor pick-lists (clause 4); *show* them in member lists with an honest badge rather than hide a sitting Steward; and key affordance-driving counts (e.g. Close renders for the last member) on the **non-system** member count, so a lone human sharing a group with the caretaker can still close it. Substrate refusal guards are unchanged.

### Consequences

- **Positive:** one mechanism throughout — the representation gate, the successor exclusion, and the system-member marker are all ordinary keys/typed columns; the whole model states in one sentence ("groups act through people the group has empowered, one hop, honestly labelled"); future loosening (wider default seeding, chained wielding, transitive depth) is additive.
- **Negative:** a group cannot lend its voice to a sub-group's people without admitting them personally (accepted deliberately — clause 2d); the catalog grows by one key with a template seed, the eligibility predicate changes, and payloads extend — all schema-gate items for the G-F platform half; the Close affordance needs the non-system count wired before it behaves per clause 5.
- **Neutral:** the FEAT-H014 act-as selector simply grows contexts (every group where the actor holds `act_as_group`) — it was built to be extended, not replaced.

## Pros and cons of each option

### Option A — dedicated permission key (chosen)
- Pros: satisfies every U028 rail; oracle-compatible (Steward default); per-group configurable; additive evolution path.
- Cons: one more catalog key; Stewards of permissive groups must grant it wider themselves.

### Option B — reuse an existing key
- Pros: no catalog change.
- Cons: overloads a key's single honest meaning — the same discipline that made the transfer-affordance fix (`assign_roles`) work.

### Option C — every member wields
- Pros: zero admin; simplest to state.
- Cons: membership-as-authority — the exact pattern ADR-U028's amendment condemns (`is_platform_admin` deviation); lateral escalation (an Observer in A gains A's Steward powers in B — group-stewards-group is a live pattern); revoking later is breaking.

### Option D — per-target delegation
- Pros: richest real-world fidelity.
- Cons: new tables/flows nothing yet demands; can layer on Option A later without conflict.

### Option E — transitive membership
- Pros: matches one intuitive reading of "joining."
- Cons: not representation at all — it is depth>1 resolution (OQ-6), explicitly deferred by D5; touches the RLS visibility floor, counts, and cycle prevention. Out of scope by prior decision.

## Links

- Decision board (prep + per-claim citations): `docs/planning/sessions/openers/group-as-actor-decision-board.md`
- Open question resolved: FEAT-PC011 Open Q1 (`docs/platform/core/features/FEAT-PC011-group-role-and-permission-contracts.md`)
- Riders resolved: FEAT-H017 §Open questions (DeusEx nominatability, system members); nominee predicate in FEAT-PC014
- Surface seam: FEAT-H014 act-as selector (honest v1 shell)
- Rails: ADR-U006/U007 (universal group pattern), ADR-U028 (governance by scope, incl. the 2026-06-12 amendment), ADR-U019 (DeusEx authority of last resort)
- Deliberately untouched: OQ-6 — transitive group-of-groups resolution beyond depth 1 (`docs/products/hub/SPECIFICATION.md` §L2 §8; routed via G-29 as provenance only)
