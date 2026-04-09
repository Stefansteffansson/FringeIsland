# Platform — Agent Context

## Scope
You are working on shared platform infrastructure. Changes here affect ALL products and services. Extra caution required.

## Constraints — STRICT
- Every new table MUST have RLS policies
- Every API change MUST be documented in the relevant service spec
- Database schema changes require explicit human approval
- Changes to Platform Core (core/) are rare and heavily reviewed
- Changes to Domain Services (domain/) require dependency impact check
- Check `docs/platform/domain/DEPENDENCIES.md` before modifying service boundaries

## Context loading
1. Read this file
2. Read `core/README.md` or `domain/README.md` depending on scope
3. Read the specific feature spec
4. Check ADRs in `docs/architecture/decisions/` for relevant prior decisions
