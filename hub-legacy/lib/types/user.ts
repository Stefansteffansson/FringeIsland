// User-related TypeScript types for FringeIsland (D15 Universal Group Pattern)

/** User profile as stored in the `users` table */
export interface UserProfile {
  id: string;
  full_name: string;
  avatar_url: string | null;
  personal_group_id: string | null;
}

/** Profile data for the profile display page */
export interface ProfileData {
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
  created_at: string;
}

/** Editable profile fields */
export interface EditableProfile {
  id: string;
  full_name: string;
  bio: string | null;
  avatar_url: string | null;
}
