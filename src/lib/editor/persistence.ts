import type { EditorRow, FnOverride } from './types';

export const FN_STORE = 'ak820.fn.overrides';

export type StorageLike = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

export function loadFnOverrides(storage: StorageLike): Map<number, FnOverride> {
  const overrides = new Map<number, FnOverride>();
  let rows: unknown;

  try {
    rows = JSON.parse(storage.getItem(FN_STORE) ?? '[]');
  } catch {
    return overrides;
  }

  if (!Array.isArray(rows)) return overrides;

  for (const row of rows) {
    if (!Array.isArray(row)) continue;

    const [rawIdx, rawUsage, flag] = row as unknown[];
    if (typeof rawIdx !== 'number' || typeof rawUsage !== 'number') continue;
    if (!Number.isInteger(rawIdx) || !Number.isInteger(rawUsage) || rawUsage <= 0) continue;

    // Old rows are [idx, usage]; media rows append 1. A stored value above 0xE7 (except Fn)
    // can only be a consumer usage, so migrate rows written before media existed.
    const media = flag === 1 || flag === true || (rawUsage > 0xe7 && rawUsage !== 0xaf);
    if (rawUsage > (media ? 0xffff : 0xff)) continue;

    overrides.set(rawIdx, { usage: rawUsage, media });
  }

  return overrides;
}

export function saveFnOverrides(storage: StorageLike, rows: readonly EditorRow[]): void {
  const data = rows
    .filter((row) => row.usage > 0)
    .map((row) => (row.media ? [row.idx, row.usage, 1] : [row.idx, row.usage]));

  if (data.length) storage.setItem(FN_STORE, JSON.stringify(data));
  else storage.removeItem(FN_STORE);
}
