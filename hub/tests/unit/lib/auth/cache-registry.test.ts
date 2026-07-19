import { describe, it, expect, jest } from '@jest/globals';

/**
 * COR-A W9 (audit AC-5) — the auth-owned cache-invalidation registry.
 *
 * Semantics under test (documented in `lib/auth/cache-registry.ts`):
 * - every registered invalidator runs once per `invalidateAllCaches()` call;
 * - duplicate registration of the SAME function reference is a no-op (Set
 *   identity) — an invalidator is never double-called;
 * - registration after an invalidation round joins the next round (the lazy
 *   module-init registration pattern);
 * - `invalidateAllCaches()` is safe to call at any time (no registrations
 *   required, repeat calls fine).
 *
 * The registry is module-global on purpose (it mirrors the module-lifetime
 * caches it clears), so these tests assert on per-test jest.fn call counts,
 * never on global registry emptiness.
 */
import {
  registerCacheInvalidator,
  invalidateAllCaches,
} from '@/lib/auth/cache-registry';

describe('cache-registry (COR-A W9, AC-5)', () => {
  it('calls every registered invalidator once per invalidateAllCaches()', () => {
    const a = jest.fn();
    const b = jest.fn();
    registerCacheInvalidator(a);
    registerCacheInvalidator(b);

    invalidateAllCaches();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);

    invalidateAllCaches();
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(2);
  });

  it('deduplicates registration of the same function reference (no double-call)', () => {
    const fn = jest.fn();
    registerCacheInvalidator(fn);
    registerCacheInvalidator(fn);

    invalidateAllCaches();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('includes an invalidator registered after a prior round in the next round', () => {
    const early = jest.fn();
    registerCacheInvalidator(early);
    invalidateAllCaches();

    const late = jest.fn(); // an area module loaded mid-session
    registerCacheInvalidator(late);
    invalidateAllCaches();

    expect(early).toHaveBeenCalledTimes(2);
    expect(late).toHaveBeenCalledTimes(1);
  });

  it('is safe to call repeatedly regardless of what is registered', () => {
    expect(() => {
      invalidateAllCaches();
      invalidateAllCaches();
    }).not.toThrow();
  });
});
