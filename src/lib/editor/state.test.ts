import { parseMapText } from '@/lib/keymap';
import { describe, expect, it } from 'vitest';
import {
  applyMapEntries,
  createInitialState,
  editorReducer,
  formatMapText,
  getActiveRows,
  getPendingCount,
  getPendingRows,
  getSelectedRow,
  usageToken,
  validateUsage,
} from './state';

const select = (state: ReturnType<typeof createInitialState>, idx: number) =>
  editorReducer(state, { type: 'select', idx });

const setUsage = (state: ReturnType<typeof createInitialState>, usage: number, media = false) =>
  editorReducer(state, { type: 'usage', usage, media });

const setLayer = (state: ReturnType<typeof createInitialState>, layer: 'top' | 'fn') =>
  editorReducer(state, { type: 'layer', layer });

describe('createInitialState', () => {
  it('builds both layers from the factory keys', () => {
    const state = createInitialState();

    expect(state.top).toHaveLength(81);
    expect(state.fn).toHaveLength(81);
    expect(state.layer).toBe('top');
    expect(state.selected).toBeNull();
  });

  it('uses the factory map on the top layer and zero on the Fn layer', () => {
    const state = createInitialState();
    const topCaps = state.top.find((row) => row.idx === 55);
    const fnCaps = state.fn.find((row) => row.idx === 55);

    expect(topCaps).toMatchObject({
      usage: 0x39,
      media: false,
      factory: 0x39,
      factoryMedia: false,
      applied: 0x39,
      appliedMedia: false,
    });
    expect(fnCaps).toMatchObject({
      usage: 0,
      media: false,
      factory: 0,
      factoryMedia: false,
      applied: 0,
      appliedMedia: false,
    });
  });

  it('hydrates stored layers, keeping the draft and the applied table apart', () => {
    const state = createInitialState({
      top: { draft: new Map(), applied: new Map() },
      fn: {
        draft: new Map([[55, { usage: 0xe2, media: true }]]),
        applied: new Map([[55, { usage: 0xe2, media: true }]]),
      },
    });
    const fnCaps = state.fn.find((row) => row.idx === 55);
    const topCaps = state.top.find((row) => row.idx === 55);

    expect(fnCaps).toMatchObject({ usage: 0xe2, media: true, applied: 0xe2, appliedMedia: true });
    expect(topCaps).toMatchObject({ usage: 0x39, media: false });
  });

  it('shows a stored draft as pending when it was never uploaded', () => {
    const state = createInitialState({
      top: { draft: new Map([[55, { usage: 0x04, media: false }]]), applied: new Map() },
      fn: { draft: new Map(), applied: new Map() },
    });
    const topCaps = state.top.find((row) => row.idx === 55);

    expect(topCaps).toMatchObject({ usage: 0x04, applied: 0x39 });
  });
});

describe('editor selectors and layers', () => {
  it('selects a key and clears the selection when the layer changes', () => {
    let state = select(createInitialState(), 55);
    expect(getSelectedRow(state)?.idx).toBe(55);
    expect(getActiveRows(state)).toHaveLength(81);

    state = setLayer(state, 'fn');
    expect(state.layer).toBe('fn');
    expect(state.selected).toBeNull();
    expect(getSelectedRow(state)).toBeNull();
  });

  it('clears the selection when the selected key is clicked again', () => {
    let state = select(createInitialState(), 55);
    state = select(state, 55);

    expect(state.selected).toBeNull();
    expect(getSelectedRow(state)).toBeNull();
  });

  it('moves the selection to another key', () => {
    let state = select(createInitialState(), 55);
    state = select(state, 56);

    expect(getSelectedRow(state)?.idx).toBe(56);
  });

  it('clears the selection with a second click on the Fn layer too', () => {
    let state = setLayer(createInitialState(), 'fn');
    state = select(state, 56);
    state = select(state, 56);

    expect(getSelectedRow(state)).toBeNull();
  });
});

describe('usage changes and pending state', () => {
  it('marks a change as pending and applied only after upload', () => {
    let state = select(createInitialState(), 55);
    state = setUsage(state, 0x1b);

    expect(getSelectedRow(state)?.usage).toBe(0x1b);
    expect(getSelectedRow(state)?.applied).toBe(0x39);
    expect(getPendingRows(state)).toHaveLength(1);
    expect(getPendingCount(state)).toBe(1);

    state = editorReducer(state, { type: 'uploaded' });
    expect(getPendingCount(state)).toBe(0);
    expect(getSelectedRow(state)?.applied).toBe(0x1b);
  });

  it('rejects 0x00 on the top layer', () => {
    const state = select(createInitialState(), 55);

    expect(validateUsage(state, 0x00, false)).toMatchObject({ ok: false, code: 'top-zero' });
    expect(setUsage(state, 0x00).top.find((row) => row.idx === 55)?.usage).toBe(0x39);
  });

  it('rejects 0xE9 without the c: prefix', () => {
    const state = select(createInitialState(), 55);

    expect(validateUsage(state, 0xe9, false)).toMatchObject({
      ok: false,
      code: 'keyboard-high',
    });
  });

  it('keeps 0xE2 as Left Alt and accepts Mute with media', () => {
    let state = select(createInitialState(), 55);

    expect(validateUsage(state, 0xe2, false)).toEqual({ ok: true });
    expect(validateUsage(state, 0xe2, true)).toEqual({ ok: true });

    state = setUsage(state, 0xe2, true);
    const caps = state.top.find((row) => row.idx === 55);
    expect(caps).toMatchObject({ usage: 0xe2, media: true, applied: 0x39, appliedMedia: false });
    expect(getPendingCount(state)).toBe(1);
  });

  it('refuses edits on fnlayer_disable keys', () => {
    let state = setLayer(createInitialState(), 'fn');
    state = select(state, 1);

    expect(validateUsage(state, 0x04, false)).toMatchObject({ ok: false, code: 'locked' });
    expect(setUsage(state, 0x04).fn.find((row) => row.idx === 1)?.usage).toBe(0);
  });

  it('requires a selection', () => {
    expect(validateUsage(createInitialState(), 0x04, false)).toMatchObject({
      ok: false,
      code: 'no-selection',
    });
  });

  it('rejects fractional and out-of-range usages', () => {
    const state = select(createInitialState(), 55);

    expect(validateUsage(state, 1.5, false)).toMatchObject({ ok: false, code: 'not-integer' });
    expect(validateUsage(state, 0x100, false)).toMatchObject({ ok: false, code: 'range' });
    expect(validateUsage(state, 0, true)).toMatchObject({ ok: false, code: 'range' });
    expect(validateUsage(state, 0x10000, true)).toMatchObject({ ok: false, code: 'range' });
  });
});

describe('reset and restore', () => {
  it('resets one top-layer key to the factory function', () => {
    let state = select(createInitialState(), 55);
    state = setUsage(state, 0x1b);
    state = editorReducer(state, { type: 'reset-selected' });

    expect(getSelectedRow(state)?.usage).toBe(0x39);
    expect(getPendingCount(state)).toBe(0);
  });

  it('resets one Fn key to firmware default', () => {
    let state = setLayer(createInitialState(), 'fn');
    state = select(state, 55);
    state = setUsage(state, 0xe2, true);
    state = editorReducer(state, { type: 'reset-selected' });

    expect(getSelectedRow(state)?.usage).toBe(0);
    expect(getSelectedRow(state)?.media).toBe(false);
    expect(getPendingCount(state)).toBe(0);
  });

  it('restores the active layer without touching the other one', () => {
    let state = createInitialState();
    state = select(state, 55);
    state = setUsage(state, 0x1b);
    state = setLayer(state, 'fn');
    state = select(state, 55);
    state = setUsage(state, 0xe2, true);

    state = editorReducer(state, { type: 'restore-layer' });
    expect(state.fn.find((row) => row.idx === 55)?.usage).toBe(0);
    expect(state.top.find((row) => row.idx === 55)?.usage).toBe(0x1b);

    state = setLayer(state, 'top');
    state = editorReducer(state, { type: 'restore-layer' });
    expect(state.top.find((row) => row.idx === 55)?.usage).toBe(0x39);
  });
});

describe('applyMapEntries', () => {
  it('applies valid top-layer text and counts the rejected lines', () => {
    const result = applyMapEntries(
      createInitialState(),
      parseMapText('55 0x1B X\n56 0x00 Zero\n57 0xE9 Bad'),
    );

    expect(result.stats).toEqual({ used: 1, ignored: 0, invalid: 1, zeroed: 1, blocked: 0 });
    expect(result.state.top.find((row) => row.idx === 55)?.usage).toBe(0x1b);
    expect(result.state.top.find((row) => row.idx === 56)?.usage).toBe(0x04);
  });

  it('applies media and skips locked Fn keys', () => {
    const state = setLayer(createInitialState(), 'fn');
    const result = applyMapEntries(state, parseMapText('1 0x04 Esc\n55 c:0xE2 Mute\n56 0x00 Zero'));

    expect(result.stats).toEqual({ used: 2, ignored: 0, invalid: 0, zeroed: 0, blocked: 1 });
    expect(result.state.fn.find((row) => row.idx === 1)?.usage).toBe(0);
    expect(result.state.fn.find((row) => row.idx === 55)).toMatchObject({
      usage: 0xe2,
      media: true,
    });
    expect(result.state.fn.find((row) => row.idx === 56)?.usage).toBe(0);
  });

  it('counts unknown indices and invalid media values', () => {
    const result = applyMapEntries(createInitialState(), [
      { idx: 999, usage: 0x04, media: false, name: 'missing' },
      { idx: 55, usage: 0, media: true, name: 'bad media' },
    ]);

    expect(result.stats).toEqual({ used: 0, ignored: 1, invalid: 1, zeroed: 0, blocked: 0 });
  });
});

describe('map text formatting', () => {
  it('prints keyboard and media tokens', () => {
    expect(usageToken(0x04, false)).toBe('0x04');
    expect(usageToken(0xe2, true)).toBe('c:0xE2');
    expect(usageToken(0x0224, true)).toBe('c:0x0224');
  });

  it('round-trips both layers through the text parser', () => {
    let state = select(createInitialState(), 55);
    state = setUsage(state, 0xe2, true);
    const mediaLine = formatMapText(state.top)
      .split('\n')
      .find((line) => line.trim().startsWith('55 '));
    expect(mediaLine).toBe(' 55  c:0xE2  CapsLock');

    expect(parseMapText(formatMapText(createInitialState().top))).toHaveLength(81);
    expect(parseMapText(formatMapText(createInitialState().fn))).toHaveLength(81);
  });
});
