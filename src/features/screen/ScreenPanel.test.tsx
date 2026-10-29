import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ScreenPanel } from './ScreenPanel';

const renderPanel = (onSend = vi.fn()) =>
  render(
    <ScreenPanel
      connected
      screenReady
      busy={false}
      status={{ kind: 'idle' }}
      animationStatus={{ kind: 'idle' }}
      animationProgress={null}
      animationSending={false}
      onSend={onSend}
      onSendAnimation={vi.fn()}
    />,
  );

describe('ScreenPanel', () => {
  it('previews the local time and sends it', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    renderPanel(onSend);

    expect(screen.getByRole('img', { name: /screen preview showing/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Send time' }));

    expect(onSend).toHaveBeenCalledTimes(1);
    expect(onSend.mock.calls[0]?.[0]).toBeInstanceOf(Date);
  });

  it('sends the custom time chosen in the picker', async () => {
    const onSend = vi.fn();
    const user = userEvent.setup();
    renderPanel(onSend);

    await user.click(screen.getByRole('tab', { name: 'Custom' }));
    await user.click(screen.getByRole('button', { name: /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/ }));
    fireEvent.change(screen.getByLabelText('Time'), { target: { value: '03:04:05' } });
    await user.click(screen.getByRole('button', { name: 'Done' }));

    expect(screen.getByRole('img', { name: /03:04:05/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Send time' }));

    const sent = onSend.mock.calls[0]?.[0] as Date;
    expect(sent.getHours()).toBe(3);
    expect(sent.getMinutes()).toBe(4);
    expect(sent.getSeconds()).toBe(5);
  });
});
