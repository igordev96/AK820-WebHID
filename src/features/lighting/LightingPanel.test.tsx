import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { LightingPanel } from './LightingPanel';

const renderPanel = (overrides: Partial<Parameters<typeof LightingPanel>[0]> = {}) =>
  render(
    <LightingPanel
      connected
      busy={false}
      status={{ kind: 'idle' }}
      onApply={vi.fn()}
      {...overrides}
    />,
  );

describe('LightingPanel', () => {
  it('shows the keyboard preview with key labels', () => {
    renderPanel();

    expect(screen.getByRole('img', { name: /keyboard light preview/i })).toBeInTheDocument();
    expect(screen.getByText('Esc')).toBeInTheDocument();
    expect(screen.getByText('H')).toBeInTheDocument();
  });

  it('applies the defaults for the static mode', async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();
    renderPanel({ onApply });

    await user.click(screen.getByRole('button', { name: 'Apply light' }));

    expect(onApply).toHaveBeenCalledWith({
      mode: 1,
      color: '#ff8000',
      brightness: 5,
      speed: 3,
      colorful: false,
      direction: 0,
    });
  });

  it('adds speed and direction for Scrolling', async () => {
    const onApply = vi.fn();
    const user = userEvent.setup();
    renderPanel({ onApply });

    await user.selectOptions(screen.getByLabelText('Effect'), '10');
    expect(screen.getByLabelText('Speed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /up/i })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.change(screen.getByLabelText('Speed'), { target: { value: '5' } });
    await user.click(screen.getByRole('button', { name: /down/i }));
    await user.click(screen.getByRole('button', { name: 'Apply light' }));

    expect(onApply).toHaveBeenCalledWith({
      mode: 10,
      color: '#ff8000',
      brightness: 5,
      speed: 5,
      colorful: true,
      direction: 3,
    });
  });

  it('hides the colour for Colourful but keeps speed', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.selectOptions(screen.getByLabelText('Effect'), '6');

    expect(screen.queryByLabelText('Colour')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Speed')).toBeInTheDocument();
  });

  it('disables the colour while Colourful is on', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.selectOptions(screen.getByLabelText('Effect'), '7');
    expect(screen.getByRole('checkbox', { name: 'Colourful' })).toBeChecked();
    expect(screen.getByLabelText('Colour')).toBeDisabled();

    await user.click(screen.getByRole('checkbox', { name: 'Colourful' }));
    expect(screen.getByLabelText('Colour')).toBeEnabled();
  });

  it('disables the controls for the off mode', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.selectOptions(screen.getByLabelText('Effect'), '20');

    expect(screen.getByRole('img', { name: /keyboard light preview: off/i })).toBeInTheDocument();
    expect(screen.getByLabelText('Brightness')).toBeDisabled();
  });

  it('asks for a connection before offering a write', () => {
    renderPanel({ connected: false });

    expect(screen.getByRole('button', { name: 'Apply light' })).toBeDisabled();
    expect(screen.getByText('Connect the keyboard to change the light.')).toBeInTheDocument();
  });

  it('reports success', () => {
    renderPanel({ status: { kind: 'ok', message: 'Sent. Breath at #00FF00, brightness 5.' } });

    expect(screen.getByText(/Sent\. Breath/)).toBeInTheDocument();
  });
});
