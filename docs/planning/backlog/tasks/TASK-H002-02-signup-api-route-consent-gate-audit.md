# TASK-H002-02: Sign-up API route — server-side consent gate + audit/telemetry binding

---
id: TASK-H002-02
title: /api/auth/signup route — server consent gate + V1/V4 seam binding
status: done
feature: FEAT-H002
owner: hub
wave: ferd
depends_on: [TASK-H002-01]
estimated_hours: 3
---

## Description

Stand up the `hub/` API route that the sign-up form posts to. It validates consent **server-side** (business logic behind the API, per Hub `CLAUDE.md`), calls `signUpFim` with a server Supabase client, records the account-created + consent audit entry (V1 seam) and emits sign-up telemetry (V4 seam), and returns the session tokens (for the client to `setSession`) or a pending-confirmation signal.

## Acceptance criteria

- `hub/app/api/auth/signup/route.ts` `POST` accepts `{ email, password, displayName, consentAccepted }`.
- Given `consentAccepted` is missing/false, when posted, then the route returns **400** and creates **no** account (server-side gate — independent of the client gate). *(STORY-3)*
- Given valid input, when posted, then it calls `signUpFim(serverClient, …)`; on success it records an **`account.created`** audit entry via `recordAuditEntry({ actorAuthId, action: 'account.created', props: { consentAccepted: true } })` (V1) and emits **`auth.sign_up_succeeded`** telemetry (V4). *(STORY-4)*
- Given a session is returned (auto-confirm on), when responding, then the route returns `{ ok: true, session: { access_token, refresh_token } }`; given no session (confirmation pending), it returns `{ ok: true, pendingConfirmation: true }`. *(STORY-2 fork)*
- Given a duplicate email or other `signUpFim` error, when posted, then the route returns a non-2xx with `{ error }` and emits **`auth.sign_up_failed`** telemetry — never a silent swallow. *(STORY-4)*
- No direct table reads/writes in the route — auth SDK only (the narrow exception); `signUpFim` does the auth call.

## Technical notes

- Server client: `await createClient()` from `hub/lib/supabase/server.ts`.
- Reuse `recordAuditEntry` (`hub/lib/audit/audit.ts`) and `emitTelemetry` (`hub/lib/observability/telemetry.ts`) — do not invent new seams.
- **Honest seam note:** `admin_audit_log` is admin-only (RLS gated to `is_platform_admin()`), so `recordAuditEntry` stays a structured (console + telemetry) record — there is no member-facing audit sink today. Binding it for real needs a `SECURITY DEFINER` lifecycle-audit RPC = net-new substrate, out of this feature's scope (No-gos). Record this in the feature's Implementation notes.
- Return the session tokens in JSON so the client can `supabase.auth.setSession(...)` and keep `AuthContext` coherent.

## Verification

- Covered end-to-end by the E2E specs (TASK-H002-04); `npm run lint -w hub` + `npm run build -w hub` clean.
