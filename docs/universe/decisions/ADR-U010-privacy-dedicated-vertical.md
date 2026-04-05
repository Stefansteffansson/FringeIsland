# ADR-010 — Privacy as a dedicated vertical

> Extracted from `ARCHITECTURE_DECISIONS.md` on 2026-04-05

**Status:** Locked
**Date:** March 2026

**Context:**
Privacy and GDPR compliance could be absorbed into the Administration vertical (erasure is a lifecycle event) or into L0 Infrastructure (RLS handles data access). The question was whether it deserved its own architectural element.

**Decision:**
Privacy is a dedicated fifth vertical — not absorbed into Administration, not buried in L0.

**Why:**
FringeIsland's manifesto says "member privacy over commercial opportunity." That is a founding value, not a compliance requirement. If privacy is absorbed into Administration, it architecturally becomes a subset of operational concerns. Making it a visible vertical communicates to every developer building every feature: this platform takes privacy seriously. The question "what are the privacy implications of this feature?" becomes part of the build process, not an afterthought.

GDPR also requires more than lifecycle events. Consent management, right to portability, data map (Article 30 record), and AI data handling are distinct concerns that don't fit cleanly in Administration.

**Alternatives considered:**
- *Absorb into Administration* — rejected (see above)
- *Sublayer within L0/L1* — rejected because privacy is cross-cutting — right to erasure touches every layer, not just the lower ones
- *Implicit in RLS policies* — rejected because RLS enforces access control, not consent management, portability or audit
