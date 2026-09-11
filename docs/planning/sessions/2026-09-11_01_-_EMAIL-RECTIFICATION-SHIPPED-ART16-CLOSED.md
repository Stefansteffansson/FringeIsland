# Session bridge — email rectification shipped; the Art. 16 gap closed

**Date:** 2026-09-11
**Started from:** a question — "Today I don't see a way to update a user's email address. Can you investigate if this is true?"
**Ended at:** the capability live on production, both specs `6-done`, and the Privacy vertical's rectification gap closed.

---

## What happened

The answer to the question was **yes, and worse than suspected**: nobody could change an email address — not an administrator, not the member. The only remedy was hard deletion and re-signup, which destroys the member's groups, journeys and authored content. The platform could not honour a GDPR Art. 16 rectification request at all.

It was a deliberate carve-out, not an oversight. FEAT-PC003 parked `email` as "ADR-gated, separate capabilities" and ADR-U038 tranche 1 revoked the column grant with a comment saying not to restore it. The gate those two set was an ADR; this session wrote it.

Seven PRs, all merged: **#646** gap analysis · **#647** its corrections · **#648** ADR-U054 · **#649** the two specs · **#650** the build (schema gate) · **#651** the journey spec + `6-done` · **#652/#653/#654** the Privacy vertical.

## Decisions Stefan made

| # | Decision | Ruling |
|---|---|---|
| D1 | May an administrator change a login identity at all? | **Yes**, explicitly. D2-D7 delegated to the recommendations. |
| D2 | Is the new address marked confirmed? | Yes — the platform cannot deliver a confirmation mail. |
| D3 | Self-service too? | No. Gated on outbound mail. |
| D4 | Force-logout on change? | Yes — it is a credential event. |
| D5 | Outstanding invitations to the old address? | **Deleted.** Revised mid-analysis from "leave them" once the erasure finding landed. |
| D6 | Into Eid? | A kickoff candidate. |
| D7 | Raise Art. 16 as a Privacy gap? | Yes — now closed. |

Plus the schema gate, unlocked on the named approval "ok merge", and the steering-file carve-out on a second "ok merge".

## What is now true

- `admin_update_user_email(uuid, text, text)` is live on **both** projects. `migration-drift.js`: *files = test = production* at 143. The applied ACL was read on both — `{postgres, authenticated, service_role}`, no PUBLIC, no `anon`.
- **The repository now writes the auth schema.** Migration `20260911100000` is the first; every prior auth-schema access was a DELETE, and nothing had touched `auth.identities`. No conformance gate constrains this class — checked against all ten platform suites — so ADR-U054 is the only thing standing between the capability and an undecided one. Worth remembering the next time someone reaches into `auth.*`.
- FEAT-PC031 and FEAT-H050 are `6-done`. ADM-19 and a new PC-4 capability row exist in the two L3 inventories.
- The Privacy vertical carries Art. 16: the right in §2, partial-and-admin-only tooling in §3, a rectification-shortfall failure mode in §4, two new open questions, one obligation per tier, two checklist items.

## Things worth carrying forward

- **A stale mirror corrupts erasure, not just display.** `erase_fim_account` finds pending invitations by matching the member's *current* mirrored address. A half-done email change would scrub invitations to the old address and leave the new ones as orphaned PII. This is the single strongest argument for the one-transaction write, and it was missed by the first analysis pass.
- **`auth.identities.email` is a generated column** (`lower(identity_data ->> 'email')`), and **`auth.users`' unique index is case-sensitive** while GoTrue normalises in application code. Both were read off the live schema rather than assumed.
- **Refusals in the `admin_*` family are not audited.** The family raises inside the transaction and Postgres discards any audit row written before the raise. The spec says so rather than claiming a trail that would not survive.
- **The `holdOnConflict` lesson.** Holding a ceremony open on a 409 first went into the shared `mutate` helper and silently changed suspend/reactivate, failing a sibling test. The sibling was **not** adapted — the behaviour was scoped to the new ceremony. A shared helper is a shared contract.
- **Two claims were asserted without checking and then corrected in public** — the `account` notification category's size, and whether PROCESS.md's DoD needed a new line (it did not; it delegates to §7 by reference). Both corrections are in the record rather than quietly dropped.

## Open, and deliberately not done

- **Self-service rectification** — §5 Q8 of the Privacy vertical. Gated on the same Supabase plan decision as leaked-password protection.
- **A notice to the OLD address** — the natural preventive control against an administrator redirecting an account. Unavailable; ADR-U054 names it as an accepted limitation, not a solved problem.
- **Rectification against AI-derived state** — §5 Q9, the Art. 16 twin of the existing erasure question.
- The Eid kickoff itself has still not run. This work was a candidate raised into its plan §2b, not a replacement for it.
