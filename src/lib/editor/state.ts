import { FACTORY_KEYS, FN_LOCKED } from '@/lib/keymap';
import type { MapEntry } from '@/lib/keymap';
import { EMPTY_LAYERS, type StoredLayers } from './persistence';
import type { EditorRow, EditorState, EditorStats, Layer, UsageValidation } from './types';

const hex = (value: number) =>
  value
    .toString(16)
    .toUpperCase()
    .padStart(value > 0xff ? 4 : 2, '0');

export function createInitialState(layers: StoredLayers = EMPTY_LAYERS): EditorState {
  const top = FACTORY_KEYS.map((key) => {
    const draft = layers.top.draft.get(key.idx);
    const applied = layers.top.applied.get(key.idx);

    return {
      ...key,
      usage: draft?.usage ?? key.usage,
      media: draft?.media ?? false,
      factory: key.usage,
      factoryMedia: false,
      applied: applied?.usage ?? key.usage,
      appliedMedia: applied?.media ?? false,
    };
  });

  const fn = FACTORY_KEYS.map((key) => {
    const draft = layers.fn.draft.get(key.idx);
    const applied = layers.fn.applied.get(key.idx);

    return {
      ...key,
      usage: draft?.usage ?? 0,
      media: draft?.media ?? false,
      factory: 0,
      factoryMedia: false,
      applied: applied?.usage ?? 0,
      appliedMedia: applied?.media ?? false,
    };
  });

  return { top, fn, layer: 'top', selected: null };
}

export function getActiveRows(state: EditorState): readonly EditorRow[] {
  return state.layer === 'fn' ? state.fn : state.top;
}

export function getSelectedRow(state: EditorState): EditorRow | null {
  if (state.selected === null) return null;
  return getActiveRows(state).find((row) => row.idx === state.selected) ?? null;
}

export function getPendingRows(state: EditorState): EditorRow[] {
  return getActiveRows(state).filter(
    (row) => row.usage !== row.applied || row.media !== row.appliedMedia,
  );
}

export function getPendingCount(state: EditorState): number {
  return getPendingRows(state).length;
}

function withRows(state: EditorState, layer: Layer, rows: readonly EditorRow[]): EditorState {
  return layer === 'fn' ? { ...state, fn: rows } : { ...state, top: rows };
}

function updateRow(
  state: EditorState,
  row: EditorRow,
  update: Partial<Pick<EditorRow, 'usage' | 'media'>>,
): EditorState {
  const rows = getActiveRows(state).map((current) =>
    current.idx === row.idx ? { ...current, ...update } : current,
  );
  return withRows(state, state.layer, rows);
}

export function validateUsage(state: EditorState, usage: number, media: boolean): UsageValidation {
  const row = getSelectedRow(state);
  if (!row) {
    return { ok: false, code: 'no-selection', message: 'Select a key first.' };
  }

  if (state.layer === 'fn' && FN_LOCKED.has(row.idx)) {
    return {
      ok: false,
      code: 'locked',
      message: `${row.name} is read-only on the Fn layer because the vendor layout marks it fnlayer_disable.`,
    };
  }

  if (!Number.isInteger(usage)) {
    return { ok: false, code: 'not-integer', message: 'The usage must be a whole number.' };
  }

  if (media ? usage < 1 || usage > 0xffff : usage < 0 || usage > 0xff) {
    return {
      ok: false,
      code: 'range',
      message: media
        ? 'A media usage must be between 0x0001 and 0xFFFF.'
        : 'A keyboard usage must be between 0x00 and 0xFF.',
    };
  }

  if (!media && usage > 0xe7 && usage !== 0xaf) {
    return {
      ok: false,
      code: 'keyboard-high',
      message: `0x${hex(usage)} is not a keyboard usage. Use the c: prefix for a media usage.`,
    };
  }

  if (state.layer === 'top' && !media && usage === 0) {
    return {
      ok: false,
      code: 'top-zero',
      message:
        '0x00 is not a key on the top layer. Use Reset this key to restore the factory function.',
    };
  }

  return { ok: true };
}

export type EditorAction =
  | { readonly type: 'select'; readonly idx: number }
  | { readonly type: 'layer'; readonly layer: Layer }
  | { readonly type: 'usage'; readonly usage: number; readonly media: boolean }
  | { readonly type: 'reset-selected' }
  | { readonly type: 'restore-layer' }
  | { readonly type: 'uploaded' }
  | { readonly type: 'replace'; readonly state: EditorState };

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case 'select':
      return { ...state, selected: action.idx };

    case 'layer':
      if (state.layer === action.layer) return state;
      return { ...state, layer: action.layer, selected: null };

    case 'usage': {
      const row = getSelectedRow(state);
      if (!row) return state;
      if (!validateUsage(state, action.usage, action.media).ok) return state;
      return updateRow(state, row, { usage: action.usage, media: action.media });
    }

    case 'reset-selected': {
      const row = getSelectedRow(state);
      if (!row) return state;
      return updateRow(state, row, { usage: row.factory, media: row.factoryMedia });
    }

    case 'restore-layer':
      return withRows(
        state,
        state.layer,
        getActiveRows(state).map((row) => ({
          ...row,
          usage: row.factory,
          media: row.factoryMedia,
        })),
      );

    case 'uploaded':
      return withRows(
        state,
        state.layer,
        getActiveRows(state).map((row) => ({
          ...row,
          applied: row.usage,
          appliedMedia: row.media,
        })),
      );

    case 'replace':
      return action.state;
  }
}

export function applyMapEntries(
  state: EditorState,
  entries: readonly MapEntry[],
): { state: EditorState; stats: EditorStats } {
  const rows = getActiveRows(state);
  const byIdx = new Map(rows.map((row) => [row.idx, row]));
  const updated = new Map<number, EditorRow>();
  const stats: EditorStats = { used: 0, ignored: 0, invalid: 0, zeroed: 0, blocked: 0 };

  for (const entry of entries) {
    const row = byIdx.get(entry.idx);
    if (!row) {
      stats.ignored += 1;
      continue;
    }

    if (
      entry.media ? entry.usage < 1 || entry.usage > 0xffff : entry.usage < 0 || entry.usage > 0xff
    ) {
      stats.invalid += 1;
      continue;
    }

    if (!entry.media && entry.usage > 0xe7 && entry.usage !== 0xaf) {
      stats.invalid += 1;
      continue;
    }

    if (state.layer === 'top' && !entry.media && entry.usage === 0) {
      stats.zeroed += 1;
      continue;
    }

    if (state.layer === 'fn' && FN_LOCKED.has(entry.idx) && entry.usage !== 0) {
      stats.blocked += 1;
      continue;
    }

    updated.set(entry.idx, { ...row, usage: entry.usage, media: entry.media });
    stats.used += 1;
  }

  return {
    state: withRows(
      state,
      state.layer,
      rows.map((row) => updated.get(row.idx) ?? row),
    ),
    stats,
  };
}

export function usageToken(usage: number, media: boolean): string {
  return `${media ? 'c:0x' : '0x'}${hex(usage)}`;
}

export function formatMapText(rows: readonly EditorRow[]): string {
  return rows
    .map(
      (row) =>
        `${String(row.idx).padStart(3, ' ')}  ${usageToken(row.usage, row.media)}  ${row.name}`,
    )
    .join('\n');
}
