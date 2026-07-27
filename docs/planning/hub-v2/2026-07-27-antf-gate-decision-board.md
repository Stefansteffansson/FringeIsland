# A-NTF gate — decision board

> **SETTLED 2026-07-27 (Stefan).** All three adopted as recommended: **GB-1 = Both** (dispatcher guard + source guard) · **GB-2 = DS-5 owns channel adapters, PC-1 owns transport substrate** · **GB-3 = split asks from news, asks non-suppressible**, with the W-04 pointer riding along.
>
> **One finding arrived during implementation and widens GB-3.** The board framed W-09 as a `membership` problem. It is not confined there: **there are three asks across two categories** — `invitation_received` (910 rows, `membership`, no `action_type`), `acting_invitation` (36 rows, `membership`, actionable), and **`stewardship_nomination` (802 rows, `stewardship`, actionable)**. The last is the *largest* ask population in the system and W-09 never named it, yet muting *"Stewardship & leadership transfer"* strands a leadership nomination exactly as muting *"Group membership & invitations"* strands an acting invitation. The ruled principle — *questions that only you can answer always reach you* — does not depend on which category an ask happens to sit in, so all three move. This also re-confirms why the surgical `action_type IS NOT NULL` exemption was rejected: `invitation_received`, the largest membership ask, carries none.

**Date:** 2026-07-27 · **Status:** SETTLED (was: OPEN, presented whole)
**Why one board:** these three interlock. NB-8's disposition and the W-09 split both touch the dispatcher; W-04 and W-09 must move together or the letter reaches the member and still goes nowhere.

Settled by canon, recorded not asked: ADR-U040 (no platform email to strangers) · ADR-U048 (delivery/routing split) · ADR-U038 (contracts live below the Platform API, never solely in a BFF route) · W-09's *rule* is already ruled — **asks are not news**; the surgical `action_type IS NOT NULL` exemption was considered and **rejected**, because `invitation_received` carries no `action_type` and that is the common case.

---

## GB-1 — NB-8's disposition (NEW — the proof refuted its own premise)

**What changed today.** The [NB-8 proof](./2026-07-27-antf-nb8-mist-posture-proof.md) was run and **the rule it was meant to confirm is false**. Every Mist holds one durable `role_assigned` row from its own personal-group bootstrap; it can read, mark-read and export that row; only the preference doors refuse it (`28000`). The realtime hint also fires for Mists, contradicting `FEAT-PD015:59` and the trigger's own comment. Not a leak — the row is about the Mist itself and cascades away on erase — but V3 forbids durable Mist state outright, and 1516 FIMs carry the same meaningless row.

| Option | What it does | Cost |
|---|---|---|
| **A — silence the self-assignment at source** | Guard `notify_role_assigned()` to skip when the assignment is a personal group giving itself a role. Kills the Mist row *and* removes the noise from every new member's inbox | one trigger guard; schema gate |
| **B — exclude Mists at the dispatcher** | Extend `ds5_apply_notification_preference()` (the `BEFORE INSERT` trigger) to drop any row whose recipient resolves to `is_temporary = true`. Makes the V3 rule true **by construction**, for all ~38 writers and every future one | one predicate; schema gate |
| **C — both (RECOMMENDED)** | B gives the structural guarantee NB-8 actually asked for; A removes 1516 rows of noise nobody wants. They fix different things and neither subsumes the other | both of the above, one migration |
| **D — amend the rule instead** | Accept bootstrap-only self-rows that cascade away; correct V3, PD015 and the comment to describe what is true | docs only; leaves the read/preference asymmetry standing |

**Recommendation: C.** B is what "structurally excludes" means and makes the spec honest by construction; A fixes a defect that predates this area and reaches every member. Under C the spec corrections still land — but they record a rule that is now enforced, rather than one the code merely hopes for.

**Note whichever way this goes:** `FEAT-PD015:59`'s *rationale* ("no topic resolves for them") is wrong regardless and must be reworded — under C the true reason becomes "no row is written", not "no topic resolves".

---

## GB-2 — U049 §8 Q1, the adapter-ownership residue

**The question** (`communication.md:97`): ADR-U049 fixed the *seam* — recipients are resolved exactly once by the DS-5 routing contract at send-time and materialized as V3 delivery rows; any outward channel consumes those rows downstream and never re-resolves. **The residue:** are channel adapters DS-5-owned code, or PC-1/vertical plumbing?

**Two facts that were not available when the question was parked:**

1. **The anchor is gone.** The question's own anchor — *"outward email delivery realized once, open-coded per-feature (`app/api/invitations/send-email`)"* — lives **only in `hub-legacy/`**, the frozen v1 oracle awaiting Phase-4 deletion. Hub v2 has no `lib/email/`, no send-email route, and no email vendor dependency. The lean was anchored to an artifact that is not in the app being built.
2. **ADR-U038 now constrains the answer.** A surface `app/api/*` route is a private BFF and may never be the sole home of a rule; platform contracts live below the Platform API. The open-coded route was exactly the shape U038 forbids, so it cannot be the precedent.

| Option | Shape |
|---|---|
| **A (RECOMMENDED)** | **DS-5 owns channel adapters as contracts below the Platform API; PC-1 owns transport substrate.** The cold lean, now backed by U038 rather than by an anchor that has been retired. Adapters consume delivery rows; PC-1 supplies the wire |
| **B** | PC-1 owns adapters *and* transport. Simpler wire, but routing knowledge leaks into Core and points Core → Domain, which `docs/platform/CLAUDE.md:38` forbids |
| **C** | Vertical-owned plumbing. Contradicts ADR-U002's "the vertical levies, DS-5 routes" and would make V3 a code owner, which no vertical is |

**Recommendation: A** — and record it as **resolved-in-principle, unrealized**: nothing outward ships in Ferd (GB-3 / NB-2), so this fixes the shape without building to it.

---

## GB-3 — the DS-5 spec advance, carrying W-09 and W-04

**The email deferral** is recorded as part of this advance and needs no decision — ADR-U040 + NB-2 already settled it. Drafted separately; it records that Ferd ships in-app only, email needs its own ADR, and the substrate V3 §3 describes lives in the frozen oracle, not Hub v2.

### W-09 — the split, given the rule is already ruled

The rule: *notices about your own account and access always reach you — and so do questions that only you can answer.* Today `membership` conflates both: `invitation_received, acting_invitation, invitation_accepted, invitation_declined, member_left, member_removed, role_assigned, role_removed`. One switch silences the lot, including the only surface that can answer an acting invitation.

| Option | Shape |
|---|---|
| **A (RECOMMENDED)** | **Split the category in two along asks-versus-news, and mark the asks category `member_suppressible = false`.** Uses machinery that already exists — preferences are per-category, and `member_suppressible` is already the "may a member mute this" axis. News keeps its switch; asks always arrive, which is exactly what was ruled |
| **B** | Split into two categories, both suppressible. Gives a member two switches but still lets them mute the asks — the ruled rule says asks always reach you, so this does not implement it |
| **C** | Keep one category, mark individual *kinds* non-suppressible. Needs a new per-kind axis the schema does not have, and leaves the member's one switch lying about what it covers |

**Also in A:** the label *"Group membership & invitations"* should **name the telling, not the thing** — it is a notification preference, not a membership setting.

### W-04 — the pointer, which must ship with W-09

If asks always reach the member (W-09), the letter still has to lead somewhere. Today `invitation_received` arrives with no chip, no buttons and no direction to MyInvitations, where it is actually answered.

**Cheapest remediation, and the recommendation:** give `invitation_received` rows a **navigation target** to their answering surface. Note this is impossible from the surface side — copy is server-authored and never re-worded (W-03's copy law) — so it belongs **at emit time or in the row's navigation target**, not in the component.

**Why together:** W-09 alone guarantees the invitation arrives; W-04 alone gives it somewhere to go. Either alone leaves a member holding a letter they cannot act on.

---

## What each decision unblocks

| Decision | Unblocks |
|---|---|
| GB-1 | NB-8 tickable; `FEAT-PD015:59` + V3 risk-register corrections; the last gate item that is a *build* |
| GB-2 | `communication.md` §8 Q1 closes; the DS-5 exit-checklist line "§8 Q1 seam dispositioned" |
| GB-3 | the DS-5 spec advance; W-09 + W-04 leave the follow-up list; the email-deferral checklist line |

**Not on this board, deliberately:** the 937 ms warm ceiling-hugger (needs a deployed environment and an enforced idle window), the task sweep (deletion is a fuller-auto carve-out), and W-03 / W-07 (logged, not blocking).
