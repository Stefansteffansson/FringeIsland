import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AdminRolesView } from '@/components/admin/AdminRolesView';

expect.extend(toHaveNoViolations);

/**
 * FEAT-H040 STORY-1 — /admin/roles: the template list + read-only catalogue.
 * WRITTEN RED-FIRST (2026-08-04): AdminRolesView does not exist at head.
 *
 * The contract under test: one composed read (templates + catalogue +
 * generated_at) painted as two panes — every template with the seeded badge,
 * default version, version count, composition refs, and instantiated-count;
 * the catalogue grouped by category with protected badges and ZERO write
 * affordances (atoms code-owned, RB-4); As-of + working Refresh (H034 idiom);
 * B6 skeleton; the 404 shape on refusal; error + Retry; exactly one
 * first-paint request; axe-clean loaded state.
 */

type Template = {
  id: string;
  name: string;
  description: string | null;
  is_system: boolean;
  default_version_number: number | null;
  version_count: number;
  group_template_refs: string[];
  instantiated_role_count: number;
};

type CatalogEntry = {
  name: string;
  category: string;
  description: string | null;
  is_protected: boolean;
};

const TEMPLATES: Template[] = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Steward',
    description: 'Leads the group.',
    is_system: true,
    default_version_number: 1,
    version_count: 1,
    group_template_refs: ['Basic circle', 'Learning circle'],
    instantiated_role_count: 12,
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Scribe',
    description: 'A cloned template.',
    is_system: false,
    default_version_number: 2,
    version_count: 3,
    group_template_refs: [],
    instantiated_role_count: 4,
  },
];

const CATALOG: CatalogEntry[] = [
  {
    name: 'post_forum_messages',
    category: 'communication',
    description: 'Post in the forum.',
    is_protected: false,
  },
  { name: 'view_forum', category: 'communication', description: 'Read the forum.', is_protected: false },
  { name: 'assign_roles', category: 'governance', description: 'Assign roles.', is_protected: true },
];

const PAYLOAD = {
  templates: TEMPLATES,
  catalog: CATALOG,
  generated_at: '2026-08-04T12:00:00.000Z',
};

const ok = (payload: unknown) =>
  ({ ok: true, status: 200, json: async () => payload }) as Response;
const refusal = (status: number) =>
  ({ ok: false, status, json: async () => ({ error: 'Not found' }) }) as Response;

let fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

beforeEach(() => {
  fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('AdminRolesView (FEAT-H040 STORY-1)', () => {
  it('renders the B6 skeleton while the read is pending', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    render(<AdminRolesView />);
    expect(screen.getByRole('status', { name: /loading role templates/i })).toBeInTheDocument();
  });

  it('makes exactly one first-paint request (the composed read)', async () => {
    fetchMock.mockResolvedValue(ok(PAYLOAD));
    render(<AdminRolesView />);
    await screen.findByText('Steward');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/admin/roles');
  });

  it('renders every template with seeded badge, default version, version count, refs, and instantiated count', async () => {
    fetchMock.mockResolvedValue(ok(PAYLOAD));
    render(<AdminRolesView />);
    const stewardRow = await screen.findByTestId(`template-row-${TEMPLATES[0].id}`);
    const scribeRow = screen.getByTestId(`template-row-${TEMPLATES[1].id}`);

    expect(stewardRow).toHaveTextContent('Steward');
    expect(screen.getByTestId(`seeded-badge-${TEMPLATES[0].id}`)).toHaveTextContent(/seeded/i);
    expect(screen.queryByTestId(`seeded-badge-${TEMPLATES[1].id}`)).not.toBeInTheDocument();

    expect(stewardRow).toHaveTextContent('v1'); // default version
    expect(stewardRow).toHaveTextContent('1 version');
    expect(stewardRow).toHaveTextContent('Basic circle');
    expect(stewardRow).toHaveTextContent('Learning circle');
    expect(stewardRow).toHaveTextContent('12');

    expect(scribeRow).toHaveTextContent('v2');
    expect(scribeRow).toHaveTextContent('3 versions');
    expect(scribeRow).toHaveTextContent('4');

    // Template names link into the detail.
    const link = screen.getByRole('link', { name: /steward/i });
    expect(link).toHaveAttribute('href', `/admin/roles/${TEMPLATES[0].id}`);
  });

  it('renders the catalogue grouped by category with protected badges', async () => {
    fetchMock.mockResolvedValue(ok(PAYLOAD));
    render(<AdminRolesView />);
    const browser = await screen.findByTestId('catalogue-browser');

    expect(screen.getByRole('heading', { name: 'communication' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'governance' })).toBeInTheDocument();
    expect(screen.getByTestId('catalogue-row-view_forum')).toHaveTextContent('view_forum');
    expect(screen.getByTestId('catalogue-row-assign_roles')).toHaveTextContent('assign_roles');
    expect(screen.getByTestId('protected-badge-assign_roles')).toHaveTextContent(/protected/i);
    expect(screen.queryByTestId('protected-badge-view_forum')).not.toBeInTheDocument();
    expect(browser).toHaveTextContent('Post in the forum.');
  });

  it('offers zero write affordances anywhere in the catalogue', async () => {
    fetchMock.mockResolvedValue(ok(PAYLOAD));
    render(<AdminRolesView />);
    const browser = await screen.findByTestId('catalogue-browser');
    expect(browser.querySelectorAll('button, input, select, textarea, a')).toHaveLength(0);
  });

  it('renders the As-of line and Refresh re-reads', async () => {
    fetchMock.mockResolvedValue(ok(PAYLOAD));
    render(<AdminRolesView />);
    const asOf = await screen.findByTestId('as-of');
    expect(asOf).toHaveTextContent('As of');

    await userEvent.click(screen.getByRole('button', { name: /refresh/i }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('renders the 404 shape on refusal', async () => {
    fetchMock.mockResolvedValue(refusal(404));
    render(<AdminRolesView />);
    expect(await screen.findByRole('heading', { name: '404' })).toBeInTheDocument();
    expect(screen.getByText(/could not be found/i)).toBeInTheDocument();
  });

  it('renders a visible error with Retry on a failed load, and Retry re-reads', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    fetchMock.mockResolvedValue(ok(PAYLOAD));
    render(<AdminRolesView />);
    const retry = await screen.findByRole('button', { name: /retry/i });
    await userEvent.click(retry);
    expect(await screen.findByText('Steward')).toBeInTheDocument();
  });

  it('loaded state is axe-clean', async () => {
    fetchMock.mockResolvedValue(ok(PAYLOAD));
    const { container } = render(<AdminRolesView />);
    await screen.findByText('Steward');
    expect(await axe(container)).toHaveNoViolations();
  });
});
