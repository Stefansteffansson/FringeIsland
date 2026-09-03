import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import { NotificationPreferencesPanel } from '@/components/notifications/NotificationPreferencesPanel';

/**
 * FEAT-H049 STORY-4 / FEAT-PD021 STORY-2 (DB-4) — LABELLED PIN, green at head
 * by design (never claimed as red): the preferences console renders the
 * `sanctions` category ("Holds & sanctions", member_suppressible = false)
 * locked-on with a reason and NO toggle — the FEAT-H033 ND-2 rule, which is
 * registry-driven and needs no Hub change for the new category.
 */
const CELLS = [
  {
    category_key: 'sanctions',
    category_label: 'Holds & sanctions',
    interruption_grade: 'badge',
    member_suppressible: false,
    channel: 'in_app',
    channel_label: 'In the Hub',
    channel_delivers: true,
    allowed: true,
  },
  {
    category_key: 'membership',
    category_label: 'Group & membership updates',
    interruption_grade: 'badge',
    member_suppressible: true,
    channel: 'in_app',
    channel_label: 'In the Hub',
    channel_delivers: true,
    allowed: true,
  },
];

type FetchStub = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<{ ok: boolean; status: number; json?: () => Promise<unknown> }>;
const fetchMock = jest.fn<FetchStub>();

beforeEach(() => {
  fetchMock.mockReset();
  (globalThis as unknown as { fetch: unknown }).fetch = fetchMock;
  fetchMock.mockImplementation(() =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ preferences: CELLS }) }),
  );
});

describe('NotificationPreferencesPanel — Holds & sanctions is locked on (labelled pin)', () => {
  it('renders the sanctions category locked-on with a reason and no toggle; a suppressible sibling keeps its toggle', async () => {
    render(<NotificationPreferencesPanel />);
    await waitFor(() => expect(screen.getByTestId('pref-locked-sanctions-in_app')).toBeInTheDocument());
    expect(screen.getByText('Holds & sanctions')).toBeInTheDocument();
    expect(screen.queryByTestId('pref-toggle-sanctions-in_app')).not.toBeInTheDocument();
    expect(screen.getByTestId('pref-toggle-membership-in_app')).toBeInTheDocument();
  });
});
