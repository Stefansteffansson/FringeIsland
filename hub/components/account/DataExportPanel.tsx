'use client';

import { useState } from 'react';
import { fetchDataExport, downloadJson, DEFAULT_EXPORT_FILENAME } from '@/lib/account/export-client';
import { InlineError } from '@/components/ui/InlineError';
import { emitTelemetry } from '@/lib/observability/telemetry';

/**
 * FEAT-H010 — the "download my data" surface (IDN-8).
 *
 * A FIM requests their own complete data; the Hub fetches it via the paired
 * FEAT-PC008 contract (`GET /api/account/export`) and hands it to them as a
 * file. A faithful courier: it never parses or reshapes the document — whatever
 * the versioned contract returns (including future sections) flows through. The
 * page mounts this only for FIMs (gated upstream). Read-only — no erasure (that
 * is the later IDN-10 seam).
 */
export function DataExportPanel() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    if (loading) return; // no overlapping requests
    setLoading(true);
    setError(null);
    try {
      const doc = await fetchDataExport();
      downloadJson(doc, DEFAULT_EXPORT_FILENAME);
      emitTelemetry('export.downloaded');
    } catch (err) {
      setError('We could not prepare your download. Please try again.');
      emitTelemetry('export.download_failed', { message: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <p className="mb-4 text-sm text-gray-600">
          Download a copy of your own data — your profile, account state, consent history, and
          group memberships. It is a machine-readable file, just for you. (More is added over
          time as the platform grows.)
        </p>
        <button
          type="button"
          onClick={handleDownload}
          disabled={loading}
          aria-label="Download my data"
          aria-busy={loading}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Preparing your download…' : 'Download my data'}
        </button>
      </div>
      {error && <InlineError message={error} />}
    </div>
  );
}
