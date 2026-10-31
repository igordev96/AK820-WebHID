import { FACTORY_KEYS } from '@/lib/keymap';
import type { EditorRow, FnOverride } from './types';

export const FN_STORE = 'ak820.fn.overrides';
export const TOP_STORE = 'ak820.top.layer';

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

const KEY_INDICES: ReadonlySet<number> = new Set(FACTORY_KEYS.map((key) => key.idx));

const safeRead = (storage: StorageLike, key: string): string | null => {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
};

/** Reads `[idx, usage]` or `[idx, usage, 1]` rows, dropping anything unusable. */
function readRows(text: string | null): Map<number, FnOverride> {
  const overrides = new Map<number, FnOverride>();
  let rows: unknown;

  try {
    rows = JSON.parse(text ?? '[]');
  } catch {
    return overrides;
  }

  if (!Array.isArray(rows)) return overrides;

  for (const row of rows) {
    if (!Array.isArray(row)) continue;

    const [rawIdx, rawUsage, flag] = row as unknown[];
    if (typeof rawIdx !== 'number' || typeof rawUsage !== 'number') continue;
    if (!Number.isInteger(rawIdx) || !Number.isInteger(rawUsage) || rawUsage <= 0) continue;
    if (!KEY_INDICES.has(rawIdx)) continue;

    // Old rows are [idx, usage]; media rows append 1. A stored value above 0xE7 (except Fn)
    // can only be a consumer usage, so migrate rows written before media existed.
    const media = flag === 1 || flag === true || (rawUsage > 0xe7 && rawUsage !== 0xaf);
    if (rawUsage > (media ? 0xffff : 0xff)) continue;

    overrides.set(rawIdx, { usage: rawUsage, media });
  }

  return overrides;
}

export function loadFnOverrides(storage: StorageLike): Map<number, FnOverride> {
  return readRows(safeRead(storage, FN_STORE));
}

export function saveFnOverrides(storage: StorageLike, rows: readonly EditorRow[]): void {
  const data = rows
    .filter((row) => row.usage > 0)
    .map((row) => (row.media ? [row.idx, row.usage, 1] : [row.idx, row.usage]));

  if (data.length) storage.setItem(FN_STORE, JSON.stringify(data));
  else storage.removeItem(FN_STORE);
}

export type TopLayer = {
  /** What the editor shows. */
  readonly draft: ReadonlyMap<number, FnOverride>;
  /** What the last confirmed upload sent from this browser. */
  readonly applied: ReadonlyMap<number, FnOverride>;
};

const EMPTY_LAYER: TopLayer = { draft: new Map(), applied: new Map() };

/**
 * The top layer is stored as two sets of overrides: the draft you were editing
 * and the table the last commit accepted. Keeping them apart is what makes the
 * pending mark honest after a reload.
 */
export function loadTopLayer(storage: StorageLike): TopLayer {
  let raw: unknown;
  try {
    raw = JSON.parse(safeRead(storage, TOP_STORE) ?? 'null');
  } catch {
    return EMPTY_LAYER;
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return EMPTY_LAYER;
  const record = raw as Record<string, unknown>;

  return {
    draft: readRows(JSON.stringify(record.draft ?? [])),
    applied: readRows(JSON.stringify(record.applied ?? [])),
  };
}

const changedFromFactory = (row: EditorRow) =>
  row.usage !== row.factory || row.media !== row.factoryMedia;

const appliedDiffersFromFactory = (row: EditorRow) =>
  row.applied !== row.factory || row.appliedMedia !== row.factoryMedia;

export function saveTopLayer(storage: StorageLike, rows: readonly EditorRow[]): void {
  const draft = rows
    .filter(changedFromFactory)
    .map((row) => (row.media ? [row.idx, row.usage, 1] : [row.idx, row.usage]));
  const applied = rows
    .filter(appliedDiffersFromFactory)
    .map((row) => (row.appliedMedia ? [row.idx, row.applied, 1] : [row.idx, row.applied]));

  if (!draft.length && !applied.length) {
    storage.removeItem(TOP_STORE);
    return;
  }

  storage.setItem(TOP_STORE, JSON.stringify({ draft, applied }));
}
