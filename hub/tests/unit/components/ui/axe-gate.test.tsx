import '@testing-library/jest-dom';
import { describe, it, expect } from '@jest/globals';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { InlineError } from '@/components/ui/InlineError';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Menu } from '@/components/ui/Menu';

expect.extend(toHaveNoViolations);

/**
 * COR-C W7 — the axe gate on the design-system seed (Audit III GC-12, a11y
 * half; ruling R-6). Every shipped `components/ui/` primitive renders through
 * axe-core with zero violations — the mechanical floor under the W5 manual
 * fixes (AC3-8/17/18 were all findable by exactly this sweep, and none of it
 * was gated). The axe-Playwright page-level sweep is the Eid-side follow-up;
 * this covers the primitives where every surface inherits its markup from.
 */

async function expectClean(ui: React.ReactElement) {
  const { container } = render(ui);
  expect(await axe(container)).toHaveNoViolations();
}

describe('Axe gate — components/ui/ primitives (COR-C W7, GC-12)', () => {
  it('Button', async () => {
    await expectClean(<Button>Save</Button>);
  });

  it('TextField — plain and with error', async () => {
    await expectClean(
      <>
        <TextField label="Nickname" />
        <TextField label="Email" error="That email is taken" />
      </>,
    );
  });

  it('InlineError', async () => {
    await expectClean(<InlineError message="Something went wrong" />);
  });

  it('EmptyState', async () => {
    await expectClean(<EmptyState title="Nothing here" description="Come back later." />);
  });

  it('LoadingState (instant)', async () => {
    await expectClean(<LoadingState delay={0} />);
  });

  it('ConfirmModal (open, danger)', async () => {
    await expectClean(
      <ConfirmModal
        isOpen
        title="Delete this?"
        message="Really?"
        variant="danger"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
  });

  it('Menu (open)', async () => {
    const { container, getByRole } = render(
      <Menu
        buttonContent={<span>Open</span>}
        buttonAriaLabel="Example menu"
        items={[
          { key: 'a', label: 'First', href: '/a' },
          { key: 'b', label: 'Second', onSelect: () => {} },
        ]}
      />,
    );
    getByRole('button', { name: 'Example menu' }).click();
    expect(await axe(container)).toHaveNoViolations();
  });
});
