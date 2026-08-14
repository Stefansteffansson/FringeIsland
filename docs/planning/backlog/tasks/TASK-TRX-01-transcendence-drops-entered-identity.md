---
id: TASK-TRX-01
title: Transcendence drops the entered identity — the FIM keeps the Mist's name and no email
status: done — gate executed 2026-08-14 on named approval ("ok merge 530"); PR #530 merged (migration 20260813204500 applied 2026-08-13; red demonstrated, suite 7/7, Erik's row repaired, ACL verified)
assigned_to: unassigned
priority: high
feature: FEAT-PC002
owner: platform/core (Identity) — finalise_transcendence
wave: ferd
cycle: unscheduled — schema-gated
depends_on: []
estimated_hours: 4
---

# TASK-TRX-01 — transcendence drops the entered identity

**Found:** 2026-08-13, live walk. A Mist enrolling to a journey was routed to `/become-a-fim`, signed up as "Erik Hopper" / erik.hopper@test.com. Transcendence succeeded (`is_temporary=false`, FI-Members enrolment, consent written) — but the profile still reads **Mist**, and `public.users.email` is **NULL**.

## The mechanism, verified against the substrate

The entered identity lives only in `auth.users` after the client-side anon→permanent conversion (`supabase.auth.updateUser({ email, password, data: { display_name } })`, `hub/lib/auth/AuthContext.tsx:184-188`). Nothing carries it into the profile substrate:

- `handle_new_user` stamped `full_name='Mist'`, `nickname='Mist'`, `email=NULL` at anonymous INSERT (`COALESCE(display_name, email, 'Mist')` — both NULL for a Mist) and named the proto personal group `'Mist'` (group name = nickname, step 2). It fires on INSERT only — never again.
- `finalise_transcendence` (live shape: `20260811090000_cor_d_w3_...sql`) flips `is_temporary`, enrols FringeIsland Members, writes consent — and never touches `users.full_name` / `nickname` / `email`, nor `groups.name` of the personal group.

Live evidence (dev DB): auth user `e553e65c-…` has `email='erik.hopper@test.com'`, `raw_user_meta_data.display_name='Erik Hopper'`, `is_anonymous=false`; its `public.users` row has `full_name='Mist'`, `nickname='Mist'`, `email=NULL`, `is_temporary=false`; personal group `c0b56291-…` is named `'Mist'`.

**The NULL email is the sharp half:** email-addressed invitations and any `users.email` lookup will never match this FIM. The name half makes every surface (header, profile, inviter display, DM sender) read "Mist".

## Fix (substrate — ADR-U038: the rule lives below the Platform API)

New migration, `CREATE OR REPLACE public.finalise_transcendence` (signature unchanged — no B8 change):

1. Inside the existing atomic txn, after the `FOR UPDATE` profile lock: read `auth.users.email` + `raw_user_meta_data->>'display_name'` for the caller.
2. The identity-flip UPDATE also sets `full_name = COALESCE(display_name, auth_email, current full_name)`, `nickname = split_part(new_name, ' ', 1)` (the house first-token rule), `email = COALESCE(auth_email, email)`.
3. Rename the proto personal group to the new nickname — the mirror of `handle_new_user` step 2 (group name = nickname).
4. One-shot backfill for already-stranded rows (`is_temporary=false AND email IS NULL`, joined to a credentialed auth user): recompute the three columns + rename the personal group where it is still named `'Mist'`. Repairs Erik.

Failure semantics unchanged: any refusal aborts the whole txn (no half-FIM). A `users.email` unique collision aborts finalisation atomically (cannot normally arise — auth.users uniqueness gates first).

## Acceptance criteria (integration, red-first, direct PostgREST path)

- Given a Mist converted with `display_name` + email, when `finalise_transcendence` runs, then `users.full_name` = the display name, `nickname` = its first token, `email` = the auth email, and the personal group's `name` = the nickname.
- Given a conversion carrying no display_name, the full_name falls back to the auth email (COALESCE chain holds; never 'Mist' for a credentialed caller).
- Already-FIM guard, consent gate, and atomicity cells stay green (sibling sweep listed in the migration header).

## Verification

- Red demonstrated against the live function; green after apply.
- Post-apply: Erik's row shows `full_name='Erik Hopper'`, `nickname='Erik'`, `email='erik.hopper@test.com'`, personal group renamed `'Erik'`.
- Schema gate: task lands at `review`; PR held for the explicitly-named approval. Reviewer runs the direct-caller question + reads the applied function's ACL.

## Related

- TASK-TRX-02 (Hub half — the premature-FIM read race the same walk surfaced).
- FEAT-PC002 / FEAT-H004 Implementation notes to be appended on close.
