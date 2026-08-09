# TASK-SEC-01 — investigation: the hole is real, the stated cause is not

**Date:** 2026-08-09 (session 15) · **Method:** measured through the real apply path, not read
**Subject:** [`TASK-SEC-01-default-privileges-miss-the-apply-path.md`](./TASK-SEC-01-default-privileges-miss-the-apply-path.md)

---

## Verdict in one line

**Every function created through our apply path is anon-executable unless its own migration
revokes PUBLIC explicitly** — confirmed by measurement. But **not** because migrations run as
`supabase_admin` (they run as `postgres`), and **not** fixable by any
`ALTER DEFAULT PRIVILEGES` statement, because the two already in place do not work.

## The probe (AC-1, satisfied)

A throwaway function created through `POST /v1/projects/{ref}/database/query` — the same
endpoint `scripts/apply-migration-temp.js` posts to — with **no grant or revoke written**:

```sql
create function public._sec01_probe() returns int language sql as $$ select 1 $$;
```

```
owner       postgres
proacl      {=X/postgres, postgres=X/postgres, authenticated=X/postgres, service_role=X/postgres}
                ^^^^^^^^^^^ PUBLIC
anon_exec   true      authd_exec true      svc_exec true
```

Dropped immediately; cleanup verified (`still_there: 0`).

**`anon_exec = true` on a brand-new function. The class defect is real.**

## Three claims this kills

**1. "Migrations apply as `supabase_admin`."** False.

```
SELECT current_user, session_user  →  postgres, postgres
```

All 226 functions in `public` are owned by `postgres`; none by `supabase_admin`. The
`supabase_admin` row in `pg_default_acl` governs Supabase's own extension objects and is
irrelevant to us — exactly as `20260727120000:74-76` already said. **The remedy TASK-SEC-01
proposes — setting default privileges for `supabase_admin` — would have changed nothing and
touched a surface that is not ours.**

**2. The 2026-07-06 lockdown "fixes the DEFAULT PRIVILEGES so future functions never inherit
the grant."** False, and this is the docstring AC-2 names.

**3. The N-D repair's §3 "THE PREVENTION" prevents recurrence.** False.
`20260727120000:78` runs `ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON
FUNCTIONS FROM PUBLIC` and it **did** take effect on the stored row:

| Creating role | `pg_default_acl` for `public` / functions |
|---|---|
| `postgres` | `{postgres=X, authenticated=X, service_role=X}` — no `anon`, **no PUBLIC** |
| `supabase_admin` | `{postgres=X, anon=X, authenticated=X, service_role=X}` — Supabase's own |

**And the probe still came out with PUBLIC anyway.** The stored default ACL says PUBLIC is
not granted; the created function has PUBLIC. Postgres's built-in `EXECUTE TO PUBLIC` for
functions is applied *on top of* the `pg_default_acl` row, not replaced by it. So the row is
already in the state the fix wants and the grant lands regardless.

> This is the trap that produced the wrong diagnosis twice. Reading `pg_default_acl` and
> reasoning forward gives the opposite of what the server does. **The catalogue row is not
> the answer; the created object is.** AC-1 was right to demand a created object.

## What this explains

RD-B's W-6 miss is no longer anomalous — it is the predicted behaviour. So were N-D's seven.
Both were read as one-off omissions; both were the class firing. `20260807090000`'s five
contracts are clean **only** because that migration wrote the revokes by hand.

## One correction that has nowhere to land

`20260809140000`'s header says `service_role` "had been reaching it through PUBLIC". The
probe shows `service_role=X/postgres` granted **directly by the default ACL**, independent of
PUBLIC. The claim is wrong.

**Deliberately not fixed in place.** `docs/platform/CLAUDE.md` — *"Migrations run in timestamp
order — don't rewrite a past migration"* — binds the file, comments included; the applied
text is the audit record. Recorded here instead.

## What is NOT true

No exposure, then or now. 226 functions in `public`, **0 anon-executable**. Every instance
this class produced was SECURITY DEFINER behind a gate that refused anon in the body. The
blanket invariant in `anon-execute-lockdown.test.ts` is the real net and it is green.

The defect is that the grant layer — which ADR-U038 L27 names as an enforcement surface in
its own right — keeps ending up wider than the bodies behind it intend, and the window
between an apply and the next suite run is unguarded.

## The structural fix is unavailable — probed, not assumed

An `ddl_command_end` event trigger revoking PUBLIC/anon from any function created in
`public` would be the only mechanism that closes the apply-to-suite window. It is not open
to us:

```
postgres_is_super  false
event_triggers     6 — all owned by supabase_admin
                   (pgrst_ddl_watch, pgrst_drop_watch, issue_pg_graphql_access,
                    issue_graphql_placeholder, issue_pg_cron_access, issue_pg_net_access)
```

`CREATE EVENT TRIGGER` requires superuser. `postgres` is not one on this managed instance,
and the six that exist live on Supabase's surface, which we do not write to.

**So enforced discipline is the ceiling**, and its parts are shipped with this note: the
per-migration revoke rule, the gate's ACL question, and the blanket invariant already in
the suite.

## What remains for Stefan — one governance call

The residual window is real and now proven un-closable by us: **a new function is
anon-executable from the moment it is applied until the suite next runs.** On a
schema-gated cycle that is hours.

That should be recorded as an **explicit accepted risk with an owner**, not left implicit.
It is the third time this class has cost a cycle (N-D's seven, W-6's one, and this
investigation), and each time it was re-diagnosed from scratch because nothing said
"known, accepted, here is the mitigation".

## Shipped with this note

- AC-2 — the false claim in `anon-execute-lockdown.test.ts`'s docstring, corrected.
- AC-3 — `docs/platform/CLAUDE.md` states the revoke rule as load-bearing, not hygiene.
- AC-4 — the ACL question added to the schema-gate question set.
- The task file's mechanism and remedy, rewritten to match measurement.
