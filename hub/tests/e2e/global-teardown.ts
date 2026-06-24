import { createAdminClient, deleteE2EUser, SESSION_EMAIL } from './helpers/auth';

export default async function globalTeardown() {
  const admin = createAdminClient();
  await deleteE2EUser(admin, SESSION_EMAIL);
  console.log('[e2e-teardown] Session user removed');
}
