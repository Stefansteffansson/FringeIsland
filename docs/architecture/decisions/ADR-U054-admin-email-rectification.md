# ADR-U054: Email rectification is an administrator capability — one audited contract, no member confirmation

**Status:** Accepted (2026-09-11 — ruled by Stefan on the [gap analysis](../../planning/reference/EMAIL-CHANGE-GAP-ANALYSIS.md) §7 board, D1 explicitly and D2-D7 by delegation; lands with this ADR's merge)
**Date:** 2026-09-11
**Deciders:** Stefan (board D1-D7) · Claude (investigation and authoring)
**Tags:** scope:platform-core · scope:product · scope:vertical · wave:eid

> Architecture Decision Record (MADR-style). Captures *one* decision and *why* it was taken at a moment in time. ADRs are append-only — when a decision changes, add a new ADR that supersedes the old one. Never edit history.

---

## Context and problem statement

A member's email address is, today, permanent for the life of their account. No path exists to change it — not in the admin interface, not in self-service, not through any platform contract. The only escape is hard deletion and re-signup, which destroys the member's groups, journeys and authored content.

This is not an oversight. [FEAT-PC003](../../platform/core/features/FEAT-PC003-self-service-profile.md) excluded `email` from the self-service profile path and parked it as "auth-surface / lifecycle changes are **ADR-gated**, separate capabilities". [ADR-U038](ADR-U038-platform-contracts-platform-side-surface-bff.md) tranche 1 then revoked the column grant outright, with a table comment instructing that it not be restored. The capability was deliberately deferred to an ADR. This is that ADR.

**How should a member's email address be corrected, and by whom?**

The question is not merely procedural. Granting it to administrators means an administrator can point an account at an address they control. That is the real decision, and the ceremony around it is the answer.

## Decision drivers

- **The platform cannot honour GDPR Art. 16 rectification at all.** The Privacy vertical's obligation inventory enumerates access (Art. 15) and erasure (Art. 17) and omits rectification entirely. Correcting a wrong identifier is the textbook case, and it is currently impossible.
- **The Surface holds no service-role key, by design.** `SUPABASE_SERVICE_ROLE_KEY` appears nowhere under `hub/app/` or `hub/lib/`. Every privileged admin mutation is the administrator's *own* session calling a `SECURITY DEFINER` contract gated on `public.is_platform_admin()`. The Supabase Auth Admin API is therefore unreachable without breaching the boundary ADR-U038 exists to hold.
- **The platform has no outbound mail of its own.** Auth mail is dashboard-configured on the Supabase Free tier, whose built-in mailer is rate-limited to a handful of messages per hour. Any design that depends on delivering a confirmation link is gated on a paid plan and custom SMTP. This constrains the option space; it is not a preference.
- **The address lives in five places and one of them governs erasure.** `auth.users.email`, the `auth.identities` provider record, the `public.users` mirror, `pending_email_invitations`, and live sessions. There is no update-sync trigger on `auth.users` — only `AFTER INSERT` and `AFTER DELETE` exist. A partial write is not a cosmetic defect: `erase_fim_account` finds a member's pending invitations by matching the *current* mirrored address, so a stale mirror would leave invitations to the member's real address beyond the reach of an Art. 17 request.
- **The trust boundary is already drawn.** Platform administrators hold `admin_hard_delete_user`, which destroys an account outright. Any argument that rectification is too dangerous to grant must explain why it is more dangerous than deletion.

## Considered options

- **Option A** — Administrator sets the new address directly; it takes effect immediately, marked confirmed.
- **Option B** — Administrator proposes; the member confirms by following a link mailed to the new address.
- **Option C** — Build self-service rectification instead, and grant administrators nothing.
- **Option D** — Do nothing; the address stays permanent.

## Decision outcome

**Chosen option: A.** A platform administrator may rectify a member's email address through a single audited Platform Core contract, because it is the only option that fits the no-service-role architecture and the absence of outbound mail, and because the capability is strictly less dangerous than deletion, which administrators already hold.

The decision binds seven points.

1. **Administrators may rectify; the change takes effect immediately.** No member confirmation step.
2. **The new address is marked confirmed.** An administrator vouches for it. Requiring confirmation the platform cannot reliably deliver would lock the member out with no way back.
3. **Self-service rectification is not granted here.** It is the better long-term feature and it needs the confirmation mail, so it is gated on the mailer decision. It remains an open candidate, not a closed door.
4. **All live sessions are revoked on change.** Changing the login identity is a credential event. If the address was changed because the old one was compromised, live sessions are exactly what must be cut.
5. **Pending invitations to the old address are deleted.** Not re-pointed — an invitation is addressed to a person at an address, and silently redirecting it is a surprise. Not left in place either: after a change, erasure can no longer reach them, and they would survive an Art. 17 request as orphaned personal data. Deletion costs the inviter a visible re-send and leaves no residue.
6. **Every change is audited and the member is told.** One audit row carrying the previous address, the new address and a **required** administrator reason, plus an in-app notice to the member. The previous address must survive in the trail — it is the only record that the account was ever reachable there.
7. **All stores are written in one transaction.** A partial write is a correctness defect, not a display defect (see drivers).

### Consequences

- **Positive.** Art. 16 rectification becomes possible for the first time. A member who mistypes their address at signup, loses access to a mailbox, or changes employer no longer has to destroy their account to fix it. The contract sits squarely in the existing `admin_*` family and needs no new architecture.
- **Positive.** A wrong change is reversible: another rectification corrects it, and the audit row preserves the address it replaced.
- **Negative, and accepted.** A platform administrator can redirect any account to an address they control. **The audit trail and the member notice are detective controls, not preventive ones.** This is accepted because the administrator role already holds strictly greater power in `admin_hard_delete_user`; this ADR widens an existing trust boundary along one axis rather than moving it. Anyone unwilling to accept this should be revoking platform-administrator grants, not withholding this contract.
- **Negative.** The member's notice is **in-app only**. A member who never signs in again will not learn their address was changed. This is a real limitation of having no outbound mail and should be revisited the moment the platform gains it — a notice to the *old* address is the natural preventive control and is unavailable today.
- **Negative.** Marking the address confirmed means an administrator typo can point an account at an address nobody holds. Bounded by reversibility and the audit row, but it is a live risk and the surface must make the administrator read both addresses back before committing.
- **Neutral.** The Privacy vertical's obligation inventory still omits Art. 16. This ADR creates the mechanism; the vertical specification needs a separate amendment to name the obligation. Tracked as a distinct item, not folded in here.

## Alternatives considered

### Option B — administrator proposes, member confirms by mail
- **Pros:** the member consents to their own identity change; an attacker-administrator cannot complete the takeover alone; it is what mature platforms do.
- **Cons:** requires outbound mail the platform does not have, on a plan it is not on. Worse, it cannot be driven from an administrator's session at all — Supabase's confirmation flow is initiated by the member's own client through `auth.updateUser`, so an administrator-proposed change would need either impersonation or a service-role key on the Surface, breaching ADR-U038. An undelivered confirmation strands the member between two addresses. **Revisit this when outbound mail exists** — it is the right end state, not a rejected idea.

### Option C — self-service only
- **Pros:** the member is the right person to change their own address; no administrator escalation at all.
- **Cons:** the same mailer dependency, and it does not serve the case that prompted this — a member who has *lost access* to their address cannot self-serve from it. An administrator path is needed regardless of whether self-service exists.

### Option D — do nothing
- **Pros:** no new escalation.
- **Cons:** leaves the platform unable to honour a rectification request, and leaves "delete your account and start over" as the only remedy for a typo. Not defensible.

## Links

- Investigation and the full decision board: [`EMAIL-CHANGE-GAP-ANALYSIS.md`](../../planning/reference/EMAIL-CHANGE-GAP-ANALYSIS.md)
- Anticipated by: [FEAT-PC003 — self-service profile](../../platform/core/features/FEAT-PC003-self-service-profile.md), Invariants ("auth-surface / lifecycle changes are ADR-gated, separate capabilities")
- Bounded by: [ADR-U038 — platform contracts live platform-side; the Surface is a BFF](ADR-U038-platform-contracts-platform-side-surface-bff.md) (the column-privilege lockdown and the no-service-role-on-the-Surface rule)
- Contract family precedent: [FEAT-PC021 — member administration contracts](../../platform/core/features/FEAT-PC021-member-administration-contracts.md)
- Related: [ADR-U050 — account lifecycle state machine](ADR-U050-account-lifecycle-state-machine.md) · [ADR-U009 — API-first](ADR-U009-api-first-frontend-agnostic.md) · [ADR-U052 — telemetry sink and analytics posture](ADR-U052-telemetry-sink-and-analytics-posture.md)
- Privacy obligation gap (separate amendment): [`docs/verticals/privacy/SPECIFICATION.md`](../../verticals/privacy/SPECIFICATION.md)
