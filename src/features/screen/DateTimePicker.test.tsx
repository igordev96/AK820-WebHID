import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DateTimePicker } from './DateTimePicker';

const at = new Date(2026, 9, 29, 20, 40, 26);

describe('DateTimePicker', () => {
  it('keeps the time when another day is picked', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DateTimePicker value={at} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: '2026-10-29 20:40:26' }));

    const grid = screen.getByRole('grid');
    const cell = within(grid)
      .getAllByRole('gridcell')
      .find((item) => item.textContent?.trim() === '15');

    expect(cell).toBeDefined();
    await user.click(within(cell as HTMLElement).getByRole('button'));

    const next = onChange.mock.calls[0]?.[0] as Date;
    expect(next.getFullYear()).toBe(2026);
    expect(next.getMonth()).toBe(9);
    expect(next.getDate()).toBe(15);
    expect(next.getHours()).toBe(20);
    expect(next.getMinutes()).toBe(40);
    expect(next.getSeconds()).toBe(26);
  });

  it('keeps the day when the time changes', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DateTimePicker value={at} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: '2026-10-29 20:40:26' }));
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '03:04:05' } });

    const next = onChange.mock.calls[0]?.[0] as Date;
    expect(next.getHours()).toBe(3);
    expect(next.getMinutes()).toBe(4);
    expect(next.getSeconds()).toBe(5);
    expect(next.getDate()).toBe(29);
  });

  it('offers month and year dropdowns', async () => {
    const user = userEvent.setup();
    render(<DateTimePicker value={at} onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '2026-10-29 20:40:26' }));

    expect(screen.getByLabelText('Month')).toBeInTheDocument();
    expect(screen.getByLabelText('Year')).toBeInTheDocument();
  });

  it('closes on Done', async () => {
    const user = userEvent.setup();
    render(<DateTimePicker value={at} onChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: '2026-10-29 20:40:26' }));
    expect(screen.getByLabelText('Pick a date and time')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByLabelText('Pick a date and time')).not.toBeInTheDocument();
  });

  it('jumps to the current time with Now', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DateTimePicker value={at} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: '2026-10-29 20:40:26' }));
    await user.click(screen.getByRole('button', { name: 'Now' }));

    const next = onChange.mock.calls[0]?.[0] as Date;
    expect(Math.abs(next.getTime() - Date.now())).toBeLessThan(5000);
  });
});
