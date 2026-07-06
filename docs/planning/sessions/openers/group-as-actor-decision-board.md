# Decision board — group-as-actor (the G-E -> G-F gate)

**Authored:** 2026-07-05, prepared from clean canonical reads per the bridge `_13` docket (`docs/planning/sessions/2026-07-05_13_-_GE-GATES-EXECUTED-LIVE-TESTED-DESIGN-SESSION-TEED-UP.md:21-31`).
**Shape:** interactive design session — Stefan decides. CC presents this board all at once (the house all-at-once discipline), records the calls, then drafts the output — likely an ADR, ADR-U028 territory, per the Groups plan G-F row (`docs/planning/hub-v2/phase-3-groups-completion-plan.md:59`). Precedent: top-level briefs (`mist-reconciliation-brief.md`, `spec-alignment-challenge-brief.md`); no STATUS.md entity row.
**Start prompt:** `Read docs/planning/sessions/openers/group-as-actor-decision-board.md and proceed.`
**Gate:** parked 2026-07-04 by Stefan; decide before any G-F spec is authored (plan `:59` — "Gated on a design session before decomposition"). After the session: G-F decompose + build, or an explicit defer (it floats, value-light — bridge `_13:32`).

Every load-bearing claim below carries its canonical source as `file:line`; all cited lines were disk-verified on 2026-07-05 (delegated-fact discipline).

---

## Why this exists

The substrate already accepts a group as the acting principal — `has_permission()` takes a group as actor (`docs/planning/hub-v2/behaviour-inventory.md:102`), authorship is group-keyed end-to-end (`sender_group_id` / `author_group_id`, the four-hop spine that "v2 must preserve byte-for-byte", `behaviour-inventory.md:171`), and the schema supports group-in-group membership (`docs/products/hub/SPECIFICATION.md:89`). What has never been decided is the **governance rule**: when engagement group A is a member of group B, *which people inside A may act as A inside B*. FEAT-PC011 parked it as Open Q1 (`docs/platform/core/features/FEAT-PC011-group-role-and-permission-contracts.md:134`) and refused to build speculative contract surface for it (`:43`, `:53`); FEAT-H014 shipped the act-as selector "honestly v1" — one real context, "Myself", with copy naming G-F (`docs/products/hub/features/FEAT-H014-group-roles-and-permissions.md:25`, `:81`), built so "G-F extends it rather than replacing a mock" (`:107`). Two riders from the 2026-07-05 live testing join the docket via FEAT-H017 (`docs/products/hub/features/FEAT-H017-leadership-transfer-and-closure.md:139`).

---

## Fixed rails (canon — constraints, not decisions)

These bound every option below; the session works inside them.

- **R1 — Single permission mechanism.** All agency flows through the universal group pattern (group + role + permission walk, ADR-U006/U007); no new permission system, no ad-hoc admin roles (`docs/architecture/decisions/ADR-U028-governance-by-scope.md:41` chosen option; roles core `docs/ecosystem/universe/roles/README.md:86` — support roles are the PC-3 per-group role templates).
- **R2 — Membership is the container; the role's permission set is the authority.** Holding a membership confers nothing by itself (`ADR-U028:105`, the 2026-06-12 amendment).
- **R3 — Permission key, never role name; no name checks.** The house rule that just paid off live (transfer affordance keyed off `assign_roles`, `FEAT-H017:136`); any new gate must be a typed key or typed column, never string-matching a role or group name.
- **R4 — The acting principal is an acting group id.** The rebuilt permission functions expect an acting group id, not a profile id (`ADR-U028:118`); group-as-actor means passing A as that principal.
- **R5 — Roles are person-in-group.** Canon defines Steward/Guide/Participant/Observer as a FIM's role *within a given group* (`roles/README.md:86` context); there is no existing canonical construct for a group wielding another group's agency — creating one is exactly this session's job, and it lands in ADR form.
- **R6 — The legacy oracle.** v1 had group-to-group membership as a canon invariant and group-as-actor enrollment ("group enroll by Steward", `behaviour-inventory.md:102`, `:132`). The oracle is **silent** on any selector/picker UI for choosing which group acts, and silent on who besides the Steward could wield.
- **R7 — Depth is already decided for G-F.** D5: "MEM-10 ships depth-1" (`phase-3-groups-completion-plan.md:77`); the depth>1 question stays open elsewhere (see DB-3).

---

## The board

Legend: **OPEN** — Stefan decides in this session. **DEFAULTING** — recommendation stands unless overridden. **ANSWERED** — already decided; listed so the session doesn't reopen it.

### DB-1 — Who inside A may wield A's agency inside B? [OPEN — the core question]

*Source:* PC011 Open Q1 verbatim: "Who may wield an engagement group's agency (when group A is a member of group B) is unresolved governance — routed to Cycle G-F / G-29; v1 renders the personal-group context only" (`FEAT-PC011:134`).

Options, all inside the rails:

- **O1 — A dedicated catalog permission key in A** (e.g. `act_as_group` / `represent_group`): anyone holding it *in A* may act as A in B. The wielding check is a normal walk — `has_permission(member, A, 'act_as_group')` — then the act itself runs with A as acting principal (R4). Seed the key into the Steward template by default (matches the legacy oracle, R6); groups can grant it via custom roles like any other key. Additive catalog change (44 -> 45 keys) + template seed = schema-gate territory.
- **O2 — Reuse an existing key** (e.g. `assign_roles` or a manage-level key): no catalog change, but overloads a key's meaning — the transfer-affordance fix worked precisely because keys have one honest meaning each.
- **O3 — Any active member of A:** rejected by R2 (membership is the container, not the authority); listed to be dismissed explicitly.
- **O4 — Per-target delegation** (A's Steward designates who represents A in B, per B): richest model, new tables and flows; nothing in the oracle or the G-F scope demands it.

**Recommendation: O1.** It is the only option that is simultaneously key-not-role (R3), authority-not-membership (R2), single-mechanism (R1), and oracle-compatible (R6). O4 can layer on later without conflict if a real need appears.

### DB-2 — What does wielding *mean*? (semantics + attribution) [OPEN — follows DB-1]

Three sub-calls the ADR must word:

1. **Effective permissions while acting as A in B:** recommend **pure substitution** — the actor's effective set is A's effective set in B, nothing of the member's own standing in B mixes in. This is what the substrate signature already computes (`has_permission(p_acting_group_id, ...)`, `behaviour-inventory.md:171`).
2. **Attribution:** artifacts authored while wielding carry A (`sender_group_id` / `author_group_id` = A) — preserving the four-hop spine byte-for-byte is a stated v2 obligation (`behaviour-inventory.md:171`). Recommend additionally recording *which member* wielded, at the audit/observability layer only — never surfaced as authorship (Observability vertical; ADR-U028's scope discipline).
3. **Direction of wielding:** acting-as-A grants reach *outward into B* only; it must not change what the member can do *inside A*. Worth one explicit sentence in the ADR so anti-escalation stays airtight.

**Recommendation:** substitution + group attribution + audit-level human trace + outward-only. All four are one-line ADR clauses.

### DB-3 — Transitive depth beyond 1 [ANSWERED, with one DEFAULTING rider]

**Answered:** D5 — "MEM-10 ships depth-1. Legacy-proven, substrate-supported" (`phase-3-groups-completion-plan.md:77`, MEM-10 row `:45`). The depth>1 question's canonical home is **OQ-6** — "PC-3 transitive group-of-groups resolution beyond depth 1" (`docs/products/hub/SPECIFICATION.md:417`; the §L2 §8 statement at `:158`; consumer-facing note at `:89`). Not reopened here.

**Defaulting rider:** word the DB-1 wielding rule **depth-agnostically** ("a member of A holding the key in A may act as A wherever A is a member") so that when OQ-6 eventually lands transitive resolution, the governance rule composes without amendment. No transitive machinery is built in G-F.

### DB-4 — Is DeusEx nominatable as a stewardship successor? [OPEN — live-testing rider (a)]

*Source:* routed here by `FEAT-H017:139`. Current contract state: nominee eligibility is "distinct active members and not the caller" (`FEAT-PC014-leadership-transfer-and-closure-contracts.md:38`) — after a fallback DeusEx *is* an active member, so today it is **implicitly nominatable**; nothing excludes it. ADR-U019 defines DeusEx as the designed *fallback*: "If the last Steward is removed or leaves, the DeusEx system group becomes the Steward. DeusEx can then reassign Stewardship to restore group autonomy" (`ADR-U019-deusex-authority-last-resort.md:16`).

- **Option A — Not nominatable (recommended):** exclude `group_type = 'system'` members from the eligibility predicate (typed column, `supabase/migrations/20260222000000_rebuild_universal_group_pattern.sql:86-87` — satisfies R3; DeusEx already resolves by system-label + type, never a hardcoded id, `FEAT-PC014:154`). Rationale: nomination-to-DeusEx turns the last resort into a first-class choice and inverts ADR-U019's "restore group autonomy" direction; the all-decline path already reaches FringeIsland stewardship honestly, and the copy now says so (`FEAT-H017:137`).
- **Option B — Nominatable:** gives a Steward a direct "hand to FringeIsland" route without a decline round. If that convenience is wanted, recommend it as a *separate explicit affordance* decided on its own later — not by leaving the eligibility hole open.

**Recommendation: A**, with the Option-B convenience noted as a possible future explicit feature, out of G-F scope.

### DB-5 — System members in member-facing flows generally [OPEN — live-testing rider (b)]

*Source:* `FEAT-H017:139` — DeusEx appears in a Steward's nominate pick-list; "the payload carries no system-member flag, and a name check is out by rule." The member-list payload (`hub/lib/groups/queries.ts:43-56`, `GroupMemberEntry`) confirms: no system marker exists client-side. The oracle is silent on hiding or badging system members (`behaviour-inventory.md` — no rule recorded; A-GRP strength STRONG at `:185`).

Sub-decisions:

1. **Payload prerequisite (defaulting):** extend the contract payloads with a typed system-member marker derived from `groups.group_type = 'system'` (additive payload extension -> schema gate). Without it, no surface can behave differently, whatever is decided below.
2. **Nominate pick-list:** exclude system members — follows automatically if DB-4 lands as Option A.
3. **Member lists:** recommend **show, with an honest badge** (e.g. "FringeIsland") rather than hide — hiding a member that holds Stewardship would contradict the honesty discipline the G-E fixes just reinforced (`FEAT-H017:136-137`).
4. **Counts / last-member semantics:** FEAT-H017's Close affordance renders only for the contract-reported last member; with DeusEx as a co-member, a lone human never sees Close. Decide whether affordance-driving counts mean *non-system* members. Recommend: contract reports both (`member_count`, `non_system_member_count` or the marker per entry); affordances key on the non-system reading; substrate refusal guards stay untouched.

**Recommendation:** 1 + 2 + 3 + 4 as stated — one additive contract change, three surface rules that fall out of it.

### DB-6 — Act-as selector extension shape [DEFAULTING — consequence of DB-1]

When DB-1 lands, the H014 selector's contexts become: "Myself" + every group where the actor holds the wielding key. The v1 shell was explicitly built for this ("a real control with one context so G-F extends it rather than replacing a mock", `FEAT-H014:107`). No decision needed unless Stefan wants different UX; the G-F Hub spec inherits it.

### DB-7 — "G-29" citation hygiene [DEFAULTING — bookkeeping surfaced by this prep]

The bridge `_13:26` describes G-29 as "transitive resolution beyond depth 1"; the Groups plan MEM-10 row writes "depth>1 = G-29" (`phase-3-groups-completion-plan.md:45`). Canonically, **G-29 is neither question**: it is the *lateral-routing mechanism gap* — "Lateral routing for cross-entity findings produced by L3 stress-test passes" (`docs/ecosystem/how-we-work/gaps.md:36`, `:142`). Both the depth question (**OQ-6**, `SPECIFICATION.md:417`) and the wielding question (**PC011 Open Q1**, `FEAT-PC011:134`) are separate findings *routed via* G-29 — so "G-29" alone is ambiguous between them, and the two docs above resolve the ambiguity in opposite directions.

**Defaulting fix (pointer-only, no new canon):** G-F specs and the output ADR cite **OQ-6** for depth and **PC011 Open Q1** for wielding, adding "routed via G-29" only as provenance; the Groups plan's MEM-10 cell gets the same pointer correction when G-F is decomposed. Bridges stay untouched (historical — leave).

---

## Decisions (session run 2026-07-06, in-conversation with Stefan)

All calls made; output recorded as **ADR-U041** (`docs/architecture/decisions/ADR-U041-group-representation-by-permission.md`). Per item:

- **DB-1 — DECIDED: O1.** Representation is a dedicated catalog permission, **`act_as_group`**, held within the acting group and granted through its roles; Steward template carries it by default; each group may widen it for itself (collision-checked: no `act_as` key exists in the catalog). Stefan probed O3 (everyone wields) and the transitive reading; both rejected — O3 as membership-as-authority (the ADR-U028 amendment's condemned pattern) plus lateral escalation, the transitive reading as OQ-6/D5 territory, not representation. "Everyone" remains available per group as a *default-grant configuration*, never a platform law.
- **DB-2 — DECIDED: all four clauses.** Substitution; attribution to the group with an audit-level human trace (never authorship); outward-only; and a fourth clause added during the session from Stefan's A-in-B-in-C question: **no chaining — the wielding actor is always a personal group.** A group cannot be appointed another group's representative; both resolution depth and representation depth are 1.
- **DB-3 — STOOD (answered).** D5 unchanged; wielding rule worded depth-agnostically; OQ-6 untouched.
- **DB-4 — DECIDED: Option A.** System-type groups (`group_type = 'system'`) are not nominatable as stewardship successors; the eligibility predicate excludes them. The "hand to FringeIsland" convenience is noted as a possible future explicit feature, out of G-F scope.
- **DB-5 — DECIDED: bundle as recommended.** Typed system-member marker in payloads (prerequisite); excluded from nominate pick-lists; shown in member lists with an honest badge; affordance-driving counts key on the non-system member count; substrate guards untouched.
- **DB-6 — DEFAULT STOOD.** The H014 selector grows contexts (groups where the actor holds `act_as_group`) when G-F builds.
- **DB-7 — DEFAULT STOOD.** G-F specs and ADR-U041 cite OQ-6 for depth and PC011 Open Q1 for wielding, with "routed via G-29" as provenance only; the Groups plan's MEM-10 cell gets the pointer correction at G-F decomposition.

## Sequencing after the session

1. Record the calls (this file gains a "Decisions" section or the calls go straight into the ADR draft — Stefan's preference).
2. Draft the ADR (ADR-U028 territory; ADR merges are a fuller-auto carve-out — pause for the nod).
3. Then, per bridge `_13:32`: **G-F decompose + build** (or an explicit defer — it floats, value-light), then the **Groups area retro** (task-file cleanup rides it), then the **Journeys area**.

Contract/schema touchpoints if the recommendations stand as-is: one new catalog key + Steward-template seed (DB-1), nominee-eligibility predicate change (DB-4), additive system-member payload marker + count semantics (DB-5) — all schema-gate items for the G-F platform half.
