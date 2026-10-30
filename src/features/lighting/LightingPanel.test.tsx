import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LightingPanel } from './LightingPanel';

describe('LightingPanel', () => {
  it('shows the keyboard preview with key labels', () => {
    render(<LightingPanel connected busy={false} status={{ kind: 'idle' }} onApply={vi.fn()} />);

    expect(screen.getByRole('img', { name: /keyboard light preview/i })).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
  });

  it('applies the default colour and brightness', async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();
    render(<LightingPanel connected busy={false} status={{ kind: 'idle' }} onApply={onApply} />);

    await user.click(screen.getByRole('button', { name: 'Apply light' }));

    expect(onApply).toHaveBeenCalledWith('#ff8000', 3);
  });

  it('sends the colour and brightness that were chosen', async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();
    render(<LightingPanel connected busy={false} status={{ kind: 'idle' }} onApply={onApply} />);

    fireEvent.change(screen.getByLabelText('Colour'), { target: { value: '#00ff00' } });
    fireEvent.change(screen.getByLabelText('Brightness'), { target: { value: '5' } });
    await user.click(screen.getByRole('button', { name: 'Apply light' }));

    expect(onApply).toHaveBeenCalledWith('#00ff00', 5);
  });

  it('asks for a connection before offering a write', () => {
    render(
      <LightingPanel connected={false} busy={false} status={{ kind: 'idle' }} onApply={vi.fn()} />,
    );

    expect(screen.getByRole('button', { name: 'Apply light' })).toBeDisabled();
    expect(screen.getByText('Connect the keyboard to change the light.')).toBeInTheDocument();
  });

  it('reports success', () => {
    render(
      <LightingPanel
        connected
        busy={false}
        status={{ kind: 'ok', message: 'Sent. The keys are #00FF00 at brightness 5.' }}
        onApply={vi.fn()}
      />,
    );

    expect(screen.getByText(/Sent\. The keys are/)).toBeInTheDocument();
  });
});
