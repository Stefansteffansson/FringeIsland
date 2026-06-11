# CLAUDE.md — Extension System

**Applies to:** anything under `docs/platform/extensions/` and the corresponding code when it exists (**none is realized today, by design** — the Extension System is future-wave scope, not Ferd; zero extension/plugin/manifest/sandbox substrate anywhere, verified dual-method at the 2026-06 descent).
**Load order:** root [`CLAUDE.md`](../../../CLAUDE.md) → [`AGENTS.md`](../../../AGENTS.md) → [`PROCESS.md`](../../planning/PROCESS.md) → the skill matching the task → [`../CLAUDE.md`](../CLAUDE.md) (platform tier) → [`../domain/CLAUDE.md`](../domain/CLAUDE.md) (domain sub-tier — it carries the Extension System's binding authoring law) → **this file** → [`SPECIFICATION.md`](./SPECIFICATION.md) → the feature spec.
**Reads as a delta.** Assumes root, platform-tier, and domain sub-tier `CLAUDE.md` are already loaded. Contains only what's specific to the Extension System.

---

## What makes this entity different

The Extension System is **Platform Domain's contract layer for community extension** — plugin contracts, registry, lifecycle, sandboxing; *"the social contract between core and community"*. It is **not a numbered Domain Service** (the entity-shape adjudication at the 2026-06 descent: the spec is `SPECIFICATION.md` on the domain-service-spec skeleton as a structural variant; the slug enum deliberately excludes it). It is **wave-deferred with a live obligation**: the build is future-wave, but the Ferd non-closure constraint binds every Domain feature spec NOW (no hardcoded enums for extensible concepts, no sealed type systems, no closed permission sets). Its constitutional anchor is the **MANIFESTO** ("Community ownership over corporate control") — the only platform entity grounded there. Dependency direction is invariant: **services never depend on extensions; extensions consume services' published Platform API contracts only** (ADR-U023's lower-trust boundary).

## Rules that only apply at this entity

- **The eight service-level invariants in SPECIFICATION.md §7 are architecture, not features.** The load-bearing ones: non-closure is law platform-wide; extensions consume the Platform API only — never the Internal API, never the database; extensions are data (registry rows, never code enum cases, never forks of core); **nothing publishes unreviewed** (the social contract's trust mechanism — binding AI-built extensions identically, attributable and under a human's authority); permissions are granted as data, never assumed, never a closed set.
- **At Ferd, this entity specifies and obliges — it does not build.** The wave-deferred lock is scope law. Work that "just starts on" extension tooling, manifest formats, or registry tables at Ferd fails review; the sub-tier gotcha ("deferral is a wave-scope fact, not an authoring license") cuts both ways — don't close extensibility off, and don't build the system early either.
- **Every kind-vocabulary this entity ever defines is itself a registry** (U018 applied reflexively): extension-point kinds, lifecycle states, permission scopes, review outcomes — registries in prose today, registry tables at build time, sealed enums never.

## Gotchas

- **"Extension" carries three senses on disk.** This entity (the Extension System); PRINCIPLES-AI's *"AI is an extension, not an autonomous worker"* (AI-as-extension-of-human-capability — the register's S24 row is this sense); and two code comment senses (file-extension in `AvatarUpload.tsx`; schema-extension in the sprint3 migration). Don't let a grep for one sense collect the others.
- **The closure-debt cluster is DS-3's to fix, not this entity's.** `lib/types/journey.ts`'s sealed unions (`StepType`/`JourneyType`/`DifficultyLevel`), the matching CHECK lists, and the switch-on-type render surfaces are recorded DS-3 correction targets (journeys.md §1). This entity ANCHORS the debt; remediation is DS-3 forward work. Conversely, the U018-amendment distinctions are classification law: entity-state CHECKs (`EnrollmentStatus`, `status`, `display_preference`) are PERMITTED — don't flag them as closure.
- **Sandboxing has no ADR behind it yet** (verified dual-method at the descent). The charter noun's posture derives from U023's trust boundary; the enforcement mechanism is SPECIFICATION.md §8 Q1 (speculative-third-shape) and expects a dedicated ADR at the build wave. Don't cite a sandbox decision that doesn't exist.
- **The marketplace is not this entity.** Extension discoverability is DS-6's find-layer (listing kinds, Hamn+); the economy is Transactions/ADR-U011 territory — the settled three-way split (surface DS-6 / rails vertical / economy Console). This entity owns the registry and lifecycle, never the storefront.
- **U016's cascade template has no Extension System slot** (its slots end at Intelligence). The amendment question is routed (§8 Q3), not resolved — don't silently add the slot, and don't write lifecycle cascades that pretend it exists.
- **No fourth studio exists** (ADR-U026). Where Dreamineer extension authoring happens is an open question (§8 Q4); any design that implies an "Extension Studio" fails the lock.

## Where to go next

- **The spec:** [`SPECIFICATION.md`](./SPECIFICATION.md) — L2 identity + §7 invariants + §L3 capability inventory (Steps 1-3 complete 2026-06-11; all thirteen capabilities full-forward; the two Ferd-active capabilities are discipline obligations).
- **The charter:** [`README.md`](./README.md) — the four nouns, the wave-deferral lock, the Ferd constraint.
- **The binding law:** [`../domain/CLAUDE.md`](../domain/CLAUDE.md) (the closure-recognition authoring discipline; the Platform API open-consumer posture) · ADR-U008 + ADR-U018 (THE locks) · ADR-U023 (the naming + trust boundary) · ADR-U007(d) (the growable permission registry — the realized non-closure pattern) · ADR-U016 (cascade first) · ADR-U015 (versioning, with extension-consumer weight).
- **The realized non-closure pattern on disk:** the six D15 registry tables + the 44-row permission catalog at `supabase/seeds/01_permissions.sql` (point of definition; `lib/constants/permissions.ts` is display order).
