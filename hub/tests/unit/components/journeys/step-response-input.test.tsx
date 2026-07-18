import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { StepResponseInput } from '@/components/journeys/StepResponseInput';

/**
 * FEAT-H024 STORY-1/2/3 (unit) — the Ask's capture input. A plain textarea
 * labelled by the step's own `ask_verb` (the registry speaks — never a kind
 * list), prefilled from the saved response, saving in the background on blur
 * and on unmount (save-on-navigation), with a quiet saved/unsaved indicator
 * that tells the truth. A failure keeps the traveller's words with a retry —
 * never silent loss. An emptied input saves as the retraction. `readOnly`
 * (frozen posture) shows the words with the pen down. Optional-always:
 * no required state exists anywhere (invariant 3).
 *
 * Red-first for TASK-JF-04 — fails until the component exists.
 */

type OnSave = (body: string) => Promise<{ body: string }>;

describe('StepResponseInput — the Ask collects (STORY-1)', () => {
  it('renders a textarea labelled by the ask_verb, prefilled, never required', () => {
    render(
      <StepResponseInput askVerb="Reflect" initialBody="My words." onSave={jest.fn<OnSave>()} />,
    );
    const input = screen.getByTestId('response-input') as HTMLTextAreaElement;
    expect(input.value).toBe('My words.');
    expect(input.required).toBe(false); // optional-always — capture is never a toll gate
    expect(screen.getByTestId('response-label').textContent).toContain('Reflect');
  });

  it('saves on blur in the background and shows the quiet Saved indicator', async () => {
    const onSave = jest.fn<OnSave>().mockResolvedValue({ body: 'New words.' });
    render(<StepResponseInput askVerb="Reflect" initialBody="" onSave={onSave} />);
    const input = screen.getByTestId('response-input');
    fireEvent.change(input, { target: { value: 'New words.' } });
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledWith('New words.');
    await waitFor(() =>
      expect(screen.getByTestId('response-indicator').textContent).toContain('Saved'),
    );
  });

  it('does not save on blur when nothing changed — no write churn', () => {
    const onSave = jest.fn<OnSave>();
    render(<StepResponseInput askVerb="Reflect" initialBody="Same words." onSave={onSave} />);
    fireEvent.blur(screen.getByTestId('response-input'));
    expect(onSave).not.toHaveBeenCalled();
  });

  it('keeps the words with a retry when the save fails — never silent loss', async () => {
    const onSave = jest
      .fn<OnSave>()
      .mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }))
      .mockResolvedValueOnce({ body: 'Fragile words.' });
    render(<StepResponseInput askVerb="Write an entry" initialBody="" onSave={onSave} />);
    const input = screen.getByTestId('response-input') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: 'Fragile words.' } });
    fireEvent.blur(input);
    await waitFor(() =>
      expect(screen.getByTestId('response-indicator').textContent).toContain('Not saved'),
    );
    expect(input.value).toBe('Fragile words.'); // the words stay in the input
    fireEvent.click(screen.getByTestId('response-retry'));
    await waitFor(() =>
      expect(screen.getByTestId('response-indicator').textContent).toContain('Saved'),
    );
    expect(onSave).toHaveBeenCalledTimes(2);
  });

  it('flushes a dirty draft on unmount — the save-on-navigation path', () => {
    const onSave = jest.fn<OnSave>().mockResolvedValue({ body: 'Parting words.' });
    const { unmount } = render(
      <StepResponseInput askVerb="Reflect" initialBody="" onSave={onSave} />,
    );
    fireEvent.change(screen.getByTestId('response-input'), {
      target: { value: 'Parting words.' },
    });
    unmount();
    expect(onSave).toHaveBeenCalledWith('Parting words.');
  });
});

describe('StepResponseInput — retraction and the frozen pen (STORY-2/3)', () => {
  it('an emptied input saves as the clear (words retracted; STORY-2)', async () => {
    const onSave = jest.fn<OnSave>().mockResolvedValue({ body: '' });
    render(<StepResponseInput askVerb="Reflect" initialBody="Old words." onSave={onSave} />);
    const input = screen.getByTestId('response-input');
    fireEvent.change(input, { target: { value: '' } });
    fireEvent.blur(input);
    expect(onSave).toHaveBeenCalledWith('');
    await waitFor(() =>
      expect(screen.getByTestId('response-indicator').textContent).toContain('Saved'),
    );
  });

  it('readOnly shows the words with the pen down — disabled, no save fires (STORY-3)', () => {
    const onSave = jest.fn<OnSave>();
    render(
      <StepResponseInput askVerb="Reflect" initialBody="Frozen words." readOnly onSave={onSave} />,
    );
    const input = screen.getByTestId('response-input') as HTMLTextAreaElement;
    expect(input.disabled).toBe(true);
    expect(input.value).toBe('Frozen words.');
    fireEvent.blur(input);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByTestId('response-retry')).toBeNull();
  });
});
