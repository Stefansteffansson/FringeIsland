# Session bridge — 2026-08-18: PD019 tranche 2 pulled, four rulings, built, held at the gate

**Continuation of the `2026-08-16_03` bridge** (acting pair closed, no 4-ready features left). Stefan aimed the session at PD019 tranche 2 (group conversations); it went pull → board → build in one pass.

## The pull (L4) — STORY-4 firmed on a verified mechanism walk

The walk probed the **applied** substrate, not migration text, and pinned the facts the board needed: participation is the wall (explicit `conversation_participants` rows, personal groups at every insert site); `send_message` gates on participation only — no content permission exists below create; **membership loss never clears participant rows** (a departed person keeps speaking today); **the hint emitter skips account-less participants by construction** (a group participant emits nothing, errors nothing); no constraint restricts participants to personal groups; FKs dispose cleanly (`CASCADE` / `SET NULL` → 'Unknown').

## The four rulings (Stefan, 2026-08-18 — industry-lens walk, recorded in STORY-4)

1. **Scope: all six contracts** (list + create included — the list is the surface's door; create gates on `create_group_conversations`).
2. **Shared group read-clock** — A participates as itself, one `last_read_at`; one representative's read marks it read for the group (the shared-inbox norm).
3. **Standing per act** — every wielded act re-runs the two-limb gate, forum-consistent (organizational actors are re-authorized per action everywhere); persons keep their family's looser participation-wall semantics.
4. **Hint silence v1** — emitter untouched; the standard-shaped future rider is a **topic-scoped channel** (an ADR-U039 §4 amendment), never role-wide emitter fan-out. An open wielded thread still slow-reconciles via the visible-tab poll.

## The build (PR #556 — HELD, not merged)

**Migration `20260818120000`**: the shared gate **widens, not forks** (`p_permission_name DEFAULT NULL` skips limb 2b; five of six contracts pass NULL — membership is the bar, which limb 2a checks); six DROP + CREATE re-issues with trailing `p_acting` (bodies copied from applied definitions; ACLs re-stated; DO-block verification); A seats as its own participant; wielded sends stamp `sender_group_id = A`; **DMs refuse structurally** (NULL context fails limb 2a — no special-case code); PC026 admin arm personal-path-only.

**Evidence:** red-first **12 red / 1 labelled guard** (all reds PGRST202) → **13/13**, including the standing-per-act cell (all four wielded acts refuse after A's removal while its participant row verifiably survives) and the shared-clock cell; communication slice **10 suites 146/146**; conformance **30/30**; sibling sweep 14 files, all personal-path, all deliberately left; lint 0 errors (+ a rider fixing an unused binding in `wielded-forum.spec.ts` shipped with #554). Dev DB: applied **and** recorded in the migration log (repair succeeded in-session).

## Open items for the next session

1. **PR #556 waits for the gate** — named approval required; reviewer checklist in the PR body. Nothing outstanding on the dev DB.
2. **The Hub half for conversations** — affordances are specified at their own pull (the H046 pattern: wielded list/join/detail/send surfaces, the shared-clock render under the substitution banner, no DM affordances). Carry: `is_me` stays personal in the detail payload — the surface highlights the acting row by `participant_group_id`.
3. **Tranche 3 (announcements, STORY-5)** stays unpulled — must walk the PD020 interplay (a group-authored announcement's fan-out must not re-create dead letters).
4. **Carried, still open:** PD020's prod-apply NOTICE; wave assignment for PD019/PD020/H046; the ADR-U039 §4 topic-scoped-channel rider (recorded, not scheduled).
5. doc-health-check: deliberately skipped — no renames/deletions/restructures; spec/task changes ride PR #556.
