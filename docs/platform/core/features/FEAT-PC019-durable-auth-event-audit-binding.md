# FEAT-PC019: Durable auth-event audit binding — `record_auth_event()` fills the audit-write abstraction

---
id: FEAT-PC019
title: Durable auth-event audit binding — the SECURITY DEFINER audit-write primitive for the four member-auth moments (AC-6 / AC3-O6 discharge)
owner: platform/core/governance
consumers: [hub]
wave: ferd
maturity: 6-done
requires-equipment: none
---

## Problem

`recordAuditEntry` (`hub/lib/audit/audit.ts`) is the V1 Administration seam wired at the walking skeleton — and it still writes console + telemetry mirror only. Audit I filed it (AC-6), COR-A re-homed it to Platform-Ops, and Audit III sharpened the exposure (AC3-O6): **four callers, three GDPR-relevant** — sign-up (pre-session start), sign-in, Mist→FIM transcendence (the consent moment), and farewell (explicit erase). The un-audited window is the platform's most compliance-sensitive event set. The governance spec's own "Audit access policies" concept row already prescribes the shape — *"INSERT permitted only via SECURITY DEFINER audit-write primitive"* — and its Q6 resolution recorded that no such abstraction exists (three raw patterns coexist). This feature builds that primitive for the member-auth slice, per board AB-2 (settled 2026-07-31).

### Why Platform Core, not a Domain Service

The row target is PC-4's own `admin_audit_log`; the actor primitive is PC-3's; the events are PC-2 auth moments. All Core — a Domain home would require Core to call upward, which is forbidden. And per ADR-U038 the BFF may never be the sole home of the rule: the durable write must be a platform contract the Gimbal inherits, not a Hub route behavior. This cannot be modelled in Domain, via Extensions, or in the BFF.

## Solution sketch

One migration (schema gate — new function + ACL; no table change):

- **`record_auth_event(p_action text, p_metadata jsonb DEFAULT '{}')`** — SECURITY DEFINER, `SET search_path = ''`. Resolves the actor via `get_current_personal_group_id()`; refuses with a typed error when no actor resolves (`28000` class — the BFF treats the refusal as non-fatal and keeps its console mirror). Inserts one `admin_audit_log` row: `actor_group_id` = the caller's personal group, `action` = `p_action` verbatim (the existing caller namespace is preserved: `auth.sign_up`, `auth.sign_in`, `mist.transcend`, `mist.explicit_erase`), `target = 'self'` (auth moments act on the caller), `metadata` = `p_metadata` (content-free by discipline). `REVOKE` PUBLIC/anon; `GRANT EXECUTE TO authenticated`.
- **Append-only untouched:** no UPDATE/DELETE policies exist on `admin_audit_log` and none are added; the existing `is_platform_admin()`-gated SELECT/INSERT policies are untouched (the legacy pattern-(c) door is hub-legacy's; v2 never uses it — narrowing it is an ADM-D question, noted, not built here).
- **Erasure interplay is already correct by shape** — `actor_group_id ... ON DELETE SET NULL`: a farewell row survives the Mist's erasure actor-less and content-free, leaving no personal data. Proven in STORY-2, not assumed.
- The Hub-side wiring (all four callers through this contract, awaited-but-non-fatal, the `A-OPS` naming fix) is the paired **FEAT-H034 STORY-3**.

## Appetite

Small — one function, one ACL block, three test surfaces. The blast-radius caution is PC-4-typical (highest layer), but the diff is additive: no existing function or policy changes.

## Rabbit holes

- **Don't refactor the admin-action audit patterns (a)/(b).** The five direct-INSERT sites and two triggers are conformant and out of scope; this is the *member-auth* slice only.
- **Don't build the read surface.** ADM-16 and the ADR-U052 §6 export split land at ADM-D.
- **Don't audit failed attempts yet.** A failed sign-in has no session, hence no actor, hence no row through this contract; whether failed-auth attempts deserve durable security logging is routed to ADM-D as an open question — recorded, not smuggled in.
- **Don't widen `target`.** `'self'` is the honest constant for auth moments; inventing per-event target grammar here pre-empts ADM-D's audit-surface design.

## No-gos

No change to `admin_audit_log`'s shape, policies, or existing writers. No generic audit façade for admin RPCs. No anon EXECUTE under any justification — pre-session moments stay mirror-only, recorded.

## Stories

### STORY-1: The recorder contract
As the platform, I want an owned, gated audit-write primitive for auth moments, so durable audit stops depending on route-local behavior.

**Acceptance criteria:**
- Given an authenticated caller, when `record_auth_event('auth.sign_in')` is called, then exactly one `admin_audit_log` row exists with the caller's personal group as actor, action verbatim, `target = 'self'`, and default-empty metadata.
- Given a sessionless caller, when calling, then a typed refusal (no row); given anon-key PostgREST, then EXECUTE is refused outright.
- Given any authenticated non-service role, when attempting UPDATE or DELETE on any `admin_audit_log` row, then the write is refused — the B-ADMIN-007 append-only invariant re-asserted against the post-change catalog.

### STORY-2: Erasure interplay proven (the Mist rule)
As the platform, I want the farewell row demonstrated PII-free after erasure, so the audit trail and the erasure right never conflict.

**Acceptance criteria:**
- Given a Mist that transcends, then a `mist.transcend` row exists with the Mist's personal group as actor.
- Given a Mist that farewells (`mist.explicit_erase` written, then personal group erased), then the row survives with `actor_group_id IS NULL` and content-free metadata — asserted after the cascade, by read-back.

### STORY-3: Producer-driven end-to-end proof (the AC3-2 lesson)
As the platform, I want each of the four auth moments proven through the real contract path, so green means the production path writes — never that a fixture did.

**Acceptance criteria:**
- Given the four flows exercised against real contracts (sign-up, sign-in, transcend, farewell), when each completes, then its audit row exists with the expected action string — produced by invoking `record_auth_event` as the flow's actor, never by fixture `INSERT`.

## Platform dependencies

PC-4 internal: the `admin_audit_log` schema contract + access-policy ownership. Consumed: PC-3 `get_current_personal_group_id()` (P-O1); PC-1 SECURITY DEFINER discipline. No Domain dependency.

## Cross-product impact

The Hub wires its four auth callers through this contract (FEAT-H034 STORY-3). The Gimbal's auth flows inherit the same contract — the durable write exists below the surface, per ADR-U038.

## Vertical impact

- **Privacy/GDPR:** the three GDPR-relevant moments (sign-up, transcendence-consent, erasure) become durably evidenced; content-free metadata; erasure interplay proven (STORY-2). The member-facing export of own-actor rows is decided (ADR-U052 §6) and lands at ADM-D.
- **Notifications:** None (audit rows notify no one).
- **Administration:** this *is* the V1 audit obligation for auth moments; append-only preserved and re-asserted.
- **Observability:** the telemetry mirror (`audit.recorded`) is retained at the caller; a recorder refusal is BFF-logged, never swallowed silently.
- **Transactions:** None.
- **Extensibility:** `action` stays open TEXT (no enum); new auth-adjacent moments register by calling with a new dot-namespaced action.

## Performance budget

N/A (no surface). The call sits on auth flows: awaited-but-non-fatal at the BFF with a single-row insert — no measurable budget impact expected; the ADR-U043 gate pass will confirm at the area gate.

## Implementation notes (6-done, 2026-07-31)

Built as migration `20260731190000_adm_a_pc019_auth_event_audit.sql` (PR #355, merged + applied on named approval): `record_auth_event()` exactly per the sketch — strictly additive, append-only untouched. Suite: `hub/tests/integration/auth/auth-event-audit-contracts.test.ts`, 4 demonstrated-red pre-apply (+1 refusal-shaped anon test), 5/5 post-apply. Two build findings recorded:
1. **STORY-2 upgraded to the real farewell.** The first draft's hand-rolled teardown was refused by `enforce_consent_append_only` — the consent ledger's own guard working as designed — so the test now drives a real anonymous Mist through `record_auth_event` + `explicit_erase_mist` and read-back-proves the actor-less, content-free residue (PR #356).
2. **Caller action-string correction.** The four live Hub actions are `auth.sign_in`, `account.created`, `identity.transcended`, `mist.explicit_erase` — this spec's earlier prose (and the migration COMMENT's examples) named `auth.sign_up`/`mist.transcend` from the audit register's summary rather than the code. No contract impact (the namespace is open TEXT by design); the wiring (FEAT-H034 STORY-3) preserves the live strings verbatim.

ADM-D inherits three recorded opens: durable failed-attempt/pre-session audit, narrowing the legacy pattern-(c) INSERT policy, and the ADR-U052 §6 export-shape rewrite of the manifest entry (with ADM-16).
