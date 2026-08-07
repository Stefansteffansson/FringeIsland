import '@testing-library/jest-dom';
import { describe, it, expect } from '@jest/globals';
import { render, screen, within } from '@testing-library/react';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import type { NotificationRow } from '@/lib/notifications/queries';

/**
 * RD-B FEAT-H044 STORY-4 (unit) — the three passive distribution notices.
 *
 * News, not an ask (RD-7). `dispatch_segment` is NULL server-side for all
 * three kinds, so they take the existing passive render path and the bell
 * gains no new answerable affordance — the act happens in the roles panel.
 * Contrast N-E, whose invitation was genuinely answerable in place.
 *
 * Copy is server-authored (FEAT-PC028 STORY-6) and never re-worded by the
 * surface (the V3 surfaces law). These cells therefore assert the surface
 * renders the platform's sentence VERBATIM — including the one that stops the
 * retirement notice reading as a loss.
 *
 * HONEST PROVENANCE — this file is NOT red-first, and says so.
 *
 * The Hub's passive render path already existed (FEAT-H030) and is
 * kind-agnostic, so the three copy cells and the two-group cell were green the
 * first time they ran: they are REGRESSION PINS on shipped behaviour, not
 * test-first drivers. They earn their place because the copy they pin is the
 * product (the retirement sentence especially), and nothing else asserts that
 * these kinds render passively.
 *
 * The icon cell is TEST-AFTER: the `roles` entry was added before this file
 * existed. It was verified non-vacuous by control — removing the entry fails
 * it with the bell fallback's class, which is precisely the silent-fallback
 * failure mode that let the gap ship unnoticed in the first place.
 */
const row = (over: Partial<NotificationRow> = {}): NotificationRow => ({
  id: 'ntf-1',
  kind: 'role_template_published',
  category: 'roles',
  title: 'New role available',
  body: 'The role "Greeter" is now available to copy into your group.',
  group_id: 'grp-1',
  created_at: '2026-08-07T09:00:00+00:00',
  is_read: false,
  read_at: null,
  action_type: null,
  action_data: null,
  action_taken: null,
  expires_at: null,
  // The passive contract: NULL segment, no response set.
  dispatch_segment: null,
  responses: null,
  ...over,
});

describe('FEAT-H044 STORY-4 — the three role-distribution notices', () => {
  it('renders the published notice as news, with no accept/decline affordance', () => {
    render(<NotificationItem row={row()} />);
    expect(
      screen.getByText('The role "Greeter" is now available to copy into your group.'),
    ).toBeInTheDocument();
    // RD-7: no answerable affordance anywhere on the row.
    expect(screen.queryByRole('button', { name: /accept|decline|respond/i })).not.toBeInTheDocument();
  });

  it('renders the update notice verbatim', () => {
    render(
      <NotificationItem
        row={row({
          id: 'ntf-2',
          kind: 'role_template_updated',
          title: 'Role update available',
          body:
            'A newer version of the role "Guide" is available. Review the changes before copying them into your group.',
        })}
      />,
    );
    expect(
      screen.getByText(
        'A newer version of the role "Guide" is available. Review the changes before copying them into your group.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept|decline|respond/i })).not.toBeInTheDocument();
  });

  it('renders the retirement notice INCLUDING the sentence that stops it reading as a loss', () => {
    render(
      <NotificationItem
        row={row({
          id: 'ntf-3',
          kind: 'role_template_retired',
          title: 'Role no longer offered',
          body:
            'The role "Observer" is no longer offered by the platform. Your group\'s existing copy is unaffected.',
        })}
      />,
    );
    // The whole sentence, not a paraphrase — the surface never re-words
    // server-authored copy, and this clause is the reason the notice is not
    // frightening.
    expect(
      screen.getByText(
        'The role "Observer" is no longer offered by the platform. Your group\'s existing copy is unaffected.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /accept|decline|respond/i })).not.toBeInTheDocument();
  });

  it('gives the roles category its own icon rather than the bell fallback', () => {
    // The open-registry trap the platform half's sweep found: an unregistered
    // category renders the fallback rather than failing, so a missing entry
    // ships unnoticed. Pinned by comparing against a category that genuinely
    // has no entry.
    const { container: withEntry } = render(<NotificationItem row={row()} />);
    const { container: fallback } = render(
      <NotificationItem row={row({ id: 'ntf-x', category: 'not-a-registered-category' })} />,
    );
    const iconOf = (c: HTMLElement) => c.querySelector('svg')?.getAttribute('class') ?? '';
    expect(iconOf(withEntry)).not.toBe('');
    expect(iconOf(withEntry)).not.toBe(iconOf(fallback));
  });

  it('names its own group on every notice, so a two-group holder need not guess', () => {
    // The recipient holds manage_roles in two groups and both notices arrive.
    // Each body names its own group server-side; the surface must render both
    // distinctly rather than collapsing them.
    const first = row({
      id: 'ntf-a',
      group_id: 'grp-1',
      body: 'The role "Greeter" is now available to copy into Willow Circle.',
    });
    const second = row({
      id: 'ntf-b',
      group_id: 'grp-2',
      body: 'The role "Greeter" is now available to copy into Harbour Crew.',
    });
    render(
      <div>
        <div data-testid="n-a">
          <NotificationItem row={first} />
        </div>
        <div data-testid="n-b">
          <NotificationItem row={second} />
        </div>
      </div>,
    );
    expect(within(screen.getByTestId('n-a')).getByText(/Willow Circle/)).toBeInTheDocument();
    expect(within(screen.getByTestId('n-b')).getByText(/Harbour Crew/)).toBeInTheDocument();
  });
});
