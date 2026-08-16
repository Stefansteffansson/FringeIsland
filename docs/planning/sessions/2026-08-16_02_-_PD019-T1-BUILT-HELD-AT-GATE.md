# Session bridge — 2026-08-16 (second session): FEAT-PD019 tranche 1 built, held at the schema gate

**Continuation of the `2026-08-16_01` bridge**, which named the last 4-ready pair as the next work: FEAT-PD019 tranche 1 (platform half first), then FEAT-H046. This session built the platform half end-to-end and holds it at the gate.

## What shipped (PR #551 — HELD, not merged)

**Migration `20260816120000`** (TASK-PD019-1, branch `feat/pd019-t1-wielded-forum-platform`):

- `get_group_forum` / `create_forum_post` / `reply_to_forum_post` gain `p_acting uuid DEFAULT NULL` — **DROP + CREATE** (signature change; the `20260706150000` overload lesson), bodies copied from the **applied** definitions (probed, not the migration text), ACLs re-stated from the applied objects (they carry `service_role` beyond what the C-B migration text shows).
- New shared internal helper **`ds5_assert_wielded_content_gate`** — the ADR-U041 two-limb gate; refusals 42501 naming the failing limb; client-sealed; manifest-registered DS-5. Tranches 2/3 reuse it as-is.
- The **attribution ladder widens** (rebased verbatim on DM-02's `20260815190000` body): engagement groups are resolvable identities; resolvable returns gain additive `kind: 'person' | 'group'`; rung-3 'Unknown' stays byte-identical (no kind claimed).
- Wielded writes stamp `author_group_id = the acting group`; `assert_group_writable` runs with the acting group as subject (pure substitution — its own `rest_group` standing governs).

**Evidence:** red-first **13 red / 2 labelled guards** (10 `p_acting` cells PGRST202 signature-absent; 3 ladder cells red on the personal-only gate) → `wielded-forum-contracts.test.ts` **15/15**; communication slice **9 suites 133/133**; platform conformance **6 suites 30/30** (function-classification + anon-execute-lockdown included); lint 0 errors. Sibling sweep named in the migration header: `forum-contracts.test.ts:443`/`:449` adapted (rung-2 objects gain `kind: 'person'`); `:513` + `member-erasure-disposition.test.ts:337` deliberately left (rung-3 guards).

## The plain-English walkthrough (walked against the shipped behaviour)

I hold the representative's hat (`act_as_group`) in group A; A belongs to community B; I am not a member of B myself. Before today the hat showed me A's powers in B and opened nothing. Now: I open B's forum **as A** and see what A can see — the same payload a member sees, key for key. I post, and the row is signed **A**, not me; everyone reading sees A's name with `kind: 'group'` so surfaces can badge representation honestly. If A later leaves B, its old posts read **'Former member'** exactly as a departed person's do; if A is ever hard-deleted, its authorship folds to **'Unknown'** by construction (`author_group_id ON DELETE SET NULL` — probed this session). If I lack the hat, or A has no standing in B, or A's role there lacks the forum permission, I get a 42501 naming exactly which limb failed — and learn nothing else. A Mist gets refused before any of that. Who wore the hat lives in the platform audit path only — the content row carries the group.

What still doesn't happen, on purpose: no one can **edit** a wielded post (v1 posture, found at build — `edit_own_forum_post` matches personal groups only; recorded in the spec for H046's composer); group conversations and announcements stay person-only until tranches 2/3 are pulled; nothing changed for anyone not wearing a hat (guards + slice prove byte-identity).

## Open items for the next session

1. **PR #551 waits for the gate**: named approval required (schema/RLS carve-out). Reviewer checklist is in the PR body. Outstanding alongside the merge: `bash supabase-cli.sh migration repair --status applied 20260816120000` (classifier-denied this session; **the schema itself is applied to dev** and all suites ran against it).
2. **FEAT-H046 (the Hub half)** is next after the gate: banners, composer confirm naming the wielding, Group badges on `kind`, STORY-4's hat-staleness loop through PD020's delivery. Carry into it: no edit affordance on `kind: 'group'` posts (the v1 posture above).
3. **Tranches 2/3 of PD019** (conversations, announcements) unpulled; maturity stays `5-in-cycle`. Firm G/W/T at pull; tranche 3 must walk the PD020 interplay.
4. **Carried from the previous bridge, still open**: PD020's prod-apply NOTICE (6 dead letters' re-address counts — glance at the deploy output); wave assignment for PD019/PD020/H046 (wave-planning's call).
5. doc-health-check: deliberately skipped again — no renames/deletions/restructures; doc changes ride PR #551.
6. Environment note: dev DB carries the PD019 trigger-less function re-issues (three new arities + the gate helper + widened ladder). A DB reset re-runs migrations, **but until #551 merges the migration file exists only on the branch** — if a reset happens before the merge, re-apply `20260816120000` manually. The `migration list` log does NOT yet record it (see item 1).
