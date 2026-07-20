# ADR-U049: Announcements are a durable DS-5 home routed onto the V3 delivery substrate

**Status:** Accepted (ratified 2026-07-20, Stefan — "go with recommendations" on the C-D design board, AD-1..AD-7)
**Date:** 2026-07-20
**Deciders:** Stefan (ratification) + Claude (C-D design session, per the phase-3 plan's planned session and board item CB-2)
**Tags:** scope:domain-service · scope:vertical · wave:ferd

> Architecture Decision Record (MADR-style). Captures *one* decision and *why* it was taken at a moment in time. ADRs are append-only — when a decision changes, add a new ADR that supersedes the old one. Never edit history.

---

## Context and problem statement

A-COM Cycle C-D builds COM-8 (Steward announcement, 1→many, community-scoped) and COM-9 (platform-admin announcement, 1→all, universe-scoped). Announcements have **no substrate today** — no table, no shape (substrate audit 2026-07-19); these are the area's first genuinely new tables. ADR-U048 fixed the layering they must land on: `public.notifications` and its delivery mechanics are the Notifications-vertical **delivery substrate** (any tier writes it as obligation-fulfilment); DS-5 owns the **routing layer above** — deciding recipients and fanning out. What U048 did not fix is the announcement shape itself: does an announcement live as a durable row that delivery points at, or only as its fanned-out delivery rows (the `admin_send_notification` precedent generalized)? And is recipient membership resolved when the announcement is sent, or when it is read?

DS-5 §8 Q1 (outward delivery shape) is adjacent: wherever email/push eventually sit, the recipient-resolution point decided here constrains them.

## Decision drivers

- **ADR-U048's layering:** routing (DS-5) decides *who*; delivery rows record the routed result; the substrate below does not own semantics.
- **ADR-U039 / C-C's proven posture:** tables are the truth; pointers and signals are cheap and non-authoritative; a missed signal costs a badge, never the content.
- **ADR-U028 governance by scope:** community-scoped and universe-scoped announcing are different governance acts and must be impossible to confuse — by construction, not by convention.
- **The CB-7 precedent:** one registry with data-driven kinds (conversation `dm`/`group`) beat parallel tables for one shape.
- **A-NTF is next:** the bell tenant (`account:<auth_uid>:notifications`) will badge off delivery rows; D4 (outbound email) lands there. C-D must hand A-NTF a seam, not a rework.
- **Late joiners exist:** members join groups (and the platform) after an announcement is sent; a standing announcement that new members can never see is a broken bulletin board.

## Considered options

- **Option A — Durable home + routed delivery (split resolution).** One DS-5-owned `announcements` table (the authority); per-recipient V3 delivery rows fanned out at send. *Visibility is read-time* (RLS against current scope membership — late joiners see standing announcements); *delivery is send-time* (recipients-at-send get the unread pointer; `is_read`/`read_at` live on the delivery row as they already do).
- **Option B — Pure fan-out.** No home; an announcement *is* its N `notifications` rows (the `admin_send_notification` shape generalized to 1→all).
- **Option C — Durable home only.** No delivery rows; visibility and unread state both resolved at read-time against the home.

## Decision outcome

**Chosen option: Option A** (Stefan, 2026-07-20), because it is the U048 split made concrete — DS-5 routes once at send-time and materializes the result as delivery rows; the durable home answers read-time truth — and because it repeats C-C's proven asymmetry: losing a pointer costs a badge, never the announcement.

### The ruling

1. **One durable home, DS-5-owned:** `public.announcements` — one row per announcement (author group, scope, title, body, timestamps). It joins `DS_TABLES` and its contracts join `DS_OWNED_ALLOWLIST` at the same migration (the conformance-gate rider pattern).
2. **One substrate, two contracts (U028 by construction):** a single table with a scope discriminator — `scope_kind IN ('community','platform')`, `scope_group_id` NOT NULL exactly when community (CHECK-enforced) — but **two separate send contracts with distinct gates**: the Steward contract takes a group and is gated at community grain; the platform contract takes no group and is gated at universe grain. A community contract cannot write platform scope by construction; no single RPC branches on caller privilege.
3. **Recipient resolution splits by layer:** *visibility read-time* — the home row is readable via RLS by current members of its scope (active membership of `scope_group_id` for community; FIM status for platform, per CB-1's Ferd posture), so late joiners see standing announcements; *delivery send-time* — the send contract fans out one V3 delivery row per recipient-at-send (obligation-fulfilment writes per U048), carrying `payload.announcement_id` as a pointer. Read/unread state lives on the delivery row, where it already lives.
4. **Content immutable; retract-only lifecycle:** announcements cannot be edited (COM-12's window stays forum-only, per CB-3). A same-gate retract contract sets `retracted_at`; the read path excludes retracted rows; already-fanned delivery rows are left in place and resolve to nothing when the surface re-checks the home — the hint-not-authority pattern applied to delivery pointers.
5. **The outward seam is the delivery row (partial resolution of DS-5 §8 Q1):** recipients are resolved exactly once, by the DS-5 routing contract at send-time. Any outward channel (email, push — A-NTF, D4) consumes delivery rows downstream and never re-resolves recipients. Q1's residue — whether channel adapters are DS-5-owned code or PC-1/vertical plumbing — stays open and resolves at the Notifications vertical's obligation-inventory derivation, as Q1 already names.

### Consequences

- **Positive:** A-NTF inherits a clean seam (bell badges off delivery rows; email consumes them); CB-2 closes firmed; §8 Q1 narrows to adapter ownership; the announcements surface gets history and late-joiner correctness for free; governance-by-scope is structural.
- **Negative:** platform 1→all fan-out writes O(members) delivery rows synchronously in the send contract — acceptable at Ferd scale; if scale ever demands an async outbox, that is the delivery-mechanics evolution U048 already names as its own superseding-ADR trigger, recorded here and not built.
- **Neutral:** `admin_send_notification` (1→selected, no home) remains untouched as vertical delivery mechanics per U048 "and kin"; B-ADMIN-011 stays a valid oracle for it; COM-9 is a different capability with fresh tests. The DS-5 spec's §8 Q1 gains a partial-resolution annotation in the same batch that records this ADR.

## Pros and cons of the options

### Option A — durable home + routed delivery (chosen)
- Pros: U048 layering made concrete; late-joiner correctness; retraction possible; single authority for content; A-NTF seam ready; C-C's tables-are-truth asymmetry repeated.
- Cons: two structures for one capability (home + pointers); O(members) fan-out on 1→all (accepted, bounded, named).

### Option B — pure fan-out
- Pros: zero new tables; matches the existing admin RPC shape.
- Cons: no authority row — no history surface, no retraction, no late-joiner visibility; content duplicated N times; 1→all becomes unbounded content duplication; nothing for DS-5 to own (the routing layer would route into nothing durable).

### Option C — home only
- Pros: minimal writes; simplest schema.
- Cons: no per-recipient unread state without inventing a receipts structure the V3 substrate already provides; the A-NTF bell has nothing to badge off; refuses the delivery substrate U048 just established.

## Links

- ADR-U048 (delivery/routing split — the layering this realises), ADR-U039 (hint-not-authority posture), ADR-U028 (governance by scope), ADR-U002 (verticals as obligations)
- Plan: [phase-3-communication-completion-plan](../../planning/hub-v2/phase-3-communication-completion-plan.md) — CB-2 (firmed here), the C-D row, the planned design session
- DS-5 spec: [communication.md](../../platform/domain/communication.md) §8 Q1 (partially resolved here)
- Precedents in code: `admin_send_notification` (`20260223164813` — the 1→selected delivery-substrate write this does **not** replace); `notifications` RLS own-rows policies (`20260222000000` §1831-1842); `is_active_group_member` (the C-C-proven membership helper for community-scope RLS)
