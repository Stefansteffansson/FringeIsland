# Extension System

Plugin contracts, registry, lifecycle, sandboxing. The social contract between core and community.

**Status:** Future-wave scope — **not Ferd**. The Extension System will not be built in the Ferd wave.

## Ferd-wave constraint

Although the Extension System itself is deferred, **Ferd architecture must not close it off**. This means:

- **No hardcoded enums** for extensible concepts (group types, step types, role types, content types)
- **No sealed type systems** that prevent new types from being introduced later
- **No closed permission sets** — permissions must be data-driven, not enum-driven

See ADR-U008 (Step Type Extensibility) and ADR-U018 (No Hardcoded Group Types) for the binding constraints.

## Files

- [`SPECIFICATION.md`](./SPECIFICATION.md) — Extension System contracts and patterns, plus the Ferd non-closure obligations (L1→L3 derivation landed 2026-06-11; the build remains future-wave per the constraint above)
- [`CLAUDE.md`](./CLAUDE.md) — entity-level agent context
