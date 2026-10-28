import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { createInitialState } from '@/lib/editor';
import { KeymapBoard } from './KeymapBoard';

const renderBoard = (layer: 'top' | 'fn' = 'top', selected: number | null = null) => {
  const state = createInitialState();
  const rows = layer === 'fn' ? state.fn : state.top;
  const onSelect = vi.fn();
  render(
    <KeymapBoard
      rows={rows}
      layer={layer}
      selected={selected}
      disabled={false}
      onSelect={onSelect}
    />,
  );
  return { onSelect, board: screen.getByRole('group', { name: /keyboard board/i }) };
};

describe('KeymapBoard', () => {
  it('renders all 81 keys and selects one', async () => {
    const user = userEvent.setup();
    const { board, onSelect } = renderBoard('top', 55);

    expect(within(board).getAllByRole('button')).toHaveLength(81);
    expect(within(board).getByRole('button', { name: 'CapsLock' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(within(board).getByRole('button', { name: 'A' }));
    expect(onSelect).toHaveBeenCalledWith(56);
  });

  it('locks the six fnlayer_disable keys on the Fn layer', () => {
    const { board } = renderBoard('fn');

    const buttons = within(board).getAllByRole('button');
    expect(buttons).toHaveLength(81);
    expect(buttons.filter((button) => button.hasAttribute('disabled'))).toHaveLength(6);
    expect(within(board).getByRole('button', { name: 'Esc' })).toBeDisabled();
  });

  it('disables every key while a transfer runs', () => {
    const state = createInitialState();
    render(
      <KeymapBoard rows={state.top} layer="top" selected={null} disabled onSelect={vi.fn()} />,
    );

    const board = screen.getByRole('group', { name: /keyboard board/i });
    expect(
      within(board)
        .getAllByRole('button')
        .every((button) => button.hasAttribute('disabled')),
    ).toBe(true);
  });
});
