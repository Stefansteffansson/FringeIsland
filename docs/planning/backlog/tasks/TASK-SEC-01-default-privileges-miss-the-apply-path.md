# New functions are anon-executable on apply, and no ALTER DEFAULT PRIVILEGES can fix it

---
id: TASK-SEC-01
title: "Postgres applies its built-in EXECUTE-TO-PUBLIC on top of pg_default_acl, so every new public function is anon-executable until its own migration revokes PUBLIC"
status: done
assigned_to: unassigned
priority: high
owner: platform/core/infrastructure
wave: ferd
depends_on: []
estimated_hours: 3
---

> **REWRITTEN 2026-08-09** after measurement. The original framing — *"ALTER DEFAULT
> PRIVILEGES is set FOR ROLE postgres, but migrations apply as supabase_admin"* — was
> **wrong**, and its proposed remedy would have changed nothing while touching a surface
> that is not ours. The defect it describes is nonetheless **real**. Full evidence:
> [`TASK-SEC-01-INVESTIGATION-2026-08-09.md`](./TASK-SEC-01-INVESTIGATION-2026-08-09.md).

## What was found

2026-08-09, during the RD-B walk fixes. A new function
(`admin_preview_publication_reach`, migration `20260809100000`) shipped **executable by
`anon`** — the only one of the eight role-distribution functions in that state. Corrected
per-function by `20260809140000`.

It read as a simple omission: the migration granted EXECUTE to `authenticated` and never
wrote the paired `revoke all … from public, anon` (`20260807090000:987-997`).

**But the omission should not have mattered**, and that is the finding.

## The measured mechanism

A throwaway function created through the **real apply path** (Management API — the endpoint
`scripts/apply-migration-temp.js` posts to) with no grant or revoke of its own:

```
proacl     {=X/postgres, postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}
anon_exec  true
```

Three things this establishes:

1. **The apply path runs as `postgres`,** not `supabase_admin` (`current_user` and
   `session_user` both `postgres`; all 226 public functions are owned by `postgres`). The
   `supabase_admin` default-ACL row governs Supabase's own extension objects — irrelevant
   to us, and `20260727120000:74-76` already said so.
2. **The `postgres` default-ACL row is already in the desired state** —
   `{postgres=X, authenticated=X, service_role=X}`, no PUBLIC, no anon — courtesy of
   `20260727120000:78`.
3. **And the created function got PUBLIC anyway.** Postgres applies its built-in
   `EXECUTE TO PUBLIC` for functions *on top of* the `pg_default_acl` row, not in place of
   it. **No `ALTER DEFAULT PRIVILEGES` statement can close this.**

So the per-migration `revoke … from public, anon` is not belt-and-braces. It is the only
thing standing between a new function and `anon`.

## Why two people got this wrong

Both prior diagnoses read `pg_default_acl` and reasoned forward. That reasoning inverts the
server's actual behaviour. **The catalogue row is not the answer; the created object is.**

Two docstrings encoded the wrong conclusion and are what let both instances ship:

- `anon-execute-lockdown.test.ts` — *"fixes the DEFAULT PRIVILEGES so future functions never
  inherit the grant."* **Corrected 2026-08-09.**
- `20260727120000` §3 *"THE PREVENTION"* — its prose diagnosis is right; the statement it
  then wrote does not prevent. Left in place (applied migrations are the audit record).

`20260809140000`'s claim that `service_role` "had been reaching it through PUBLIC" is also
wrong — `service_role` holds a direct grant from the default ACL. Left in place, same reason.

## Blast radius

**None realised, then or now.** 226 functions in `public`, **0 anon-executable**. Every
instance was SECURITY DEFINER behind a gate that refused anon in the body (`42501`).

The risk is structural: a function whose own body *is* the authorization — the `_erase_mist`
shape the 2026-07-06 audit found — would be anon-reachable from the moment it is applied
until someone next ran the suite.

## Acceptance criteria

- [x] Verify by **creating a throwaway function through `apply-migration-temp.js` and
      reading its ACL** — not by reading the migration or the default ACL and assuming
- [x] The false claim in `anon-execute-lockdown.test.ts`'s docstring corrected
- [x] `docs/platform/CLAUDE.md` states plainly that **every new function needs the explicit
      `revoke all … from public, anon`**, because the default privileges cannot cover it
- [x] The schema-review question set reads the **applied** function's ACL (the ADR-U038
      direct-caller question, one layer down)
- [x] **The structural fix is unavailable — probed, not assumed.** An `ddl_command_end`
      event trigger revoking PUBLIC/anon would be the only mechanism that closes the
      apply-to-suite window. `CREATE EVENT TRIGGER` requires superuser; **`postgres` is not
      superuser here** (`rolsuper = false`), and all six event triggers on this instance are
      owned by `supabase_admin` — Supabase's surface, which we do not write to.
- [x] **The accepted limit is recorded — ACCEPTED 2026-08-09, owner Stefan Steffansson**
      (*"ok i accept the risk and you can write it down and cite me"*). Written into
      [`docs/platform/CLAUDE.md`](../../../platform/CLAUDE.md) **beside the revoke rule that
      mitigates it**, rather than into this file — a task file is swept, and the next
      migration author reads the tier steering file. It states the window (apply → next suite
      run), why it cannot be closed by us (event trigger needs superuser; `postgres` is not
      one here), the three accepted mitigations, and — the point of writing it at all — that
      finding an anon-executable function means you have hit **the known thing, not a new
      one**.

## Related

- `20260809140000` — the per-function corrective for this instance.
- `20260727120000` — the N-D repair; same class, seven contracts, and the origin of the
  inert prevention.
- Integration cell **W6g** pins the posture for `admin_preview_publication_reach` by name,
  deliberately overlapping the blanket invariant: a named pin fails with an obvious message.
- The 2026-07-06 security audit that produced the lockdown migration.
