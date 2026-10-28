import { FN_LOCKED, SLOT_MAGIC_AT, TABLE_SIZE } from './constants';
import { encodeRecord } from './encode';
import type { KeyEntry } from './types';

export type BuildTableOptions = {
  corruptTrailer?: boolean;
  layerFn?: boolean;
};

export function buildTable(
  entries: readonly KeyEntry[],
  { corruptTrailer = false, layerFn = false }: BuildTableOptions = {},
): Uint8Array {
  const table = new Uint8Array(TABLE_SIZE);

  for (const entry of entries) {
    // On the Fn layer a zero is the absence of a record: leave the slot zeroed so the
    // firmware keeps its built-in behaviour. The vendor also skips every locked key.
    if (layerFn && (!entry.usage || FN_LOCKED.has(entry.idx))) continue;
    table.set(encodeRecord(entry.usage, entry.media), entry.idx * 4);
  }

  table[SLOT_MAGIC_AT] = corruptTrailer ? 0x00 : 0xaa;
  table[SLOT_MAGIC_AT + 1] = corruptTrailer ? 0x00 : 0x55;
  return table;
}
