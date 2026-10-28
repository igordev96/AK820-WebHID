import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { App } from './App';

describe('App shell', () => {
  it('shows the disconnected state', () => {
    render(<App />);

    expect(screen.getByText('AK820 Pro')).toBeInTheDocument();
    expect(screen.getByText('Not connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /connect keyboard/i })).toBeDisabled();
  });

  it('switches the layer note', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('tab', { name: /fn layer/i }));

    expect(screen.getByRole('tab', { name: /fn layer/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText(/only the keys you change are sent/i)).toBeInTheDocument();
  });

  it('opens the log drawer', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: /^log$/i }));

    expect(screen.getByRole('log')).toHaveTextContent('No activity yet.');
  });
});
