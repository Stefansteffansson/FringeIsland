import '@testing-library/jest-dom';
import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { TextField } from '@/components/ui/TextField';

/**
 * COR-C W5 (Audit III AC3-18) — TextField must never orphan its own label,
 * and an error must be programmatically tied to the field. RED at HEAD: an
 * omitted `id` silently breaks the label-for wiring (login/signup/profile/
 * group-create all flow through this primitive), and no error wiring exists.
 */

describe('TextField — label + error wiring (COR-C W5, AC3-18)', () => {
  it('wires label to input even when no id is given (useId fallback — never an orphaned label)', () => {
    render(<TextField label="Nickname" />);
    // getByLabelText resolves ONLY through real label-for/id association.
    expect(screen.getByLabelText('Nickname')).toBeInstanceOf(HTMLInputElement);
  });

  it('keeps an explicit id when one is given', () => {
    render(<TextField label="Email" id="email-field" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'email-field');
  });

  it('an error wires aria-invalid and aria-describedby to the rendered InlineError', () => {
    render(<TextField label="Email" error="That email is taken" />);
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const errorNode = document.getElementById(describedBy!);
    expect(errorNode).not.toBeNull();
    expect(errorNode).toHaveTextContent('That email is taken');
    expect(screen.getByRole('alert')).toHaveTextContent('That email is taken');
  });

  it('no error, no error wiring — the attributes are absent, not empty', () => {
    render(<TextField label="Email" />);
    const input = screen.getByLabelText('Email');
    expect(input).not.toHaveAttribute('aria-invalid');
    expect(input).not.toHaveAttribute('aria-describedby');
  });
});
