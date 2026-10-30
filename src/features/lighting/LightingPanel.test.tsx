import { render, screen } from '@testing-library/react';
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

const chooseEffect = async (user: ReturnType<typeof userEvent.setup>, name: string) => {
  await user.click(screen.getByRole('combobox', { name: 'Effect' }));
  await user.click(await screen.findByRole('option', { name }));
};

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

    await chooseEffect(user, 'Scrolling');

    const speed = screen.getByRole('slider', { name: 'Speed' });
    speed.focus();
    await user.keyboard('{End}');

    const down = screen.getByRole('radio', { name: /down/i });
    await user.click(down);

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

    await chooseEffect(user, 'Colourful');

    expect(screen.queryByLabelText('Colour')).not.toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Speed' })).toBeInTheDocument();
  });

  it('disables the colour while Colourful is on', async () => {
    const user = userEvent.setup();
    renderPanel();

    await chooseEffect(user, 'Breath');
    const colourful = screen.getByRole('checkbox', { name: 'Colourful' });
    expect(colourful).toBeChecked();
    expect(screen.getByLabelText('Colour')).toBeDisabled();

    await user.click(colourful);
    expect(screen.getByLabelText('Colour')).toBeEnabled();
  });

  it('disables the controls for the off mode', async () => {
    const user = userEvent.setup();
    renderPanel();

    await chooseEffect(user, 'LED off');

    expect(screen.getByRole('img', { name: /keyboard light preview: off/i })).toBeInTheDocument();
    expect(screen.getByRole('slider', { name: 'Brightness' })).toHaveAttribute('data-disabled');
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
