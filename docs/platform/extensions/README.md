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

- `SPECIFICATION.md` — Extension System contracts and patterns _(to be written when work begins)_
