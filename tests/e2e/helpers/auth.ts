import { createClient } from '@supabase/supabase-js';

const E2E_EMAIL_DOMAIN = '@fringeisland.test';
const E2E_PASSWORD = 'e2e-test-password-123';

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export function generateE2EEmail(prefix = 'e2e-user') {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}${E2E_EMAIL_DOMAIN}`;
}

export async function createE2EUser(
  admin: ReturnType<typeof createClient>,
  email: string,
  password = E2E_PASSWORD
) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) throw new Error(`Failed to create E2E user: ${error.message}`);
  return data.user;
}

export async function deleteE2EUser(
  admin: ReturnType<typeof createClient>,
  email: string
) {
  const { data: authList } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const authUser = authList?.users.find((u) => u.email === email);
  if (!authUser) return;

  // FK-safe cleanup: journeys -> personal group -> auth user
  const { data: profile } = await admin
    .from('users')
    .select('id, personal_group_id')
    .eq('auth_user_id', authUser.id)
    .maybeSingle();

  if (profile?.personal_group_id) {
    await admin.from('journeys').delete().eq('created_by_group_id', profile.personal_group_id);
    await admin.from('groups').delete().eq('id', profile.personal_group_id);
  }

  await admin.auth.admin.deleteUser(authUser.id);
}

export { E2E_EMAIL_DOMAIN, E2E_PASSWORD };
