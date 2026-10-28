import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App', () => {
  it('renders the workbench and allows offline editing', async () => {
    const user = userEvent.setup();
    render(<App />);

    expect(screen.getByText('AK820 Pro')).toBeInTheDocument();
    expect(screen.getByText('Not connected')).toBeInTheDocument();

    const board = screen.getByRole('group', { name: /keyboard board/i });
    expect(within(board).getAllByRole('button')).toHaveLength(81);
    expect(screen.getByRole('button', { name: /connect keyboard/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /upload changes/i })).toBeDisabled();

    await user.click(within(board).getByRole('button', { name: 'CapsLock' }));

    expect(screen.getByText('CapsLock')).toBeInTheDocument();
    expect(screen.getByLabelText('Sends')).toHaveValue('0x39');
  });

  it('switches to the Fn layer and locks six keys', async () => {
    const user = userEvent.setup();
    render(<App />);
    const board = screen.getByRole('group', { name: /keyboard board/i });

    await user.click(screen.getByRole('tab', { name: /fn layer/i }));

    expect(screen.getByRole('tab', { name: /fn layer/i })).toHaveAttribute('aria-selected', 'true');
    expect(
      within(board)
        .getAllByRole('button')
        .filter((button) => button.hasAttribute('disabled')),
    ).toHaveLength(6);
  });

  it('marks a media edit as pending', async () => {
    const user = userEvent.setup();
    render(<App />);
    const board = screen.getByRole('group', { name: /keyboard board/i });

    await user.click(within(board).getByRole('button', { name: 'CapsLock' }));
    await user.selectOptions(screen.getByLabelText('Sends'), 'c:0xE2');
    expect(screen.getByText('Change pending')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /upload 1 change/i })).toBeDisabled();
  });

  it('opens the log drawer', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^log$/i }));

    expect(screen.getByRole('log')).toHaveTextContent('No activity yet.');
  });
});
