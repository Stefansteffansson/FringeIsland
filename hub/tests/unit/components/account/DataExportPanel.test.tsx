import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { getTelemetrySink } from '@/lib/observability/telemetry';

/**
 * FEAT-H010 (unit) — the DataExportPanel orchestrates the "download my data"
 * action (IDN-8): a button that fetches the member's own export via the paired
 * contract and hands it to them as a file, with honest loading + error states.
 * It is a faithful courier — it never parses or reshapes the document.
 *
 * Red-first: fails to import until `hub/components/account/DataExportPanel.tsx`
 * exists.
 */
const fetchDataExport = jest.fn<() => Promise<unknown>>();
const downloadJson = jest.fn();

jest.mock('@/lib/account/export-client', () => ({
  fetchDataExport: () => fetchDataExport(),
  downloadJson: (...args: unknown[]) =>
    (downloadJson as unknown as (...a: unknown[]) => unknown)(...args),
  DEFAULT_EXPORT_FILENAME: 'fringeisland-data-export.json',
}));

import { DataExportPanel } from '@/components/account/DataExportPanel';

const SAMPLE_DOC = { schema_version: 1, subject: { email: 'a@b.c' }, consent: [], memberships: [] };

const emitted = (name: string) => getTelemetrySink().some((e) => e.name === name);
const downloadButton = () => screen.getByRole('button', { name: /download my data/i });

beforeEach(() => {
  fetchDataExport.mockReset().mockResolvedValue(SAMPLE_DOC);
  downloadJson.mockReset();
});

describe('DataExportPanel (FEAT-H010 — download my data)', () => {
  it('STORY-4: explains what the download contains and offers the action', () => {
    render(<DataExportPanel />);
    // plain-language list of what is included (own data)
    expect(screen.getByText(/profile/i)).toBeInTheDocument();
    expect(screen.getByText(/consent history/i)).toBeInTheDocument();
    expect(screen.getByText(/group memberships/i)).toBeInTheDocument();
    expect(downloadButton()).toBeEnabled();
  });

  it('STORY-1: clicking downloads the document the contract returns (faithful courier)', async () => {
    render(<DataExportPanel />);
    await userEvent.click(downloadButton());

    await waitFor(() => expect(fetchDataExport).toHaveBeenCalledTimes(1));
    // the exact document is handed to the download helper, unparsed/unreshaped
    expect(downloadJson).toHaveBeenCalledWith(SAMPLE_DOC, 'fringeisland-data-export.json');
    expect(emitted('export.downloaded')).toBe(true);
  });

  it('STORY-2: shows a loading state and cannot be double-fired while in flight', async () => {
    let resolve!: (v: unknown) => void;
    fetchDataExport.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<DataExportPanel />);

    await userEvent.click(downloadButton());
    // mid-flight: the action is disabled (no overlapping requests)
    expect(downloadButton()).toBeDisabled();

    resolve(SAMPLE_DOC);
    await waitFor(() => expect(downloadButton()).toBeEnabled());
    expect(fetchDataExport).toHaveBeenCalledTimes(1);
  });

  it('STORY-2: a failed request shows a clear error with retry and downloads nothing', async () => {
    fetchDataExport.mockRejectedValueOnce(new Error('boom'));
    render(<DataExportPanel />);

    await userEvent.click(downloadButton());

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(downloadJson).not.toHaveBeenCalled();
    expect(emitted('export.download_failed')).toBe(true);
    // recoverable — the action is available again to retry
    expect(downloadButton()).toBeEnabled();
  });
});
