import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AdminMembersList } from '@/components/admin/AdminMembersList';

expect.extend(toHaveNoViolations);

/**
 * FEAT-H036 STORY-1 — /admin/members: the platform member list with honest
 * lifecycle filters. WRITTEN RED-FIRST (2026-08-01): AdminMembersList does
 * not exist at head; every case fails on the missing component.
 *
 * Filter honesty: the toggles map 1:1 onto FEAT-PC021's open filter
 * namespace — the default's decommissioned-hiding is the CONTRACT's rule
 * carried through, never recomputed client-side. Search is client-side over
 * the fetched set (DS-6 recorded unconsumed). State badges render the open
 * account_state vocabulary; an unknown value renders the raw string in the
 * neutral style, never a crash.
 */

type Row = {
  id: string;
  display_name: string;
  email: string | null;
  account_state: string;
  is_platform_admin: boolean;
  created_at: string;
};

const AXEL: Row = {
  id: '11111111-1111-4111-8111-111111111111',
  display_name: 'Axel Active',
  email: 'axel@example.com',
  account_state: 'active',
  is_platform_admin: false,
  created_at: '2026-07-01T10:00:00+00:00',
};
const PIA: Row = {
  id: '22222222-2222-4222-8222-222222222222',
  display_name: 'Pia Paused',
  email: 'pia@example.com',
  account_state: 'paused',
  is_platform_admin: false,
  created_at: '2026-07-02T10:00:00+00:00',
};
const ODA: Row = {
  id: '33333333-3333-4333-8333-333333333333',
  display_name: 'Oda Admin',
  email: 'oda@example.com',
  account_state: 'active',
  is_platform_admin: true,
  created_at: '2026-07-03T10:00:00+00:00',
};
const HIBERNATING: Row = {
  id: '44444444-4444-4444-8444-444444444444',
  display_name: 'Nova Newstate',
  email: 'nova@example.com',
  account_state: 'hibernating', // an OPEN-vocabulary value the styles map does not know
  is_platform_admin: false,
  created_at: '2026-07-04T10:00:00+00:00',
};

const okUsers = (users: Row[]) =>
  ({ ok: true, status: 200, json: async () => ({ users }) }) as Response;
const errResponse = (status: number) =>
  ({ ok: false, status, json: async () => ({ error: 'x' }) }) as Response;

let fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

beforeEach(() => {
  fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('AdminMembersList (FEAT-H036 STORY-1)', () => {
  it('renders the loading skeleton while pending (B6)', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    render(<AdminMembersList />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('the default view: rows with state badges, the admin chip, joined dates; fetched with filter=default', async () => {
    fetchMock.mockResolvedValue(okUsers([AXEL, PIA, ODA]));
    render(<AdminMembersList />);
    expect(await screen.findByTestId(`admin-member-row-${AXEL.id}`)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('/api/admin/users?filter=default');
    // Active rows carry no badge; the paused row does.
    const piaRow = screen.getByTestId(`admin-member-row-${PIA.id}`);
    expect(piaRow).toHaveTextContent('paused');
    // The admin chip on the elevated row only.
    const odaRow = screen.getByTestId(`admin-member-row-${ODA.id}`);
    expect(odaRow.querySelector('[data-testid="admin-chip"]')).not.toBeNull();
    const axelRow = screen.getByTestId(`admin-member-row-${AXEL.id}`);
    expect(axelRow.querySelector('[data-testid="admin-chip"]')).toBeNull();
    // Email + joined date render.
    expect(axelRow).toHaveTextContent('axel@example.com');
  });

  it('an unknown account_state renders the raw string in the neutral badge, never a crash', async () => {
    fetchMock.mockResolvedValue(okUsers([HIBERNATING]));
    render(<AdminMembersList />);
    const row = await screen.findByTestId(`admin-member-row-${HIBERNATING.id}`);
    expect(row).toHaveTextContent('hibernating');
  });

  it('switching a filter refetches with that filter key — the contract namespace 1:1', async () => {
    fetchMock.mockResolvedValue(okUsers([AXEL]));
    render(<AdminMembersList />);
    await screen.findByTestId(`admin-member-row-${AXEL.id}`);
    await userEvent.click(screen.getByRole('tab', { name: 'Decommissioned' }));
    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith('/api/admin/users?filter=decommissioned'),
    );
  });

  it('search narrows by name or email client-side without a refetch', async () => {
    fetchMock.mockResolvedValue(okUsers([AXEL, PIA, ODA]));
    render(<AdminMembersList />);
    await screen.findByTestId(`admin-member-row-${AXEL.id}`);
    const calls = fetchMock.mock.calls.length;
    await userEvent.type(screen.getByRole('searchbox', { name: /search/i }), 'pia@');
    expect(screen.getByTestId(`admin-member-row-${PIA.id}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`admin-member-row-${AXEL.id}`)).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.length).toBe(calls); // no refetch — client-side narrowing
  });

  it('a refused load renders the 404 shape — no admin chrome for non-admins', async () => {
    fetchMock.mockResolvedValue(errResponse(404));
    render(<AdminMembersList />);
    expect(await screen.findByText('404')).toBeInTheDocument();
  });

  it('a failed load is a visible error with Retry', async () => {
    fetchMock.mockResolvedValueOnce(errResponse(500)).mockResolvedValue(okUsers([AXEL]));
    render(<AdminMembersList />);
    expect(await screen.findByText(/could not load/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByTestId(`admin-member-row-${AXEL.id}`)).toBeInTheDocument();
  });

  it('the loaded list is axe-clean', async () => {
    fetchMock.mockResolvedValue(okUsers([AXEL, PIA, ODA]));
    const { container } = render(<AdminMembersList />);
    await screen.findByTestId(`admin-member-row-${AXEL.id}`);
    expect(await axe(container)).toHaveNoViolations();
  });
});
