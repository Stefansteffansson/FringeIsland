/**
 * Integration Test Suite Setup
 *
 * Adds delays between suites AND between individual test cases.
 *
 * WHY: When 15+ test suites run sequentially (--runInBand), each test
 * creates a fresh Supabase client and calls signInWithPassword. Supabase's
 * auth rate limiter kicks in mid-run causing sign-ins to fail silently →
 * unauthenticated queries → RLS blocks everything → null/PGRST116 results
 * → cascading test failures.
 *
 * - beforeAll: 1s gap between suites (prevents burst at suite boundaries)
 * - beforeEach: 500ms gap between every test case (prevents burst within a suite)
 *
 * NOTE: Reduced from 2s/800ms on 2026-02-19. If auth rate-limit failures
 * reappear in full suite runs, increase these values back.
 */
beforeAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
});

beforeEach(async () => {
  await new Promise(resolve => setTimeout(resolve, 500));
});
