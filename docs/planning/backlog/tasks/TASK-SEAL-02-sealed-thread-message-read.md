---
id: TASK-SEAL-02
title: The SEAL-01 rider — a platform admin reads a sealed thread's MESSAGES on a closed group (B1's motivation: bullying evidence lives in messages), bounded exactly as SEAL-01
status: todo
assigned_to: unassigned
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
