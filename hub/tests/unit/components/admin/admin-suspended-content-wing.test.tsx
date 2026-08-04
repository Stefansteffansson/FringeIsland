import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { AdminSuspendedContentWing } from '@/components/admin/AdminSuspendedContentWing';

expect.extend(toHaveNoViolations);

/**
 * FEAT-H041 STORY-2..6 — the suspended-group content wing: plane banner,
 * members with emails + the Remove ceremony, forum with tombstone honesty +
 * the Moderate ceremony, announcements read-only, conversations with
 * read-only message bodies, refusal-driven collapse (onStateDrift).
 * WRITTEN RED-FIRST (2026-08-04): AdminSuspendedContentWing does not exist
 * at head; every case fails on the missing component before implementation.
 *
 * Admin-plane posture pinned here: fetch-on-mount per section (no session
 * cache, no realtime), per-section skeleton + failure isolation, honest
 * repaint after every act, and the wing never offers what the contracts
 * refuse (Moderate absent on tombstones; Remove disabled without the
 * platform's user_id key).
 */

type Member = {
  personal_group_id: string;
  display_name: string;
  email: string | null;
  user_id: string | null;
  is_steward: boolean;
};

const GROUP_ID = '44444444-4444-4444-8444-444444444444';
const GROUP_NAME = 'Harbour Circle';

const members: Member[] = [
  {
    personal_group_id: 'aaaa1111-1111-4111-8111-111111111111',
    display_name: 'Stella',
    email: 'stella@example.test',
    user_id: 'ee111111-1111-4111-8111-111111111111',
    is_steward: true,
  },
  {
    personal_group_id: 'bbbb2222-2222-4222-8222-222222222222',
    display_name: 'Mona',
    email: 'mona@example.test',
    user_id: 'ee222222-2222-4222-8222-222222222222',
    is_steward: false,
  },
];

const forumPayload = {
  posts: [
    {
      id: 'f0000000-0000-4000-8000-000000000001',
      parent_post_id: null,
      content: 'The offending post',
      is_deleted: false,
      created_at: '2026-08-01T10:00:00+00:00',
      updated_at: '2026-08-01T10:00:00+00:00',
      author_group_id: 'bbbb2222-2222-4222-8222-222222222222',
      author: { display_name: 'Mona', attribution: 'active' },
      replies: [
        {
          id: 'f0000000-0000-4000-8000-000000000002',
          parent_post_id: 'f0000000-0000-4000-8000-000000000001',
          content: null,
          is_deleted: true,
          created_at: '2026-08-01T11:00:00+00:00',
          updated_at: '2026-08-01T11:30:00+00:00',
          author_group_id: 'aaaa1111-1111-4111-8111-111111111111',
          author: { display_name: 'Stella', attribution: 'active' },
          replies: [],
        },
      ],
    },
  ],
};

const announcementsPayload = {
  announcements: [
    {
      id: 'a0000000-0000-4000-8000-000000000001',
      title: 'Announcement title',
      body: 'Announcement body',
      created_at: '2026-08-01T09:00:00+00:00',
      author_group_id: 'aaaa1111-1111-4111-8111-111111111111',
      author: { display_name: 'Stella', attribution: 'active' },
    },
  ],
};

const conversationsPayload = {
  conversations: [
    {
      id: 'c0000000-0000-4000-8000-000000000001',
      title: 'Evidence thread',
      created_at: '2026-08-01T08:00:00+00:00',
      am_i_participant: false,
    },
  ],
};

const conversationDetailPayload = {
  detail: {
    id: 'c0000000-0000-4000-8000-000000000001',
    kind: 'group',
    title: 'Evidence thread',
    group_id: GROUP_ID,
    group_name: GROUP_NAME,
    messages: [
      {
        id: 'm0000000-0000-4000-8000-000000000001',
        sender_group_id: 'bbbb2222-2222-4222-8222-222222222222',
        content: 'the message body evidence',
        created_at: '2026-08-01T08:05:00+00:00',
      },
    ],
    senders: {
      'bbbb2222-2222-4222-8222-222222222222': { display_name: 'Mona', attribution: 'active' },
    },
    participants: [],
    my_last_read_at: null,
  },
};

const ok = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body }) as Response;
const err = (status: number, error = 'Not found') =>
  ({ ok: false, status, json: async () => ({ error }) }) as Response;

let fetchMock: jest.Mock<Promise<Response>, [RequestInfo | URL, RequestInit?]>;

/** URL-routed responses — the admin sections fetch on mount in any order. */
const routeFetch = (
  overrides: Partial<Record<'forum' | 'announcements' | 'conversations' | 'conversationDetail', () => Response>> = {},
) => {
  fetchMock.mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (init?.method === 'POST') {
      return Promise.resolve(ok({}));
    }
    if (url.endsWith('/forum')) return Promise.resolve((overrides.forum ?? (() => ok(forumPayload)))());
    if (url.endsWith('/announcements'))
      return Promise.resolve((overrides.announcements ?? (() => ok(announcementsPayload)))());
    if (url.includes('/conversations/'))
      return Promise.resolve((overrides.conversationDetail ?? (() => ok(conversationDetailPayload)))());
    if (url.endsWith('/conversations'))
      return Promise.resolve((overrides.conversations ?? (() => ok(conversationsPayload)))());
    return Promise.resolve(err(404));
  });
};

beforeEach(() => {
  fetchMock = jest.fn<Promise<Response>, [RequestInfo | URL, RequestInit?]>();
  global.fetch = fetchMock as unknown as typeof fetch;
});

const renderWing = (onStateDrift = jest.fn()) => {
  render(
    <AdminSuspendedContentWing
      groupId={GROUP_ID}
      groupName={GROUP_NAME}
      members={members as never}
      onStateDrift={onStateDrift}
    />,
  );
  return onStateDrift;
};

describe('AdminSuspendedContentWing (FEAT-H041)', () => {
  it('renders the plane banner naming audited admin access, and the four named sections', async () => {
    routeFetch();
    renderWing();
    const banner = screen.getByTestId('admin-content-plane-banner');
    expect(banner).toHaveTextContent(/admin view of a suspended group/i);
    expect(banner).toHaveTextContent(/audited/i);
    expect(screen.getByRole('region', { name: 'Members' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Forum' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Announcements' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Conversations' })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3)); // three reads; members are in hand
  });

  it('members rows show display name, email, and the steward badge — from the detail read already in hand (no fetch)', () => {
    routeFetch();
    renderWing();
    const section = screen.getByRole('region', { name: 'Members' });
    expect(within(section).getByText('Stella')).toBeInTheDocument();
    expect(within(section).getByText('stella@example.test')).toBeInTheDocument();
    expect(within(section).getByText('Mona')).toBeInTheDocument();
    expect(within(section).getByText('mona@example.test')).toBeInTheDocument();
    expect(within(section).getAllByText(/steward/i)).toHaveLength(1); // the badge, once
  });

  it('the Remove ceremony echoes display name AND email AND the group name, states the consequence, and requires a reason before confirm', async () => {
    routeFetch();
    renderWing();
    await userEvent.click(screen.getByTestId('remove-member-bbbb2222-2222-4222-8222-222222222222'));
    const modal = screen.getByTestId('confirm-modal');
    expect(modal).toHaveTextContent('Mona');
    expect(modal).toHaveTextContent('mona@example.test');
    expect(modal).toHaveTextContent(GROUP_NAME);
    expect(modal).toHaveTextContent(/loses access/i); // the consequence, stated before the click
    expect(screen.getByTestId('confirm-modal-confirm')).toBeDisabled(); // reason required
    await userEvent.type(screen.getByTestId('ceremony-reason'), 'coordinated the bullying');
    expect(screen.getByTestId('confirm-modal-confirm')).toBeEnabled();
  });

  it('confirming Remove POSTs to the member remove route keyed by user_id, then hands repaint to the parent', async () => {
    routeFetch();
    const onStateDrift = renderWing();
    await userEvent.click(screen.getByTestId('remove-member-bbbb2222-2222-4222-8222-222222222222'));
    await userEvent.type(screen.getByTestId('ceremony-reason'), 'coordinated the bullying');
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => expect(onStateDrift).toHaveBeenCalled());
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(postCall?.[0]).toBe(
      `/api/admin/groups/${GROUP_ID}/members/ee222222-2222-4222-8222-222222222222/remove`,
    );
  });

  it('the forum renders read-only with an honest tombstone; Moderate is offered only on live posts', async () => {
    routeFetch();
    renderWing();
    const section = screen.getByRole('region', { name: 'Forum' });
    expect(await within(section).findByText('The offending post')).toBeInTheDocument();
    expect(within(section).getByText('This post was removed')).toBeInTheDocument(); // the one law, both planes
    expect(
      within(section).getByTestId('moderate-post-f0000000-0000-4000-8000-000000000001'),
    ).toBeInTheDocument();
    expect(
      within(section).queryByTestId('moderate-post-f0000000-0000-4000-8000-000000000002'),
    ).not.toBeInTheDocument(); // never offered on a tombstone
  });

  it('the Moderate ceremony names the author and the group, requires a reason, states the tombstone consequence, POSTs, and repaints the section', async () => {
    routeFetch();
    renderWing();
    await userEvent.click(
      await screen.findByTestId('moderate-post-f0000000-0000-4000-8000-000000000001'),
    );
    const modal = screen.getByTestId('confirm-modal');
    expect(modal).toHaveTextContent('Mona');
    expect(modal).toHaveTextContent(GROUP_NAME);
    expect(modal).toHaveTextContent(/removed for every member/i);
    expect(modal).toHaveTextContent(/audit/i);
    expect(screen.getByTestId('confirm-modal-confirm')).toBeDisabled();
    await userEvent.type(screen.getByTestId('ceremony-reason'), 'harassment');
    const forumReadsBefore = fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/forum')).length;
    await userEvent.click(screen.getByTestId('confirm-modal-confirm'));
    await waitFor(() => {
      const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
      expect(postCall?.[0]).toBe(
        `/api/admin/groups/${GROUP_ID}/forum/f0000000-0000-4000-8000-000000000001/moderate`,
      );
    });
    const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST');
    expect(JSON.parse(postCall?.[1]?.body as string)).toEqual({ reason: 'harassment' });
    await waitFor(() => {
      const forumReadsAfter = fetchMock.mock.calls.filter(([u]) => String(u).endsWith('/forum')).length;
      expect(forumReadsAfter).toBe(forumReadsBefore + 1); // honest repaint from a fresh read
    });
  });

  it('announcements render read-only — no compose or retract affordances', async () => {
    routeFetch();
    renderWing();
    const section = screen.getByRole('region', { name: 'Announcements' });
    expect(await within(section).findByText('Announcement title')).toBeInTheDocument();
    expect(within(section).getByText('Announcement body')).toBeInTheDocument();
    expect(within(section).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(section).queryByRole('button', { name: /retract|compose|send|post/i })).not.toBeInTheDocument();
  });

  it('conversations: the list opens into read-only message bodies with no compose/reply/leave affordances, and Back returns', async () => {
    routeFetch();
    renderWing();
    const section = screen.getByRole('region', { name: 'Conversations' });
    await userEvent.click(
      await within(section).findByTestId('open-conversation-c0000000-0000-4000-8000-000000000001'),
    );
    expect(await within(section).findByText('the message body evidence')).toBeInTheDocument();
    expect(within(section).getByText('Mona')).toBeInTheDocument(); // the resolved sender
    expect(within(section).queryByRole('textbox')).not.toBeInTheDocument();
    expect(
      within(section).queryByRole('button', { name: /send|reply|leave|join/i }),
    ).not.toBeInTheDocument();
    await userEvent.click(within(section).getByTestId('conversation-back'));
    expect(
      await within(section).findByTestId('open-conversation-c0000000-0000-4000-8000-000000000001'),
    ).toBeInTheDocument();
  });

  it('a section refusal (reactivation race) hands state drift to the parent instead of rendering zombie content', async () => {
    routeFetch({ forum: () => err(404) });
    const onStateDrift = renderWing();
    await waitFor(() => expect(onStateDrift).toHaveBeenCalled());
  });

  it('each fetching section shows a skeleton while pending (B6) without blocking the others', async () => {
    fetchMock.mockImplementation((input) => {
      const url = String(input);
      if (url.endsWith('/forum')) return new Promise<Response>(() => undefined); // forum never resolves
      if (url.endsWith('/announcements')) return Promise.resolve(ok(announcementsPayload));
      if (url.endsWith('/conversations')) return Promise.resolve(ok(conversationsPayload));
      return Promise.resolve(err(404));
    });
    renderWing();
    const forum = screen.getByRole('region', { name: 'Forum' });
    expect(within(forum).getByRole('status')).toBeInTheDocument();
    const announcements = screen.getByRole('region', { name: 'Announcements' });
    expect(await within(announcements).findByText('Announcement title')).toBeInTheDocument();
  });

  it('a failed section load shows a failure-isolated error with Retry; the other sections stand', async () => {
    routeFetch({ announcements: () => err(500, 'boom') });
    renderWing();
    const announcements = screen.getByRole('region', { name: 'Announcements' });
    expect(await within(announcements).findByRole('button', { name: /retry/i })).toBeInTheDocument();
    const forum = screen.getByRole('region', { name: 'Forum' });
    expect(await within(forum).findByText('The offending post')).toBeInTheDocument();
  });

  it('the loaded wing is axe-clean', async () => {
    routeFetch();
    const { container } = render(
      <AdminSuspendedContentWing
        groupId={GROUP_ID}
        groupName={GROUP_NAME}
        members={members as never}
        onStateDrift={jest.fn()}
      />,
    );
    await screen.findByText('The offending post');
    await screen.findByText('Announcement title');
    expect(await axe(container)).toHaveNoViolations();
  });
});
