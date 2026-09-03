---
id: TASK-SEAL-02
title: The SEAL-01 rider — a platform admin reads a sealed thread's MESSAGES on a closed group (B1's motivation: bullying evidence lives in messages), bounded exactly as SEAL-01
status: done
assigned_to: claude
priority: medium
feature: FEAT-PC026 (admin sight) + FEAT-PD012 (preserve-and-seal) — platform amendment; FEAT-H041 — Hub amendment (the SEAL-01 section gains a thread view)
owner: platform/domain (DS-5 sealed body) + platform/core (admin door) + hub
wave: ferd
cycle: none — ruled at the Ferd leftovers pass (Stefan, 2026-09-03: "seal-01 … now" — the rider named in TASK-SEAL-01's Hub half), queued for the next session
depends_on: []
estimated_hours: 5-7 + one schema gate
---

# TASK-SEAL-02 — from "you can see it exists" to "you can read it"

**Where it stood:** TASK-SEAL-01 armed the *list* (`admin_get_group_conversations`, closed groups, sealed rows labelled) and its Hub half renders "Preserved threads" with a **Sealed** badge and **no open affordance**, saying on the surface that thread contents are not readable from the admin plane — because no message-level admin contract exists and the member detail door keeps its `sealed_at IS NULL` law (bound 4). B1's motivation was the messages. Stefan ruled the rider **in**.

## What to build

- **Platform (one migration, the SEAL-01 shape — ADR-U047 A3 declared composition):** `ds5_admin_conversation_detail(p_conversation_id)` — a sealed DS-5 body (EXECUTE revoked from client roles; `{postgres, service_role}`) serving a **group-kind** conversation's messages **including sealed threads**, senders resolved through the attribution ladder (a departed author renders by the C-B display law — "Former member" / "Unknown", never `[Deleted User]`); and `admin_get_group_conversation_detail(p_conversation_id)` — the admin door: `is_platform_admin()` (42501), the conversation's group **closed** (P0001 otherwise, ruling A's scope), direct conversations never (bound 2), the read **audited** (`admin_audit_log`, bound 4), the sealed state returned explicitly so the surface can never present it as live. The member door `get_conversation_detail` and its `sealed_at IS NULL` law stay untouched (bound 4 of SEAL-01 carried).
- **Vertical impact, load-bearing:** Privacy/GDPR — reading departed members' preserved words under the legitimate-interest basis ADR-U052 §4 states for the admin plane; document it in the spec amendment. Observability — the audited read.
- **Hub (FEAT-H041 amendment):** the SEAL-01 rows gain an open affordance **for the admin plane only**, leading to a read-only thread view labelled *Sealed <date> — preserved when the group closed; nothing here is live* (no composer, no reply, no reactions); BFF route over the new door with the admin-plane 404 collapse and durable telemetry (Q2). The SEAL-01 sentence "contents are not readable" is retired from the section copy.
- **Tests, red-first:** integration (the two contracts: closed + sealed admits the admin; open/suspended refuses; non-admin refuses; a DM refuses; the audit row lands; the member door still refuses a sealed thread), unit (route + the thread view + the section's new affordance), E2E (extend `admin-closed-threads.spec.ts`: open the sealed thread, read the evidence line, no composer).
- One schema gate, held for the named approval; sibling sweep across **every** suite naming `get_conversation_detail` / `admin_get_group_conversations` (the ANN-01 lesson).

## Implementation notes (2026-09-03 — built; applied on the named approval "ok merge #603")

**Platform (migration `20260903110000_task_seal02_sealed_thread_message_read.sql`, the SEAL-01 shape).** `ds5_admin_conversation_detail(p_conversation_id)` — the sealed DS-5 body (EXECUTE revoked from client roles, `{postgres, service_role}`): one group-kind conversation's messages oldest-first (cap 500, `truncated` reported), `message_count`, senders through the COM-14 ladder scoped to the group ("Former member" / "Unknown", never `[Deleted User]`), `sealed_at` + `is_sealed` + `group_status` explicit; a DM is P0002. `admin_get_group_conversation_detail(p_conversation_id)` — the PC-4 wrapper: `is_platform_admin()` 42501, group **closed** else P0001 (ruling A), the body first (its P0002 is the DM no-leak — the wrapper touches no DS-5 table; a first draft that pre-read `conversations` was refused by the invocation-axis gate at the walk and re-issued in place, same version), then the closed-scope check on the reply, then **one `admin_audit_log` row** (`sealed_thread.read`, target = the conversation id, metadata ids only). Self-verifying: both functions exist and the body's ACL admits no client role (PUBLIC checked as an element start, not a substring). Manifest: PC-4 + DS-5 entries and a `declaredCompositions` row (the invocation-axis gate). The member doors are untouched (bound 4 of SEAL-01 carried): `get_conversation_detail` still refuses the admin on a closed group — pinned as a labelled green.

**Hub.** Route `GET /api/admin/groups/[id]/closed-threads/[conversationId]` (read-path identity, admin-plane 404 collapse, durable `admin.sealed_thread_read` ids only); `fetchAdminSealedThreadDetail` + `SealedThreadDetail` in `lib/admin/content.ts`; `AdminClosedThreadsSection` gains Open on every row (exactly one affordance, still no link) and an in-section read-only thread view — the sealed label, messages with the ladder-resolved sender, tombstones for removed messages, no composer/reply/reactions, Back. The SEAL-01 sentence "thread contents are not readable from the admin plane" is retired from the copy. The open handler is memoised (`useCallback`) — the 2026-09-03 React Compiler bailout finding.

**Red-first evidence.**
- Integration `admin/sealed-thread-message-read.test.ts`: **6 red at HEAD** (PGRST202 on both contracts; the client-role seal cell reads "not found" instead of 42501), the premise cell and the bound-4 member-door pin green and labelled.
- Unit: the route (3 cells, module-absent), the lib wrapper (2, function-absent), the section (5 — no Open, no view) — **10 red at HEAD** → green after the build.
- E2E `admin-closed-threads.spec.ts` extended: Open → the sealed label + the evidence body → no composer → the audit row → Back; SEAL-01's "never a door" adapted and labelled (one button, no link). Runs in the post-apply set.

**Vertical impact, as amended in the specs.** Privacy/GDPR — reading departed members' preserved words is purpose-bound (closed groups only), audited, adds no storage; legitimate-interest basis per ADR-U052 §4; departed authors render by the ADR-U021 display law. Observability — the audited read (platform row) + durable telemetry (Hub). Notifications — none (an admin read is not a member-visible state change, matching PC026).

**Gate.** Apply from the repo root on the named approval:

```
node scripts/apply-migration-temp.js 20260903110000_task_seal02_sealed_thread_message_read.sql
bash supabase-cli.sh migration repair --status applied 20260903110000
```

Read the two applied functions' ACLs: the body must show neither `authenticated=`, `anon=` nor a PUBLIC element; the wrapper neither a bare `=X/` nor `anon=X`. Post-apply verification from `hub/`: `npx jest tests/integration/admin/sealed-thread-message-read.test.ts --runInBand --verbose` (8/8), `npm run test:integration:platform`, `npm run test:integration:admin`, `npm run test:integration:communication`, and the E2E set `npx playwright test tests/e2e/admin-closed-threads.spec.ts tests/e2e/admin-suspended-content.spec.ts` (dev server on :3000).
