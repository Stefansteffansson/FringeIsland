import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { SuspendedGroupShell } from '@/components/groups/SuspendedGroupShell';

/**
 * FEAT-H049 STORY-3 (DB-4) — the suspended wall says why. The shell renders
 * the FEAT-PC030 `hold_reason` (present for members only — the platform
 * decides) beneath its sentence; when null it renders exactly as before.
 * WRITTEN RED-FIRST (2026-09-03): the shell ignores `hold_reason` at head.
 */
describe('SuspendedGroupShell — the reason given (FEAT-H049 STORY-3)', () => {
  it('renders "Reason given: …" beneath the sentence when hold_reason is present', () => {
    render(
      <SuspendedGroupShell
        group={{ id: 'g1', name: 'Harbour Circle', status: 'suspended', hold_reason: 'Repeated harassment reports' }}
      />,
    );
    const reason = screen.getByTestId('hold-reason');
    expect(reason).toHaveTextContent('Reason given: Repeated harassment reports');
    expect(screen.getByText(/This group is suspended/)).toBeInTheDocument();
  });

  it('renders no reason line when hold_reason is null or absent — the shell as it was', () => {
    render(<SuspendedGroupShell group={{ id: 'g1', name: 'Harbour Circle', status: 'suspended', hold_reason: null }} />);
    expect(screen.queryByTestId('hold-reason')).not.toBeInTheDocument();
    expect(screen.getByText(/This group is suspended/)).toBeInTheDocument();
    render(<SuspendedGroupShell group={{ id: 'g2', name: 'Quiet Cove', status: 'suspended' }} />);
    expect(screen.queryByTestId('hold-reason')).not.toBeInTheDocument();
  });
});
