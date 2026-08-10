import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AdminRoleTemplateDetail } from '@/components/admin/AdminRoleTemplateDetail';

expect.extend(toHaveNoViolations);

/** FEAT-H045 STORY-2: a successful delete returns the admin to the catalogue,
 *  so the component navigates. Harmless for every pre-existing case. */
const pushMock = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: (...args: unknown[]) => pushMock(...args), refresh: jest.fn() }),
}));

/**
 * FEAT-H040 STORY-2/3/4 — /admin/roles/[id]: the template detail.
 * WRITTEN RED-FIRST (2026-08-04): AdminRoleTemplateDetail does not exist at head.
 *
 * The contract under test: the version history (default pointer marked,
 * created_by + dates); seeds render read-only with Clone as the ONLY action
 * (no draft editor, no save, no apply — STORY-4); the clone ceremony names
 * BOTH member-visible consequences (STORY-2); non-seeds get the draft editor
 * (checkbox fabric over the catalogue, prefilled from the live default set),
 * save-draft appends a version without applying, and Apply is one danger
 * ceremony carrying the client-computed diff (added/removed, name change,
 * blast radius from payload facts) — rollback is the same door pointed at an
 * older version (STORY-3). Refusals render verbatim. 404 shape, error+Retry,
 * one first-paint request, axe-clean states.
 */

type Version = {
  id: string;
  version_number: number;
  name: string;
  description: string | null;
  created_at: string;
  created_by_display_name: string | null;
  permission_names: string[];
  is_default: boolean;
};

const CATALOG = [
  {
    name: 'post_forum_messages',
    category: 'communication',
    description: 'Post in the forum.',
    is_protected: false,
  },
  { name: 'view_forum', category: 'communication', description: 'Read the forum.', is_protected: false },
  { name: 'assign_roles', category: 'governance', description: 'Assign roles.', is_protected: true },
];

const SEED_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const SEED_DETAIL = {
  template: {
    id: SEED_ID,
    name: 'Steward',
    description: 'Leads the group.',
    is_system: true,
    instantiated_role_count: 12,
    group_template_refs: ['Basic circle'],
  },
  versions: [
    {
      id: 'ssssssss-0001-4000-8000-000000000001',
      version_number: 1,
      name: 'Steward',
      description: 'Leads the group.',
      created_at: '2026-08-04T10:00:00.000Z',
      created_by_display_name: 'DeusEx',
      permission_names: ['assign_roles', 'view_forum'],
      is_default: true,
    },
  ] as Version[],
  catalog: CATALOG,
  generated_at: '2026-08-04T12:00:00.000Z',
};

const CLONE_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const V1 = {
  id: 'cccccccc-0001-4000-8000-000000000001',
  version_number: 1,
  name: 'Scribe',
  description: 'First cut.',
  created_at: '2026-08-04T10:00:00.000Z',
  created_by_display_name: 'Oda Admin',
  permission_names: ['view_forum'],
  is_default: false,
};
const V2 = {
  id: 'cccccccc-0002-4000-8000-000000000002',
  version_number: 2,
  name: 'Scribe II',
  description: 'Second cut.',
  created_at: '2026-08-04T11:00:00.000Z',
  created_by_display_name: 'Oda Admin',
  permission_names: ['post_forum_messages', 'view_forum'],
  is_default: true,
};
const V3 = {
  id: 'cccccccc-0003-4000-8000-000000000003',
  version_number: 3,
  name: 'Scribe II',
  description: 'Drafted, unapplied.',
  created_at: '2026-08-04T11:30:00.000Z',
  created_by_display_name: 'Oda Admin',
  permission_names: ['assign_roles', 'post_forum_messages', 'view_forum'],
  is_default: false,
};
const CLONE_DETAIL = {
  template: {
    id: CLONE_ID,
    name: 'Scribe II',
    description: 'Second cut.',
    is_system: false,
    instantiated_role_count: 4,
    group_template_refs: [],
  },
  versions: [V1, V2, V3] as Version[],
  catalog: CATALOG,
  generated_at: '2026-08-04T12:00:00.000Z',
};

const ok = (payload: unknown) =>
  ({ ok: true, status: 200, json: async () => payload }) as Response;
const refusal = (status: number, error = 'Not found') =>
  ({ ok: false, status, json: async () => ({ error }) }) as Response;

let fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

beforeEach(() => {
  fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

describe('AdminRoleTemplateDetail (FEAT-H040 STORY-2/3/4)', () => {
  it('renders the B6 skeleton while the read is pending', () => {
    fetchMock.mockReturnValue(new Promise(() => undefined));
    render(<AdminRoleTemplateDetail templateId={SEED_ID} />);
    expect(screen.getByRole('status', { name: /loading role template/i })).toBeInTheDocument();
  });

  it('makes exactly one first-paint request', async () => {
    fetchMock.mockResolvedValue(ok(SEED_DETAIL));
    render(<AdminRoleTemplateDetail templateId={SEED_ID} />);
    await screen.findByTestId('version-row-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toContain(`/api/admin/roles/${SEED_ID}`);
  });

  it('renders the version history with the default pointer, author, and date', async () => {
    fetchMock.mockResolvedValue(ok(CLONE_DETAIL));
    render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    const v2row = await screen.findByTestId('version-row-2');
    expect(within(v2row).getByTestId('default-version-marker')).toBeInTheDocument();
    expect(v2row).toHaveTextContent('Oda Admin');
    expect(within(screen.getByTestId('version-row-1')).queryByTestId('default-version-marker')).toBeNull();
    expect(screen.getByTestId('version-row-3')).toHaveTextContent('Drafted, unapplied.');
  });

  it('STORY-4: a seed renders read-only — Clone is the only action', async () => {
    fetchMock.mockResolvedValue(ok(SEED_DETAIL));
    render(<AdminRoleTemplateDetail templateId={SEED_ID} />);
    await screen.findByTestId('version-row-1');
    expect(screen.getByTestId('clone-button')).toBeInTheDocument();
    expect(screen.queryByTestId('draft-editor')).not.toBeInTheDocument();
    expect(screen.queryByTestId('save-draft-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('apply-version-1')).not.toBeInTheDocument();
  });

  it('STORY-2: the clone ceremony names BOTH member-visible consequences', async () => {
    fetchMock.mockResolvedValue(ok(SEED_DETAIL));
    render(<AdminRoleTemplateDetail templateId={SEED_ID} />);
    await userEvent.click(await screen.findByTestId('clone-button'));
    const modal = screen.getByTestId('confirm-modal');
    expect(modal).toHaveTextContent(/group-creation options/i);
    // WA-6 (walk ruling 2026-08-05, flipped red-first): the template-less ride
    // is gone — new groups start with the system set only; clones are pull-only.
    expect(modal).toHaveTextContent(/system set only/i);
    expect(modal).not.toHaveTextContent(/rides every future group/i);
    expect(within(modal).getByTestId('clone-name-input')).toBeInTheDocument();
  });

  it('STORY-2: confirming the clone posts the typed name and repaints from a fresh read', async () => {
    fetchMock.mockResolvedValue(ok(SEED_DETAIL));
    render(<AdminRoleTemplateDetail templateId={SEED_ID} />);
    await userEvent.click(await screen.findByTestId('clone-button'));
    await userEvent.type(screen.getByTestId('clone-name-input'), 'Scribe');
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(ok(SEED_DETAIL));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [postUrl, postInit] = fetchMock.mock.calls[0];
    expect(String(postUrl)).toContain(`/api/admin/roles/${SEED_ID}/clone`);
    expect(postInit?.method).toBe('POST');
    expect(JSON.parse(String(postInit?.body))).toEqual({ name: 'Scribe' });
    // The second call is the honest repaint — a fresh GET of the detail.
    expect(String(fetchMock.mock.calls[1][0])).toContain(`/api/admin/roles/${SEED_ID}`);
  });

  it('STORY-2: a duplicate-name refusal renders verbatim', async () => {
    fetchMock.mockResolvedValue(ok(SEED_DETAIL));
    render(<AdminRoleTemplateDetail templateId={SEED_ID} />);
    await userEvent.click(await screen.findByTestId('clone-button'));
    await userEvent.type(screen.getByTestId('clone-name-input'), 'Scribe');
    fetchMock.mockResolvedValue(refusal(400, 'A role template named "Scribe" already exists'));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    const outcome = await screen.findByTestId('ceremony-outcome');
    expect(outcome).toHaveTextContent('A role template named "Scribe" already exists');
  });

  it('a non-seed offers no Clone action (the editor is its door)', async () => {
    fetchMock.mockResolvedValue(ok(CLONE_DETAIL));
    render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    await screen.findByTestId('version-row-1');
    expect(screen.queryByTestId('clone-button')).not.toBeInTheDocument();
  });

  it('STORY-3: the draft editor prefills from the live default set over the catalogue fabric', async () => {
    fetchMock.mockResolvedValue(ok(CLONE_DETAIL));
    render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    const editor = await screen.findByTestId('draft-editor');
    expect(within(editor).getByTestId('draft-name')).toHaveValue('Scribe II');
    expect(within(editor).getByTestId('draft-description')).toHaveValue('Second cut.');
    expect(within(editor).getByTestId('grant-toggle-view_forum')).toBeChecked();
    expect(within(editor).getByTestId('grant-toggle-post_forum_messages')).toBeChecked();
    expect(within(editor).getByTestId('grant-toggle-assign_roles')).not.toBeChecked();
  });

  it('STORY-3: save-draft states nothing changes until Apply, posts the fabric, and repaints', async () => {
    fetchMock.mockResolvedValue(ok(CLONE_DETAIL));
    render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    const editor = await screen.findByTestId('draft-editor');
    await userEvent.click(within(editor).getByTestId('grant-toggle-assign_roles'));
    await userEvent.click(screen.getByTestId('save-draft-button'));

    const modal = screen.getByTestId('confirm-modal');
    expect(modal).toHaveTextContent(/nothing changes.*until.*apply/i);

    fetchMock.mockClear();
    fetchMock.mockResolvedValue(ok(CLONE_DETAIL));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [postUrl, postInit] = fetchMock.mock.calls[0];
    expect(String(postUrl)).toContain(`/api/admin/roles/${CLONE_ID}/versions`);
    expect(postInit?.method).toBe('POST');
    expect(JSON.parse(String(postInit?.body))).toEqual({
      name: 'Scribe II',
      description: 'Second cut.',
      permission_names: ['assign_roles', 'post_forum_messages', 'view_forum'],
    });
  });

  it('WA-7 (walk ruling 2026-08-05, red-first): after Save draft the fabric KEEPS the edits and the banner names the version awaiting Apply', async () => {
    fetchMock.mockResolvedValue(ok(CLONE_DETAIL));
    render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    const editor = await screen.findByTestId('draft-editor');
    // Edit: add assign_roles (absent from the default V2 set the fabric seeds from).
    await userEvent.click(within(editor).getByTestId('grant-toggle-assign_roles'));
    await userEvent.click(screen.getByTestId('save-draft-button'));

    // The fresh read after saving returns the ledger WITH the new v4.
    const V4 = {
      id: 'cccccccc-0004-4000-8000-000000000004',
      version_number: 4,
      name: 'Scribe II',
      description: 'Second cut.',
      created_at: '2026-08-05T12:00:00.000Z',
      created_by_display_name: 'Oda Admin',
      permission_names: ['assign_roles', 'post_forum_messages', 'view_forum'],
      is_default: false,
    };
    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce(ok({})); // the POST
    fetchMock.mockResolvedValue(ok({ ...CLONE_DETAIL, versions: [V1, V2, V3, V4] }));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    // The edits are the just-saved version — the repaint must not wipe them
    // back to the live default (the walk's "back to normal" confusion).
    await waitFor(() =>
      expect(screen.getByTestId('ceremony-outcome')).toHaveTextContent(/draft saved as v4/i),
    );
    expect(screen.getByTestId('ceremony-outcome')).toHaveTextContent(/awaiting apply/i);
    expect(
      (within(screen.getByTestId('draft-editor')).getByTestId('grant-toggle-assign_roles') as HTMLInputElement)
        .checked,
    ).toBe(true);
  });

  it('WA-7 guard (designed-green control): Apply still re-seeds the fabric from the newly-live set', async () => {
    fetchMock.mockResolvedValue(ok(CLONE_DETAIL));
    render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    const editor = await screen.findByTestId('draft-editor');
    // No local edits: assign_roles is unchecked (absent from the default V2 set).
    expect((within(editor).getByTestId('grant-toggle-assign_roles') as HTMLInputElement).checked).toBe(false);

    await userEvent.click(screen.getByTestId('apply-version-3'));
    fetchMock.mockClear();
    fetchMock.mockResolvedValueOnce(ok({})); // the POST
    fetchMock.mockResolvedValue(
      ok({
        ...CLONE_DETAIL,
        versions: [V1, { ...V2, is_default: false }, { ...V3, is_default: true }] as Version[],
      }),
    );
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    // V3 (now live) carries assign_roles — the honest repaint re-seeds it in.
    await waitFor(() =>
      expect(
        (within(screen.getByTestId('draft-editor')).getByTestId('grant-toggle-assign_roles') as HTMLInputElement)
          .checked,
      ).toBe(true),
    );
  });

  it('STORY-3: Apply is a danger ceremony with the added/removed diff and the blast-radius line', async () => {
    fetchMock.mockResolvedValue(ok(CLONE_DETAIL));
    render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    await screen.findByTestId('version-row-3');
    // The default version's row offers no Apply — it is already live.
    expect(screen.queryByTestId('apply-version-2')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('apply-version-3'));
    const modal = screen.getByTestId('confirm-modal');
    expect(within(modal).getByTestId('diff-added')).toHaveTextContent('assign_roles');
    expect(within(modal).queryByTestId('diff-removed')).not.toBeInTheDocument();
    expect(within(modal).queryByTestId('diff-name-change')).not.toBeInTheDocument();
    expect(within(modal).getByTestId('blast-radius')).toHaveTextContent(
      '4 existing group roles keep their snapshot; future groups instantiate the new set.',
    );
  });

  it('STORY-3: rollback is the same door — an older version shows the reversed diff and a name change', async () => {
    fetchMock.mockResolvedValue(ok(CLONE_DETAIL));
    render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    await userEvent.click(await screen.findByTestId('apply-version-1'));
    const modal = screen.getByTestId('confirm-modal');
    expect(within(modal).getByTestId('diff-removed')).toHaveTextContent('post_forum_messages');
    expect(within(modal).queryByTestId('diff-added')).not.toBeInTheDocument();
    expect(within(modal).getByTestId('diff-name-change')).toHaveTextContent(/Scribe II.*Scribe/);
  });

  it('STORY-3: confirming Apply posts the version id and repaints from a fresh read', async () => {
    fetchMock.mockResolvedValue(ok(CLONE_DETAIL));
    render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    await userEvent.click(await screen.findByTestId('apply-version-3'));
    fetchMock.mockClear();
    fetchMock.mockResolvedValue(ok(CLONE_DETAIL));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    const [postUrl, postInit] = fetchMock.mock.calls[0];
    expect(String(postUrl)).toContain(`/api/admin/roles/${CLONE_ID}/default`);
    expect(JSON.parse(String(postInit?.body))).toEqual({ version_id: V3.id });
    expect(String(fetchMock.mock.calls[1][0])).toContain(`/api/admin/roles/${CLONE_ID}`);
  });

  it('an apply refusal renders verbatim', async () => {
    fetchMock.mockResolvedValue(ok(CLONE_DETAIL));
    render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    await userEvent.click(await screen.findByTestId('apply-version-3'));
    fetchMock.mockResolvedValue(
      refusal(409, 'applying this version would leave a protected permission with no holder'),
    );
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    const outcome = await screen.findByTestId('ceremony-outcome');
    expect(outcome).toHaveTextContent(
      'applying this version would leave a protected permission with no holder',
    );
  });

  it('renders the 404 shape on refusal', async () => {
    fetchMock.mockResolvedValue(refusal(404));
    render(<AdminRoleTemplateDetail templateId={SEED_ID} />);
    expect(await screen.findByRole('heading', { name: '404' })).toBeInTheDocument();
  });

  it('renders a visible error with Retry on a failed load, and Retry re-reads', async () => {
    fetchMock.mockRejectedValueOnce(new Error('network down'));
    fetchMock.mockResolvedValue(ok(SEED_DETAIL));
    render(<AdminRoleTemplateDetail templateId={SEED_ID} />);
    await userEvent.click(await screen.findByRole('button', { name: /retry/i }));
    expect(await screen.findByTestId('version-row-1')).toBeInTheDocument();
  });

  it('loaded detail, open ceremony, and refusal outcome states are axe-clean', async () => {
    fetchMock.mockResolvedValue(ok(CLONE_DETAIL));
    const { container } = render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    await screen.findByTestId('version-row-1');
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.click(screen.getByTestId('apply-version-3'));
    expect(await axe(container)).toHaveNoViolations();

    fetchMock.mockResolvedValue(refusal(409, 'refused'));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await screen.findByTestId('ceremony-outcome');
    expect(await axe(container)).toHaveNoViolations();
  });
});

/**
 * FEAT-H045 STORY-2 — a template nobody ever saw can be removed, and the
 * ceremony says what that means. WRITTEN RED-FIRST (2026-08-10): the detail
 * view has no delete affordance at head.
 *
 * The Hub NEVER computes eligibility. It renders PC029's server-computed
 * `deletable` / `undeletable_reason`, and where deletion is impossible it
 * shows the reason as TEXT rather than a disabled control — an affordance for
 * an impossible act is still an affordance (the spec's No-go).
 */
describe('AdminRoleTemplateDetail — disposal (FEAT-H045 STORY-2)', () => {
  const DISPOSABLE = {
    ...CLONE_DETAIL,
    template: {
      ...CLONE_DETAIL.template,
      name: 'Walk Greeter',
      retired_at: '2026-08-09T10:00:00.000Z',
      deletable: true,
      undeletable_reason: null,
    },
  };
  const REASON = 'this role template was offered to groups and cannot be deleted';
  const UNDISPOSABLE = {
    ...CLONE_DETAIL,
    template: {
      ...CLONE_DETAIL.template,
      retired_at: '2026-08-09T10:00:00.000Z',
      deletable: false,
      undeletable_reason: REASON,
    },
  };

  beforeEach(() => pushMock.mockClear());

  it('offers Delete permanently when the server says deletable', async () => {
    fetchMock.mockResolvedValue(ok(DISPOSABLE));
    render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    await screen.findByText('Walk Greeter');

    expect(await screen.findByTestId('delete-template-button')).toBeInTheDocument();
  });

  it('renders NO delete affordance when it is not deletable, and shows the reason as text', async () => {
    fetchMock.mockResolvedValue(ok(UNDISPOSABLE));
    render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    await screen.findByTestId('undeletable-reason');

    // not disabled — absent. A greyed-out control is still an affordance for
    // an impossible act.
    expect(screen.queryByTestId('delete-template-button')).not.toBeInTheDocument();
    expect(screen.getByTestId('undeletable-reason')).toHaveTextContent(REASON);
  });

  it('the ceremony states permanence, that nobody ever saw it, and names the target', async () => {
    fetchMock.mockResolvedValue(ok(DISPOSABLE));
    render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    await screen.findByText('Walk Greeter');

    await userEvent.click(screen.getByTestId('delete-template-button'));
    const modal = screen.getByTestId('confirm-modal');
    expect(modal).toHaveTextContent(/permanent/i);
    expect(modal).toHaveTextContent(/cannot be undone/i);
    expect(modal).toHaveTextContent(/never offered to any group/i);
    expect(modal).toHaveTextContent(/no copies/i);
    expect(modal).toHaveTextContent('Walk Greeter');
    // opening the ceremony calls nothing
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('cancelling calls nothing and changes nothing', async () => {
    fetchMock.mockResolvedValue(ok(DISPOSABLE));
    render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    await screen.findByText('Walk Greeter');

    await userEvent.click(screen.getByTestId('delete-template-button'));
    await userEvent.click(screen.getByTestId('confirm-modal-cancel'));

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByTestId('delete-template-button')).toBeInTheDocument();
  });

  it('on success it returns to the catalogue and names what was deleted', async () => {
    fetchMock.mockResolvedValueOnce(ok(DISPOSABLE));
    fetchMock.mockResolvedValueOnce(ok({ deleted: true, template_name: 'Walk Greeter' }));
    render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    await screen.findByText('Walk Greeter');

    await userEvent.click(screen.getByTestId('delete-template-button'));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    // Back to the catalogue, CARRYING the name — the row is gone, so nothing
    // downstream could look it up to name what was deleted.
    await waitFor(() => expect(pushMock).toHaveBeenCalledTimes(1));
    const dest = String(pushMock.mock.calls[0][0]);
    expect(dest).toMatch(/^\/admin\/roles\?/);
    expect(decodeURIComponent(dest)).toContain('Walk Greeter');
    const call = fetchMock.mock.calls[1];
    expect(String(call[0])).toContain(`/api/admin/roles/${CLONE_ID}`);
    expect((call[1] as RequestInit).method).toBe('DELETE');
  });

  it('a refusal is surfaced VERBATIM, the admin stays, and the view refreshes', async () => {
    // The race the AC names: someone published it between render and click.
    fetchMock.mockResolvedValueOnce(ok(DISPOSABLE));
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: REASON }),
    } as Response);
    fetchMock.mockResolvedValueOnce(ok(UNDISPOSABLE));
    render(<AdminRoleTemplateDetail templateId={CLONE_ID} />);
    await screen.findByText('Walk Greeter');

    await userEvent.click(screen.getByTestId('delete-template-button'));
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));

    await waitFor(() => expect(screen.getByTestId('ceremony-outcome')).toHaveTextContent(REASON));
    expect(pushMock).not.toHaveBeenCalled();
    // and it re-read, so the now-current state is what is on screen
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });
});
