import type { ReactNode } from 'react';
import type { Identity } from '@/lib/auth/mist';
import type { AccountState } from '@/lib/account/queries';
import { LoadingState } from '@/components/ui/LoadingState';
import { AccountStateSurface } from '@/components/account/AccountStateSurface';

/**
 * FEAT-H006 — render account state (IDN-9). Pure branch over the resolved
 * identity + account state:
 *  - non-FIM (Mist/sessionless): no account-lifecycle surface — pass through.
 *  - loading: a loading state (never a blank-but-interactive shell).
 *  - error: an honest retry surface — NEVER silently render the active experience.
 *  - active: the normal experience (children).
 *  - suspended: an admin hold — "contact an admin", NO self-reactivation (IDN-12
 *    is deferred until self-pause + a deactivation-origin field exist).
 *  - decommissioned: terminal, permanently closed.
 *  - unknown/future label: a safe default surface (extensibility — never crash,
 *    never fall through to the active experience).
 */
export function AccountStateView({
  identity,
  loading,
  error,
  state,
  onRetry,
  onSignOut,
  children,
}: {
  identity: Identity;
  loading: boolean;
  error: string | null;
  state: AccountState | null;
  onRetry: () => void;
  onSignOut: () => void;
  children: ReactNode;
}) {
  // Only a FIM has a durable account-lifecycle state (gate on identity status,
  // never a role string — products-tier rule). Mist/sessionless pass through.
  if (identity !== 'fim') return <>{children}</>;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <LoadingState label="Checking your account..." />
      </div>
    );
  }

  if (error) {
    return (
      <AccountStateSurface
        testId="account-error-surface"
        role="alert"
        title="We couldn't load your account"
        message={error}
        onRetry={onRetry}
        onSignOut={onSignOut}
      />
    );
  }

  switch (state?.state) {
    case undefined:
    case 'active':
      // Defensive: a missing state never traps an otherwise-active member.
      return <>{children}</>;
    case 'suspended':
      return (
        <AccountStateSurface
          testId="account-suspended-surface"
          title="Your account is suspended"
          message="Your account has been suspended by an administrator. Please contact support to resolve this."
          onSignOut={onSignOut}
        />
      );
    case 'decommissioned':
      return (
        <AccountStateSurface
          testId="account-closed-surface"
          title="This account is closed"
          message="This account has been permanently closed. It can't be reopened."
          onSignOut={onSignOut}
        />
      );
    default:
      return (
        <AccountStateSurface
          testId="account-unknown-surface"
          title="Your account isn't active"
          message="Your account isn't currently active. Please contact support if you think this is a mistake."
          onSignOut={onSignOut}
        />
      );
  }
}
