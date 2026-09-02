'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { isGhostSessionRefusal } from '@/lib/auth/mist';
import { AppShell } from '@/components/shell/AppShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { InlineError } from '@/components/ui/InlineError';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { fetchMyJourneyEnrollments, peekMyJourneyEnrollments } from '@/lib/journeys/client';
import type { MyEnrollment } from '@/lib/journeys/queries';

/**
 * The minimal-but-real Mist-presence landing (FEAT-H003 STORY-2, extended by
 * FEAT-H004). Identity-level only: a real beginning + the become-a-FIM CTA (now
 * the in-place transcendence flow, FEAT-H004) + the "say goodbye" farewell
 * (explicit-erase, FEAT-H004 STORY-3). NOT a fake placeholder, NOT the
 * pre-designed near-side town (fundamentals before experience design). Gated by
 * status, never a role string: a FIM has no Mist chrome and is sent on; a
 * sessionless visitor returns to the entry. The farewell is offered to a Mist
 * only and confirms through `ConfirmModal` (never `confirm()`).
 */
export default function MistPresencePage() {
  const { identity, loading, sayGoodbye, dropGhostSession } = useAuth();
  const router = useRouter();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [farewellError, setFarewellError] = useState<string | null>(null);
  // J-O3 gate rider R4 (2026-07-19, Stefan's felt-walk finding): "Your
  // journeys" used to drop a returning Mist into the browse catalogue (their
  // walk buried; every other card gated). A Mist can hold exactly ONE
  // enrolment (substrate-enforced — the designated onboarding journey), so
  // the link resolves that walk and goes straight into the player at their
  // position (?enrollment= admits completed walks in review posture too).
  // The catalogue stays the honest fallback while no walk exists.
  const [walkHref, setWalkHref] = useState('/journeys');
  useEffect(() => {
    if (loading || identity !== 'mist') return;
    void (async () => {
      try {
        const list =
          peekMyJourneyEnrollments() ?? ((await fetchMyJourneyEnrollments()) as MyEnrollment[]);
        const walk = list.find((e) => e.kind === 'individual');
        if (walk) setWalkHref(`/journeys/${walk.journey_id}/play?enrollment=${walk.enrollment_id}`);
      } catch (err) {
        // TASK-MIST-01: a ghost session (the Mist behind this JWT was erased
        // server-side) is not a fallback case — drop it; the identity flips to
        // sessionless and the effect below sends the visitor to the entry.
        if (isGhostSessionRefusal(err)) {
          await dropGhostSession();
          return;
        }
        /* keep the catalogue fallback — the door stays a door */
      }
    })();
  }, [identity, loading, dropGhostSession]);

  useEffect(() => {
    if (loading) return;
    // Status-driven gating: only a Mist belongs on this surface.
    if (identity === 'fim') router.replace('/groups');
    else if (identity === 'sessionless') router.replace('/');
  }, [identity, loading, router]);

  if (loading || identity !== 'mist') {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <LoadingState label="Finding your footing..." />
      </main>
    );
  }

  async function handleFarewell() {
    setLeaving(true);
    setFarewellError(null);
    const { error } = await sayGoodbye();
    if (error) {
      // Surface the failure; the Mist remains (no navigation, modal closes).
      setFarewellError(error);
      setLeaving(false);
      setConfirmOpen(false);
      return;
    }
    // Erased — return to the sessionless entry (a later return is a new Mist).
    router.replace('/');
  }

  return (
    <AppShell title="FringeIsland">
      <div
        data-testid="mist-presence"
        className="mx-auto max-w-xl rounded-2xl bg-white p-10 text-center shadow-sm"
      >
        <h1 className="mb-3 text-3xl font-bold text-gray-900">You&rsquo;re here as a Mist</h1>
        <p className="mb-2 text-gray-600">
          This is your beginning. You can look around freely — you arrived without an account, and
          you owe nothing to be here.
        </p>
        <p className="mb-8 text-sm text-gray-500">
          A Mist&rsquo;s presence isn&rsquo;t kept between visits. Want FringeIsland to remember your
          path? That lasting memory is what becoming a FIM gives you.
        </p>

        {farewellError && (
          <div className="mb-6 text-left">
            <InlineError message={farewellError} />
          </div>
        )}

        <Link
          href="/become-a-fim"
          className="inline-block rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Become a FIM to keep your journey
        </Link>

        {/* FEAT-H023 (STORY-3): the walk stays deliberately resumable — the
            front door never re-launches, but it is always a door. */}
        <p className="mt-4 text-sm text-gray-600">
          <Link href={walkHref} className="font-medium text-blue-600 underline hover:text-blue-800">
            Your journeys
          </Link>{' '}
          — continue your walk whenever you choose.
        </p>

        <p className="mt-6 text-sm text-gray-500">
          Not staying?{' '}
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="font-medium text-gray-600 underline hover:text-gray-800"
          >
            Say goodbye
          </button>{' '}
          and we&rsquo;ll erase your visit.
        </p>
      </div>

      <ConfirmModal
        isOpen={confirmOpen}
        variant="danger"
        title="Say goodbye?"
        message="This erases your visit immediately and you'll return to the start. A later visit begins fresh — nothing from this one is kept."
        confirmText="Erase my visit"
        cancelText="Keep looking around"
        busy={leaving}
        onConfirm={handleFarewell}
        onCancel={() => setConfirmOpen(false)}
      />
    </AppShell>
  );
}
