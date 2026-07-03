import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { JournalEntry } from '@/lib/journal/queries';

/**
 * FEAT-H011 STORY-1..3 (unit) — the journal panel.
 * List (newest-first, as served), empty state, compose (body required, failed
 * save preserves the text), edit in place, ConfirmModal-gated delete, and
 * keyset "load older". The client module is mocked — the panel's contract is
 * behaviour over the FEAT-PD001-backed BFF, not transport. Red-first for
 * TASK-H011-02.
 */

const fetchJournalEntries =
  jest.fn<(opts?: { before?: string }) => Promise<JournalEntry[]>>();
const postJournalEntry =
  jest.fn<(title: string | null, body: string) => Promise<JournalEntry>>();
const patchJournalEntry =
  jest.fn<(id: string, title: string | null, body: string) => Promise<JournalEntry>>();
const removeJournalEntry = jest.fn<(id: string) => Promise<void>>();

jest.mock('@/lib/journal/client', () => ({
  fetchJournalEntries: (opts?: { before?: string }) => fetchJournalEntries(opts),
  postJournalEntry: (t: string | null, b: string) => postJournalEntry(t, b),
  patchJournalEntry: (id: string, t: string | null, b: string) => patchJournalEntry(id, t, b),
  removeJournalEntry: (id: string) => removeJournalEntry(id),
}));

import { JournalPanel } from '@/components/journal/JournalPanel';

const entry = (id: string, body: string, title: string | null = null): JournalEntry => ({
  id,
  title,
  body,
  created_at: `2026-07-0${id.length % 9 || 1}T10:00:00Z`,
  updated_at: `2026-07-0${id.length % 9 || 1}T10:00:00Z`,
});

describe('FEAT-H011 — JournalPanel (STORY-1..3)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders fetched entries with title, body, and a date (STORY-2)', async () => {
    fetchJournalEntries.mockResolvedValue([
      { ...entry('a', 'newer thought', 'Titled'), created_at: '2026-07-02T10:00:00Z' },
      { ...entry('b', 'older thought'), created_at: '2026-07-01T10:00:00Z' },
    ]);
    render(<JournalPanel />);

    expect(await screen.findByText('newer thought')).toBeInTheDocument();
    expect(screen.getByText('Titled')).toBeInTheDocument();
    expect(screen.getByText('older thought')).toBeInTheDocument();
    const items = screen.getAllByTestId('journal-entry');
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText('newer thought')).toBeInTheDocument();
  });

  it('shows the empty state inviting the first entry (STORY-1)', async () => {
    fetchJournalEntries.mockResolvedValue([]);
    render(<JournalPanel />);
    expect(await screen.findByTestId('journal-empty')).toBeInTheDocument();
  });

  it('creates an entry and re-reads the list; the composer clears (STORY-1)', async () => {
    fetchJournalEntries.mockResolvedValueOnce([]);
    const created = entry('new1', 'first words');
    postJournalEntry.mockResolvedValue(created);
    fetchJournalEntries.mockResolvedValueOnce([created]);

    render(<JournalPanel />);
    await screen.findByTestId('journal-empty');

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/entry/i), 'first words');
    await user.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(postJournalEntry).toHaveBeenCalledWith(null, 'first words');
    });
    expect(await screen.findByText('first words')).toBeInTheDocument();
    expect((screen.getByLabelText(/entry/i) as HTMLTextAreaElement).value).toBe('');
  });

  it('a failed save shows an error and preserves the typed text (STORY-1)', async () => {
    fetchJournalEntries.mockResolvedValue([]);
    postJournalEntry.mockRejectedValue(new Error('Failed to save the entry'));

    render(<JournalPanel />);
    await screen.findByTestId('journal-empty');

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/entry/i), 'precious words');
    await user.click(screen.getByRole('button', { name: /save entry/i }));

    expect(await screen.findByTestId('journal-action-error')).toBeInTheDocument();
    expect((screen.getByLabelText(/entry/i) as HTMLTextAreaElement).value).toBe(
      'precious words',
    );
  });

  it('the save control requires a body — no empty entries leave the surface (STORY-1)', async () => {
    fetchJournalEntries.mockResolvedValue([]);
    render(<JournalPanel />);
    await screen.findByTestId('journal-empty');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /save entry/i }));
    expect(postJournalEntry).not.toHaveBeenCalled();
  });

  it('edits an entry in place and re-reads (STORY-3)', async () => {
    const original = entry('e1', 'draft words', 'Draft');
    fetchJournalEntries.mockResolvedValueOnce([original]);
    const revised = { ...original, title: 'Kept', body: 'revised words' };
    patchJournalEntry.mockResolvedValue(revised);
    fetchJournalEntries.mockResolvedValueOnce([revised]);

    render(<JournalPanel />);
    await screen.findByText('draft words');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /edit/i }));
    const bodyField = screen.getByDisplayValue('draft words');
    await user.clear(bodyField);
    await user.type(bodyField, 'revised words');
    await user.click(screen.getByRole('button', { name: /save entry/i }));

    await waitFor(() => {
      expect(patchJournalEntry).toHaveBeenCalledWith('e1', 'Draft', 'revised words');
    });
    expect(await screen.findByText('revised words')).toBeInTheDocument();
  });

  it('delete asks through ConfirmModal and only removes on confirm (STORY-3)', async () => {
    const doomed = entry('d1', 'ephemeral');
    fetchJournalEntries.mockResolvedValueOnce([doomed]);
    removeJournalEntry.mockResolvedValue(undefined);
    fetchJournalEntries.mockResolvedValueOnce([]);

    render(<JournalPanel />);
    await screen.findByText('ephemeral');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /delete/i }));
    // the modal is the gate — nothing removed yet
    expect(removeJournalEntry).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /yes, delete/i }));
    await waitFor(() => {
      expect(removeJournalEntry).toHaveBeenCalledWith('d1');
    });
    expect(await screen.findByTestId('journal-empty')).toBeInTheDocument();
  });

  it('loads older entries via keyset pagination (STORY-2)', async () => {
    const newer = { ...entry('n1', 'recent'), created_at: '2026-07-02T10:00:00Z' };
    fetchJournalEntries.mockResolvedValueOnce([newer]);
    const older = { ...entry('o1', 'ancient'), created_at: '2026-06-01T10:00:00Z' };
    fetchJournalEntries.mockResolvedValueOnce([older]);

    render(<JournalPanel />);
    await screen.findByText('recent');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /load older/i }));

    await waitFor(() => {
      expect(fetchJournalEntries).toHaveBeenLastCalledWith({ before: '2026-07-02T10:00:00Z' });
    });
    expect(await screen.findByText('ancient')).toBeInTheDocument();
    expect(screen.getByText('recent')).toBeInTheDocument();
  });
});
