# Roles — the canonical role taxonomy

**Status:** Canonical. Ratified in reconciliation Session B (2026-06-10) from the universe-discovery
work (S16, S29-30, S39, S44, S46 and the 2026-06-05 product locks), sharpened through the Session A
unified role model and three calls settled at ratification: (a) the per-group role is renamed
**Participant**; (b) **DeusEx is a human root-admin group**, not a mechanism; (c) the stale
alternative names are **fully retired**.
**This file is the spine.** Every other document that touches roles references this core; it does
not restate it.

---

## The shape: not a ladder

Older documents flattened four different things into one linear ladder, producing three
incompatible "ladders" across the repo. There is no ladder. There is **an identity state plus
three layers**, and a person holds positions in several at once:

```
L0  Identity state      Shadow --(transcendence)--> FIM
L1  FIM modes           experiential | authorial (Dreamineer) | support roles within groups
L2  Enterprise plane    Universeers | the Council | DeusEx          (surface: the Console)
```

**One system, two faces:** every role below is a set of permissions granted via groups (the
universal group pattern, ADR-U006/U007, `has_permission`). Fiction names and platform permissions
are the same system seen from two sides (S29).

---

## L0 — Identity states

- **Shadow** — the anonymous entrant. Has their own Whisp and cord from the start (the Whisp is
  universal — it is the inner voice, S39). Near-side only; no ball, so no Beyond and no village.
  Anonymous auth; their own data is ephemeral, erased soon after inactivity or explicit close
  (S46). *(Retires the platform term "Visitor".)*
- **FIM** — the base identity: the person with a Whisp, taking their equal place in the Tree.
  "Member" is the platform-technical synonym for FIM and is used for nothing else.
- **Transcendence** — the Shadow -> FIM transition: the persistence-and-consent threshold. What it
  grants is the **ball** (home base, seed-source, anchor-root); session experience transfers
  continuously, and the migration is atomic (S16, S39, S46).

Every participant is a FIM. You cannot build FringeIsland from truly outside it; to create *for*
the world you must be a member *of* it (S29).

## L1 — FIM modes

Stances a FIM occupies toward the universe — permission-gated, several at once, moved between
fluidly. Roles are **modes a person occupies, not kinds of people** (S29).

### Experiential (the default)

The FIM journeying: immersed in the world, Whisp out on the cord.

### Authorial — the Dreamineer umbrella

A Dreamineer is a FIM in their authorial, dream-it-into-being stance (from Disney's Imagineers;
Imagine -> Dream). Not open to every FIM: each specialisation is an authority granted via group
and role permissions, and entering a Studio is a permission check (S29). Four specialisations,
each gating a studio (ADR-U026):

| Specialisation | Studio | Authors | Human scale (S30) |
|---|---|---|---|
| **Creator** | World Studio (hard side) | physical substrate: terrain, water, sky, portals, 3D models | — |
| **Anthropologist** | World Studio (soft side) | cultural substrate: peoples, customs, beliefs, countries | the *typical* (collective) |
| **Teller** | Arc Studio | stories: seasons and episodes; named characters with arcs | the *particular* (story) |
| **Wayfinder** | Journey Studio | journeys: alone / pairs / group | the *personal* (the FIM) |

Scope tiers the gate (S44, ADR-U026): furnishing your own private home — the personal-scope slice
of World Studio — is open to **every FIM**; authoring the shared world is Dreamineer-gated.
(Home-creation as the Dreamineer on-ramp is offered, not locked.)

### Support roles — within a group

A FIM's role *within a given group*; these are the PC-3 / ADR-U007 per-group role templates, not
global tiers:

- **Steward** — leads and cares for a group.
- **Guide** — facilitates a joint journey.
- **Participant** — takes part. *(Ratified rename from the group role "Member", 2026-06-10, so
  that Member remains purely the platform synonym for FIM.)*
- **Observer** — watches.

"Probably many more roles" — the full support family is an open thread (S29).

## L2 — The enterprise-stewardship plane

Genuinely separate from the FIM modes: these roles care for the **continuation of the endeavour**,
not a stance toward the fiction. Ideally also FIMs (not locked, S29).

- **Universeers** — care domains: the constituency across the whole Universe; the ecosystem
  product portfolio; the community; economy; legal.
- **The FringeIsland Council** — major decisions concerning FringeIsland and its connection to
  partners.
- **DeusEx** — the **root-admin group of the running platform** (ratified 2026-06-10): the people
  who administrate and maintain FringeIsland in the eyes of all users — the visible in-platform
  authority. Their permission set includes the authority of last resort (ADR-U019, to be extended
  accordingly). They act within the platform, not outside it; they touch ecosystem development
  only at releases and as a stakeholder, feeding observations of everyday platform life back to
  the developers. **DeusEx is the link between life inside FringeIsland and the development of the
  ecosystem.**
- **The Console** — the back-of-house surface for universe-scoped governance work (working name;
  fiction name deferred). Governance splits by scope: community-scoped care (a Steward moderating
  their own group) stays woven in-place in the FIM experience; universe-scoped governance
  (DeusEx, Universeers) happens on the Console (2026-06-05 product locks).

## Why the old ladders looked inconsistent

The three forms found across older documents span different layers and were never rival tiers:

- `Steward / Guide / Member / Observer` (PC-3 + code) = **L1 per-group templates** — implemented
  correctly, under-explained; the group role "Member" is now Participant.
- `Member / Steward / Dreamineer / DeusEx` = one item from **each layer** stacked (identity +
  group role + mode + platform authority) — reads like a ladder, is not one.
- `Member / Steward / Dreamineer / Council` = the same stack with the Council mis-filed (it is L2,
  not a tier above Dreamineer).

## Retired names

Fully retired from canon (ratified 2026-06-10); where they appear in older material, the
conformance register tracks the correction:

| Retired | Canonical |
|---|---|
| Visitor | **Shadow** |
| Member (as a per-group role) | **Participant** |
| Makers / Weavers / Skalds | retired; the Dreamineer specialisations (Creator, Anthropologist, Teller, Wayfinder) are canonical |
| FringeIsland Studio (planning name) | **World Studio** (ADR-U026) |

## NPCs are not roles

NPCs are authored, layered, depth-on-demand composites — body (Creator) + culture (Anthropologist)
+ character (Teller), layers added in proportion to the depth a role demands (S30). They are
world-inhabitants, not modes a person occupies; they live in `../beings/`.

## Open threads (deferred, tracked in the discovery log)

- How a FIM *acquires* a Dreamineer authority (mechanism is locked: group/role permission; the
  route — earned/granted/applied — is not).
- The full support-role family beyond Steward/Guide/Participant/Observer.
- The internal structure of the Universeers (five care domains: sub-roles, committees, or one
  role?) and the Council's exact relation to them; whether both must be FIMs.
- The naming register: coined names (Dreamineer, Teller, Wayfinder) vs plain titles (Creator,
  Anthropologist).
- The Console's fiction name.

## Statement index

| Section | Source |
|---|---|
| Identity states, transcendence, the ball | S16, S39, S46 |
| Modes-not-castes, permission gating, two planes | S29 |
| Dreamineer specialisations, three human scales, NPC layers | S29, S30 |
| Scope-tiered World Studio access | S44, ADR-U026 |
| Support roles (per-group templates) | S29, PC-3 / ADR-U007 |
| Governance by scope, the Console | 2026-06-05 product locks |
| DeusEx formulation | ADR-U019 + Session B ratification 2026-06-10 |
| Unified model (states / modes / plane) | Session A map, section 3A (ratified with calls a/b/c) |
