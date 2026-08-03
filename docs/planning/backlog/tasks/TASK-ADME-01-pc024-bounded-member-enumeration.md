# Re-issue admin_get_users bounded (FEAT-PC024) — keyset + server search through the schema gate

---
id: TASK-ADME-01
title: Re-issue `admin_get_users` with composite keyset, server search, and the keyed return object; adapt every named sibling; hold the gate for named approval
status: done
assigned_to: claude
priority: high
feature: FEAT-PC024
owner: platform/core/governance
wave: ferd
cycle: ADM-E
depends_on: []
estimated_hours: 4
---

## Description

Build FEAT-PC024: one migration that DROPs and re-issues `public.admin_get_users` with the new signature `(p_filter text DEFAULT 'default', p_search text DEFAULT NULL, p_limit integer DEFAULT 50, p_after_name text DEFAULT NULL, p_after_id uuid DEFAULT NULL) → jsonb`, returning `{users, next_cursor, generated_at}` per the spec's Solution sketch. Red-first: the gate suite demonstrates red at head before the migration exists; the PR is **held at the schema gate** with red evidence + apply commands for named approval (the standing rule — a generic "go on" does not unlock it).

## Acceptance criteria

- [x] Gate suite covers STORY-1..4 (page-walk equivalence, cap/floor/default, incomplete-cursor 22023, search composition, preserved laws incl. Mist exclusion + `default` hides decommissioned + `42501 'platform administrator required'` + anon EXECUTE refused, direct-PostgREST shape honesty) — demonstrated red at head, green post-apply.
- [x] Migration header lists **every** assertion and consumer naming `admin_get_users` (PC021 gate-1 suite cells, `hub/lib/admin/users.ts`, the H036 list suite), each marked adapted or deliberately left (STORY-5).
- [x] Ordering stays `display_name, id`; return stays scalar jsonb (db-max-rows escape preserved); grants unchanged.
- [x] No manifest edit (re-issue by name — verify conformance suites stay green).
- [x] PR held at the gate with red evidence + `node scripts/apply-migration-temp.js` + `supabase-cli.sh migration repair` commands in the body.

## Technical notes

Precedents: cap expression from `admin_get_audit_log` (`20260802120000:383`); the current body to preserve verbatim (filters, `account_state` CASE, Mist exclusion) at `20260801180000:33-117`. Composite row-value comparison `(display_name, id) > (p_after_name, p_after_id)`. Keep `'platform administrator required'` (not the audit read's `'Unauthorized'`).

## Verification

`npm run test:integration:admin` red at head on the new suite, full green post-apply; full integration sweep green; sibling adaptations enumerated in the header match the grep.
