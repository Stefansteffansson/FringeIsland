# The anon-EXECUTE default-privileges fix does not cover the path we apply migrations through

---
id: TASK-SEC-01
title: "ALTER DEFAULT PRIVILEGES is set FOR ROLE postgres, but migrations apply as supabase_admin — every new public function inherits anon EXECUTE"
status: todo
assigned_to: unassigned
priority: high
owner: platform/core/infrastructure
wave: ferd
depends_on: []
estimated_hours: 3
---

## What was found

2026-08-09, during the RD-B walk fixes. A new function
(`admin_preview_publication_reach`, migration `20260809100000`) shipped **executable by
`anon`** — the only one of the eight role-distribution functions in that state.

The immediate cause looked like a simple omission: the migration granted EXECUTE to
`authenticated` and did not write the matching `revoke all … from public, anon`, which the
house pattern pairs it with (`20260807090000:987-997`). That is true, and it was corrected
by `20260809140000`.

**But the omission should not have mattered**, and that is the actual finding.

## The protection exists and does not cover us

`anon-execute-lockdown.test.ts`'s own docstring states that its migration *"fixes the
DEFAULT PRIVILEGES so future functions never inherit the grant"*. `pg_default_acl` shows
**two** entries for `public` schema functions:

| Creating role | Default ACL granted |
|---|---|
| `postgres` | `postgres`, `authenticated`, `service_role` — **no anon** ← the lockdown's fix |
| `supabase_admin` | `postgres`, **`anon`**, `authenticated`, `service_role` ← Supabase's default, untouched |

`ALTER DEFAULT PRIVILEGES` is **per creating role**. The lockdown set it for `postgres`.

`scripts/apply-migration-temp.js` — the documented apply path in
`docs/platform/CLAUDE.md` — posts to the **Supabase Management API**
(`/v1/projects/{ref}/database/query`), which executes as `supabase_admin`, **not**
`postgres`.

**So every function created through our normal apply path inherits `anon` EXECUTE**, and
the default-privileges fix never applies to it. The five PC028 contracts are clean only
because that migration wrote explicit revokes for every one of them.

## Why this has not bitten before

`anon-execute-lockdown.test.ts` carries a blanket invariant (*"the invariant, not a list"*)
that fails on **any** anon-executable public function. It is the real safety net and it
works — it would have caught this one. What it cannot do is prevent the window between a
migration being applied and the suite next running, which on a schema-gated cycle can be
hours, and it does not stop the grant existing on production in the meantime.

**No data has been exposed by this instance.** The function is SECURITY DEFINER behind
`is_platform_admin()`, so an anon caller reaches the gate and is refused `42501`. The risk
is structural, not realised: a future function whose own body is the authorization (the
`_erase_mist` shape the 2026-07-06 audit found) would be reachable by `anon` the moment it
is applied, and would stay so until someone ran the suite.

## Acceptance criteria

- [ ] `ALTER DEFAULT PRIVILEGES` set for **the role the apply path actually uses**, verified
      by creating a throwaway function through `apply-migration-temp.js` and reading its
      ACL — not by reading the migration and assuming
- [ ] The claim in `anon-execute-lockdown.test.ts`'s docstring corrected or qualified: as
      written it tells the next reader that new functions are safe by construction, which
      is what let this ship
- [ ] `docs/platform/CLAUDE.md`'s migration section states plainly that **every new
      function needs the explicit `revoke all … from public, anon`**, because the default
      privileges do not cover the apply path
- [ ] Consider whether the gate checklist should read the new function's ACL as part of the
      schema-review question set (it already asks the ADR-U038 direct-caller question; this
      is the same question one layer down)

## Related

- `20260809140000` — the corrective for this instance.
- Integration cell **W6g** pins the posture for this one function by name. It overlaps the
  blanket invariant deliberately: a named local pin fails with an obvious message, where
  the blanket one fails with a list.
- The 2026-07-06 security audit that produced the lockdown migration — same class, and
  the reason the invariant test exists at all.
