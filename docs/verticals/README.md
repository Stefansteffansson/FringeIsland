# Cross-Cutting Verticals

Concerns that touch every layer (Platform Core, Domain Services, Surfaces — Products + Studios + Design System). Each vertical has its own spec following `../templates/vertical-spec.md`.

**Feature ID prefix:** `V`

**Every feature spec must address all five verticals** in its Vertical Impact section — no vertical left blank. If a vertical does not apply, mark it explicitly as "None" with a one-line reason.

## The five verticals

- `administration/SPECIFICATION.md` — V1 Administration & Moderation
- `privacy/SPECIFICATION.md` — V2 Privacy, GDPR, AI Consent
- `notifications/SPECIFICATION.md` — V3 Notifications
- `observability/SPECIFICATION.md` — V4 Observability, Audit, Errors
- `transactions/SPECIFICATION.md` — V5 Transactions, Stripe

Each vertical lives in its own directory with a `SPECIFICATION.md` (the spec itself) and a `features/` subdirectory for any V-prefix features the vertical owns as shipped infrastructure. The `SPECIFICATION.md` files are authored across three decomposition levels (L2 / L3 / L4) — see `../templates/vertical-spec.md` and `.claude/skills/ecosystem-decomposition/SKILL.md` for the authorship split.
