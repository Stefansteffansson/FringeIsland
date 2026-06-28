import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Profile } from '@/lib/profile/queries';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H005 STORY-2/3/5 (unit) — the profile editor.
 * Copy-with-correction from the hub-legacy oracle (ADR-U032): same field shape +
 * client-side validation, but the data path is the paired FEAT-PC003 API
 * contract (updateProfile), never a direct table write. On success it fires the
 * refreshNavigation event (so the view, the account-menu label, and nav update
 * together) and emits V4 telemetry; on failure it surfaces the error and keeps
 * the entered values.
 */

const updateProfile = jest.fn<(patch: Partial<Profile>) => Promise<Profile>>();
jest.mock('@/lib/profile/client', () => ({
  updateProfile: (patch: Partial<Profile>) => updateProfile(patch),
}));

jest.mock('@/lib/auth/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u-fim' }, identity: 'fim' }),
}));

import ProfileEditForm from '@/components/profile/ProfileEditForm';

const initial: Profile = {
  full_name: 'Ada Lovelace',
  nickname: 'Ada',
  display_preference: 'nickname',
  show_real_name: false,
  bio: 'Mathematician',
  avatar_url: null,
};

beforeEach(() => {
  updateProfile.mockReset().mockResolvedValue(initial);
});

describe('FEAT-H005 STORY-1/2 (unit) — renders the current profile (the view)', () => {
  it('prefills the editable fields from the initial profile', () => {
    render(<ProfileEditForm initial={initial} />);
    expect(screen.getByLabelText(/full name/i)).toHaveValue('Ada Lovelace');
    expect(screen.getByLabelText(/display name/i)).toHaveValue('Ada');
    expect(screen.getByLabelText(/bio/i)).toHaveValue('Mathematician');
    expect(screen.getByRole('radio', { name: /show my nickname/i })).toBeChecked();
  });
});

describe('FEAT-H005 STORY-2 (unit) — validation blocks the call', () => {
  it('rejects an empty full name and fires no update', async () => {
    render(<ProfileEditForm initial={initial} />);
    await userEvent.clear(screen.getByLabelText(/full name/i));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByTestId('inline-error')).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('rejects a full name shorter than the minimum and fires no update', async () => {
    render(<ProfileEditForm initial={initial} />);
    const fullName = screen.getByLabelText(/full name/i);
    await userEvent.clear(fullName);
    await userEvent.type(fullName, 'A');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByTestId('inline-error')).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('rejects an empty nickname and fires no update', async () => {
    render(<ProfileEditForm initial={initial} />);
    await userEvent.clear(screen.getByLabelText(/display name/i));
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByTestId('inline-error')).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('rejects an over-long bio and fires no update', async () => {
    render(<ProfileEditForm initial={initial} />);
    const bio = screen.getByLabelText(/bio/i);
    // fireEvent.change drives the controlled value without 500 keystrokes.
    fireEvent.change(bio, { target: { value: 'y'.repeat(501) } });
    await userEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(await screen.findByTestId('inline-error')).toBeInTheDocument();
    expect(updateProfile).not.toHaveBeenCalled();
  });
});

describe('FEAT-H005 STORY-2/3/5 (unit) — successful save', () => {
  it('calls updateProfile, fires refreshNavigation, shows success, emits telemetry', async () => {
    const updated: Profile = { ...initial, nickname: 'Ada B' };
    updateProfile.mockResolvedValue(updated);
    const onSaved = jest.fn();
    const refreshSpy = jest.fn();
    window.addEventListener('refreshNavigation', refreshSpy);

    render(<ProfileEditForm initial={initial} onSaved={onSaved} />);
    const nickname = screen.getByLabelText(/display name/i);
    await userEvent.clear(nickname);
    await userEvent.type(nickname, 'Ada B');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() => expect(updateProfile).toHaveBeenCalledTimes(1));
    expect(updateProfile.mock.calls[0][0]).toMatchObject({ nickname: 'Ada B' });
    await waitFor(() => expect(refreshSpy).toHaveBeenCalled());
    expect(onSaved).toHaveBeenCalledWith(updated);
    expect(await screen.findByText(/saved|success|updated/i)).toBeInTheDocument();
    expect(
      getTelemetrySink().some((e) => e.name === 'profile.updated' && e.props?.actor === 'u-fim'),
    ).toBe(true);

    window.removeEventListener('refreshNavigation', refreshSpy);
  });
});

describe('FEAT-H005 STORY-2/5 (unit) — failed save', () => {
  it('surfaces the error, keeps values, emits a failure event, fires no refresh', async () => {
    updateProfile.mockRejectedValue(new Error('Failed to update profile'));
    const refreshSpy = jest.fn();
    window.addEventListener('refreshNavigation', refreshSpy);

    render(<ProfileEditForm initial={initial} />);
    const nickname = screen.getByLabelText(/display name/i);
    await userEvent.clear(nickname);
    await userEvent.type(nickname, 'Ada B');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(await screen.findByTestId('inline-error')).toHaveTextContent(/failed to update/i);
    expect(screen.getByLabelText(/display name/i)).toHaveValue('Ada B'); // values intact
    expect(refreshSpy).not.toHaveBeenCalled();
    expect(
      getTelemetrySink().some(
        (e) => e.name === 'profile.update_failed' && e.props?.actor === 'u-fim',
      ),
    ).toBe(true);

    window.removeEventListener('refreshNavigation', refreshSpy);
  });
});
