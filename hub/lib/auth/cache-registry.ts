/**
 * COR-A W9 (audit AC-5) — the auth-owned cache-invalidation registry.
 *
 * Inverts the session-end cache fan-out: area cache modules self-register
 * their invalidator at module init, and AuthContext calls only
 * `invalidateAllCaches()` — it no longer imports any area cache module. This
 * keeps auth area-agnostic and closes the AuthContext half of audit finding
 * AC-5 ("nothing depends on DS-7" — the old fan-out made auth import the
 * journal module; ARCHITECTURE_ANATOMY §Domain Services).
 *
 * Semantics:
 * - LAZY REGISTRATION IS CORRECT-BY-CONSTRUCTION: only loaded modules are
 *   registered — an area never imported this session has no cache to clear,
 *   so nothing is missed by clearing only what registered.
 * - Registration is module-lifetime: invalidators are never removed (they
 *   guard module-level state that lives as long as the module does).
 * - Duplicate registration of the SAME function reference is a no-op (Set
 *   identity), so a module re-evaluation cannot double-call an invalidator.
 * - Invalidators MUST be order-independent pure local drops (null out /
 *   clear module-local state, no cross-module reads, no throws) — the
 *   registry calls them in registration order but guarantees nothing about it.
 */

type CacheInvalidator = () => void;

const invalidators = new Set<CacheInvalidator>();

/** Register an area cache's session-end invalidator (call at module init). */
export function registerCacheInvalidator(fn: CacheInvalidator): void {
  invalidators.add(fn);
}

/** Drop every registered session cache (sign-out / session expiry). */
export function invalidateAllCaches(): void {
  for (const fn of invalidators) fn();
}
