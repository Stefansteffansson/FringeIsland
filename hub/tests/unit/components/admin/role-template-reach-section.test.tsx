import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * RD-B FEAT-H044 STORY-3 (unit) — the admin reach surface.
 *
 * "An admin says who a template is for." Reach did not exist before RD-B, so
 * `AdminRoleTemplateDetail` could clone, version, apply and retire but could
 * not express who a clone was made for.
 *
 * Red-first for TASK-RDB-03. These cells drive the surface against fixture
 * payloads; the contract that supplies `publications` is pinned separately by
 * the integration corrective (C1–C6), which is red until 20260807140000 is
 * applied.
 */
const TEMPLATE = {
  id: 'tmpl-1',
  name: 'Distributable Role',
  description: null,
  is_system: false,
  retired_at: null as string | null,
  instantiated_role_count: 2,
  group_template_refs: [] as string[],
};

const basePayload = (over: Record<string, unknown> = {}) => ({
  template: { ...TEMPLATE },
  versions: [
    {
      id: 'ver-1',
      version_number: 1,
      name: 'Distributable Role',
      description: null,
      created_at: '2026-08-01T09:00:00+00:00',
      created_by_display_name: 'Admin',
      permission_names: ['manage_roles'],
      is_default: true,
    },
  ],
  publications: [] as unknown[],
  catalog: [{ name: 'manage_roles', category: 'roles', description: null, is_protected: false }],
  generated_at: '2026-08-07T09:00:00+00:00',
  ...over,
});

const fetchMock = jest.fn<(...a: unknown[]) => Promise<unknown>>();

beforeEach(() => {
  jest.clearAllMocks();
  global.fetch = fetchMock as unknown as typeof fetch;
});

/** Every GET returns the payload; every mutation succeeds unless overridden. */
const wireFetch = (payload: unknown, mutation?: { ok: boolean; error?: string }) => {
  fetchMock.mockImplementation((url: unknown, init?: unknown) => {
    const method = (init as { method?: string } | undefined)?.method ?? 'GET';
    if (method === 'GET') {
      return Promise.resolve({ ok: true, status: 200, json: async () => payload } as Response);
    }
    const m = mutation ?? { ok: true };
    return Promise.resolve({
      ok: m.ok,
      status: m.ok ? 200 : 409,
      json: async () => (m.ok ? {} : { error: m.error }),
    } as Response);
  });
};

import { AdminRoleTemplateDetail } from '@/components/admin/AdminRoleTemplateDetail';

describe('FEAT-H044 STORY-3 — the reach section', () => {
  it('states "Not published" when nothing is published', async () => {
    wireFetch(basePayload());
    render(<AdminRoleTemplateDetail templateId="tmpl-1" />);
    const section = await screen.findByTestId('reach-section');
    expect(within(section).getByTestId('reach-summary')).toHaveTextContent('Not published');
  });

  it('states platform-wide reach and offers Unpublish instead of Publish', async () => {
    wireFetch(
      basePayload({ publications: [{ group_id: null, group_name: null, published_at: '2026-08-01T09:00:00+00:00' }] }),
    );
    render(<AdminRoleTemplateDetail templateId="tmpl-1" />);
    const section = await screen.findByTestId('reach-section');

    expect(within(section).getByTestId('reach-summary')).toHaveTextContent('Published to all groups');
    expect(within(section).getByRole('button', { name: /unpublish/i })).toBeInTheDocument();
    expect(
      within(section).queryByRole('button', { name: /^Publish to all groups$/i }),
    ).not.toBeInTheDocument();
  });

  it('lists each named group with its publication date', async () => {
    wireFetch(
      basePayload({
        publications: [
          { group_id: 'grp-1', group_name: 'Willow Circle', published_at: '2026-08-01T09:00:00+00:00' },
          { group_id: 'grp-2', group_name: 'Harbour Crew', published_at: '2026-08-02T09:00:00+00:00' },
        ],
      }),
    );
    render(<AdminRoleTemplateDetail templateId="tmpl-1" />);
    const section = await screen.findByTestId('reach-section');

    expect(within(section).getByTestId('reach-summary')).toHaveTextContent('Published to 2 groups');
    const rows = within(section).getAllByTestId('reach-row');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent('Willow Circle');
    expect(rows[1]).toHaveTextContent('Harbour Crew');
  });

  it('states that withdrawing an offer leaves adopted copies working', async () => {
    wireFetch(
      basePayload({
        publications: [
          { group_id: 'grp-1', group_name: 'Willow Circle', published_at: '2026-08-01T09:00:00+00:00' },
        ],
      }),
    );
    render(<AdminRoleTemplateDetail templateId="tmpl-1" />);
    const section = await screen.findByTestId('reach-section');
    // RD-2, stated where the action is taken: unpublish withdraws an offer,
    // it never reaches into a group.
    expect(within(section).getByTestId('reach-unpublish-note')).toHaveTextContent(
      /already (adopted|copied)|existing (copies|copy)/i,
    );
  });

  it('publishes platform-wide and repaints from a fresh read', async () => {
    wireFetch(basePayload());
    render(<AdminRoleTemplateDetail templateId="tmpl-1" />);
    const section = await screen.findByTestId('reach-section');
    const user = userEvent.setup();

    await user.click(within(section).getByRole('button', { name: /^Publish to all groups$/i }));
    const modal = await screen.findByTestId('confirm-modal');
    await user.click(within(modal).getByTestId('confirm-modal-confirm'));

    await waitFor(() => {
      const call = fetchMock.mock.calls.find(
        (c) => (c[1] as { method?: string } | undefined)?.method === 'POST',
      );
      expect(call).toBeTruthy();
      expect(String(call![0])).toContain('/api/admin/roles/tmpl-1/publish');
      expect(JSON.parse((call![1] as { body: string }).body)).toEqual({ group_ids: null });
    });
  });

  it('surfaces a refused publish verbatim and leaves the reach unchanged', async () => {
    wireFetch(basePayload(), { ok: false, error: 'platform administrator required' });
    render(<AdminRoleTemplateDetail templateId="tmpl-1" />);
    const section = await screen.findByTestId('reach-section');
    const user = userEvent.setup();

    await user.click(within(section).getByRole('button', { name: /^Publish to all groups$/i }));
    const modal = await screen.findByTestId('confirm-modal');
    await user.click(within(modal).getByTestId('confirm-modal-confirm'));

    expect(await screen.findByTestId('ceremony-outcome')).toHaveTextContent(
      'platform administrator required',
    );
    expect(within(await screen.findByTestId('reach-section')).getByTestId('reach-summary'))
      .toHaveTextContent('Not published');
  });

  // LABELLED green-before-and-after. This cell passed before the section
  // existed (nothing to find) and passes now for the right reason (the
  // section exists and is deliberately withheld). Vacuous on the day it was
  // written, load-bearing from the moment the section landed — the sibling of
  // PC028's own S3c/S3f positive-path pins.
  it('shows NO reach section on a system template', async () => {
    wireFetch(basePayload({ template: { ...TEMPLATE, is_system: true } }));
    render(<AdminRoleTemplateDetail templateId="tmpl-1" />);
    // System roles are the floor every group is built on — not distributed.
    await screen.findByTestId('version-row-1');
    expect(screen.queryByTestId('reach-section')).not.toBeInTheDocument();
  });

  it('makes publish unavailable on a retired template and says why', async () => {
    wireFetch(basePayload({ template: { ...TEMPLATE, retired_at: '2026-08-05T00:00:00+00:00' } }));
    render(<AdminRoleTemplateDetail templateId="tmpl-1" />);
    const section = await screen.findByTestId('reach-section');

    expect(within(section).queryByRole('button', { name: /^Publish to all groups$/i })).not.toBeInTheDocument();
    expect(within(section).getByTestId('reach-blocked')).toHaveTextContent(/retired/i);
  });

  it('still shows existing reach on a retired template (RDB-6 — reach survives)', async () => {
    wireFetch(
      basePayload({
        template: { ...TEMPLATE, retired_at: '2026-08-05T00:00:00+00:00' },
        publications: [
          { group_id: 'grp-1', group_name: 'Willow Circle', published_at: '2026-08-01T09:00:00+00:00' },
        ],
      }),
    );
    render(<AdminRoleTemplateDetail templateId="tmpl-1" />);
    const section = await screen.findByTestId('reach-section');
    // Rows survive retirement so an unretire restores the reach that existed,
    // rather than silently publishing to nobody. The admin must see it.
    expect(within(section).getByTestId('reach-summary')).toHaveTextContent('Published to 1 group');
    expect(within(section).getAllByTestId('reach-row')).toHaveLength(1);
  });
});
