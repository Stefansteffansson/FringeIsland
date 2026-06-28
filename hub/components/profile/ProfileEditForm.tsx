'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { updateProfile } from '@/lib/profile/client';
import {
  PROFILE_BIO_MAX_LENGTH,
  PROFILE_FULL_NAME_MIN_LENGTH,
  type DisplayPreference,
  type Profile,
} from '@/lib/profile/queries';
import { emitTelemetry } from '@/lib/observability/telemetry';
import { TextField } from '@/components/ui/TextField';
import { Button } from '@/components/ui/Button';
import { InlineError } from '@/components/ui/InlineError';

/**
 * FEAT-H005 — the profile editor (IDN-4). Copy-with-correction from the
 * hub-legacy oracle (`components/profile/ProfileEditForm.tsx`, ADR-U032): the
 * field shape, client-side validation, display-preference radios, show-real-name
 * toggle, and bio counter are preserved; the **corrected** parts are the data
 * path (the paired FEAT-PC003 API contract via `updateProfile`, never a direct
 * `supabase.from('users')` write — ADR-U009) and the dropped `userId` /
 * `personalGroupId` / `updated_at` plumbing (the contract resolves the caller;
 * the `set_users_updated_at` trigger stamps the timestamp).
 *
 * On success it fires `refreshNavigation` so the view, the account-menu label,
 * and the nav (the personal-group name the platform trigger renamed) update
 * together — the Hub never writes the group name itself. V4 telemetry on success
 * AND failure; a failed save is surfaced, never swallowed, and keeps the values.
 */
export default function ProfileEditForm({
  initial,
  onSaved,
}: {
  initial: Profile;
  onSaved?: (profile: Profile) => void;
}) {
  const { user } = useAuth();
  const [fullName, setFullName] = useState(initial.full_name);
  const [nickname, setNickname] = useState(initial.nickname);
  const [displayPreference, setDisplayPreference] = useState<DisplayPreference>(
    initial.display_preference,
  );
  const [showRealName, setShowRealName] = useState(initial.show_real_name);
  const [bio, setBio] = useState(initial.bio ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validate(): string | null {
    if (!fullName.trim()) return 'Full name is required.';
    if (fullName.trim().length < PROFILE_FULL_NAME_MIN_LENGTH) {
      return `Full name must be at least ${PROFILE_FULL_NAME_MIN_LENGTH} characters.`;
    }
    if (!nickname.trim()) return 'Nickname is required.';
    if (bio.length > PROFILE_BIO_MAX_LENGTH) {
      return `Bio must be at most ${PROFILE_BIO_MAX_LENGTH} characters.`;
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const validationError = validate();
    if (validationError) {
      // Client-side guard mirrors the contract; no call fires (STORY-2 AC2).
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const updated = await updateProfile({
        full_name: fullName.trim(),
        nickname: nickname.trim(),
        display_preference: displayPreference,
        show_real_name: showRealName,
        bio: bio.trim() ? bio.trim() : null,
      });
      setSuccess(true);
      // The display-name change cascades to the personal-group name via the
      // platform trigger; the Hub only refreshes so the new name shows.
      window.dispatchEvent(new CustomEvent('refreshNavigation'));
      emitTelemetry('profile.updated', { actor: user?.id, outcome: 'success' });
      onSaved?.(updated);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update profile';
      setError(message);
      emitTelemetry('profile.update_failed', {
        actor: user?.id,
        outcome: 'failure',
        reason: message,
      });
    } finally {
      setLoading(false);
    }
  }

  const shownAs = displayPreference === 'real_name' ? fullName.trim() : nickname.trim();

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <TextField
        label="Full Name"
        id="fullName"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        disabled={loading}
        maxLength={100}
        autoComplete="name"
      />

      <TextField
        label="Nickname / Display Name"
        id="nickname"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        disabled={loading}
        maxLength={50}
      />

      <fieldset className="space-y-2">
        <legend className="mb-1 block text-sm font-medium text-gray-700">
          Display name preference
        </legend>
        <label className="flex items-center gap-3">
          <input
            type="radio"
            name="display_preference"
            value="nickname"
            checked={displayPreference === 'nickname'}
            onChange={() => setDisplayPreference('nickname')}
            disabled={loading}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-900">Show my nickname</span>
        </label>
        <label className="flex items-center gap-3">
          <input
            type="radio"
            name="display_preference"
            value="real_name"
            checked={displayPreference === 'real_name'}
            onChange={() => setDisplayPreference('real_name')}
            disabled={loading}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-900">Show my real name</span>
        </label>
        <p className="text-xs text-gray-500">
          Others will see you as <span className="font-semibold">{shownAs || '...'}</span>
        </p>
      </fieldset>

      <label className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={showRealName}
          onChange={(e) => setShowRealName(e.target.checked)}
          disabled={loading}
          className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500"
        />
        <span className="text-sm text-gray-900">Allow others to see my real name</span>
      </label>

      <div className="mb-4">
        <label htmlFor="bio" className="mb-1 block text-sm font-medium text-gray-700">
          Bio
        </label>
        <textarea
          id="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={loading}
          rows={4}
          maxLength={PROFILE_BIO_MAX_LENGTH}
          className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          placeholder="Tell us a bit about yourself (optional)"
        />
        <p className="mt-1 text-sm text-gray-500">
          {bio.length}/{PROFILE_BIO_MAX_LENGTH} characters
        </p>
      </div>

      {error && <InlineError message={error} />}

      {success && (
        <div
          role="status"
          data-testid="profile-success"
          className="rounded-lg border border-green-200 bg-green-50 p-3"
        >
          <p className="text-sm text-green-700">Profile updated successfully.</p>
        </div>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}
