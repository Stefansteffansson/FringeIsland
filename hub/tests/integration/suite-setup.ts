// Integration suite setup — real Supabase, so allow generous time for
// create-user → trigger → sign-in → RLS-scoped reads, and fail loudly if the
// service-role key (setup/teardown) is missing.
jest.setTimeout(30000);

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error('Integration tests require NEXT_PUBLIC_SUPABASE_URL (hub/.env.local)');
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('Integration tests require SUPABASE_SERVICE_ROLE_KEY (hub/.env.local)');
}
