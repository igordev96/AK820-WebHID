import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { formatTimeInput } from '@/lib/hid';
import { ClockCard, type ClockCardProps } from './ClockCard';

const at = new Date(2026, 9, 29, 20, 40, 26);

const baseProps = (overrides: Partial<ClockCardProps> = {}): ClockCardProps => ({
  mode: 'now',
  preview: at,
  connected: true,
  busy: false,
  status: { kind: 'idle' },
  onModeChange: vi.fn(),
  onCustomChange: vi.fn(),
  onSend: vi.fn(),
  ...overrides,
});

describe('ClockCard', () => {
  it('previews the current time and sends it', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    render(<ClockCard {...baseProps({ onSend })} />);

    expect(screen.getByText('20:40:26')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send time' }));
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('asks for the custom mode through the tabs', async () => {
    const onModeChange = vi.fn();
    const user = userEvent.setup();
    render(<ClockCard {...baseProps({ onModeChange })} />);

    await user.click(screen.getByRole('tab', { name: 'Custom' }));
    expect(onModeChange).toHaveBeenCalledWith('custom');
  });

  it('shows the picker in custom mode', () => {
    render(<ClockCard {...baseProps({ mode: 'custom' })} />);

    const picker = screen.getByRole('button', {
      name: `Date and time ${formatTimeInput(at)}`,
    });
    expect(picker).toBeInTheDocument();
    expect(picker).toBeEnabled();
  });

  it('locks the controls during a send', () => {
    render(<ClockCard {...baseProps({ busy: true })} />);

    expect(screen.getByRole('button', { name: 'Sending…' })).toBeDisabled();
    expect(screen.getByRole('tab', { name: 'Custom' })).toBeDisabled();
  });

  it('asks for a connection before offering a write', () => {
    render(<ClockCard {...baseProps({ connected: false })} />);

    expect(screen.getByRole('button', { name: 'Send time' })).toBeDisabled();
    expect(screen.getByText('Connect the keyboard to send the time.')).toBeInTheDocument();
  });

  it('reports a successful send', () => {
    render(<ClockCard {...baseProps({ status: { kind: 'ok', at } })} />);

    expect(screen.getByText(/Sent\. The screen clock is set to 20:40:26/)).toBeInTheDocument();
  });

  it('shows the six time bytes it will send', () => {
    render(<ClockCard {...baseProps()} />);

    const bytes = screen.getByText('What gets sent').closest('details');
    expect(bytes).toHaveTextContent('1A');
    expect(bytes).toHaveTextContent('0A');
    expect(bytes).toHaveTextContent('1D');
  });
});
