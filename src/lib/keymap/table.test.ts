import { describe, expect, it } from 'vitest';
import { FACTORY_KEYS } from './factoryKeys';
import { buildTable } from './table';

const bytesAt = (table: Uint8Array, offset: number, length = 4) =>
  Array.from(table.slice(offset, offset + length));

const nonZeroPayload = (table: Uint8Array) =>
  Array.from(table.slice(0, 574)).filter((byte) => byte !== 0).length;

const buildOne = (usage: number, media = false, layerFn = false) =>
  buildTable([{ idx: 55, usage, media }], { layerFn });

describe('buildTable with the factory top layer', () => {
  const table = buildTable(FACTORY_KEYS);

  it('always produces the 576-byte table', () => {
    expect(table).toHaveLength(576);
  });

  it('leaves slot 0 and unused slots zeroed', () => {
    expect(bytesAt(table, 0)).toEqual([0, 0, 0, 0]);
    expect(bytesAt(table, 224)).toEqual([0x02, 0x00, 0x04, 0x00]);
  });

  it('places records at idx * 4', () => {
    expect(bytesAt(table, 4)).toEqual([0x02, 0x00, 0x29, 0x00]); // Esc
    expect(bytesAt(table, 224)).toEqual([0x02, 0x00, 0x04, 0x00]); // A
    expect(bytesAt(table, 220)).toEqual([0x02, 0x00, 0x39, 0x00]); // CapsLock
    expect(bytesAt(table, 292)).toEqual([0x02, 0x02, 0x00, 0x00]); // Left Shift
    expect(bytesAt(table, 336)).toEqual([0x02, 0x20, 0x00, 0x00]); // Right Shift
    expect(bytesAt(table, 364)).toEqual([0x02, 0x01, 0x00, 0x00]); // Left Ctrl
    expect(bytesAt(table, 392)).toEqual([0x02, 0x10, 0x00, 0x00]); // Right Ctrl
    expect(bytesAt(table, 380)).toEqual([0x02, 0x40, 0x00, 0x00]); // Right Alt
    expect(bytesAt(table, 484)).toEqual([0x02, 0x00, 0x4e, 0x00]); // PageDown
  });

  it('keeps the AA 55 trailer and blocks slot 143', () => {
    expect(bytesAt(table, 572)).toEqual([0x00, 0x00, 0xaa, 0x55]);
  });

  it('matches the vendor table with 164 non-zero bytes including the trailer', () => {
    expect(Array.from(table).filter((byte) => byte !== 0)).toHaveLength(164);
    expect(nonZeroPayload(table)).toBe(162);
  });

  it('can corrupt the trailer for the validation probe', () => {
    const corrupt = buildTable(FACTORY_KEYS, { corruptTrailer: true });
    expect(bytesAt(corrupt, 574, 2)).toEqual([0x00, 0x00]);
  });

  it('writes a single remap without disturbing the rest of the table', () => {
    const remapped = buildTable([{ idx: 55, usage: 0x1b }]);
    expect(bytesAt(remapped, 220)).toEqual([0x02, 0x00, 0x1b, 0x00]);
    expect(bytesAt(remapped, 224)).toEqual([0x00, 0x00, 0x00, 0x00]);
  });
});

describe('buildTable on the Fn layer', () => {
  it('treats every zero slot as firmware default', () => {
    const table = buildTable(
      FACTORY_KEYS.map((key) => ({ idx: key.idx, usage: 0 })),
      { layerFn: true },
    );

    expect(nonZeroPayload(table)).toBe(0);
    expect(bytesAt(table, 574, 2)).toEqual([0xaa, 0x55]);
  });

  it('skips fnlayer_disable keys and zero entries', () => {
    const table = buildTable(
      [
        { idx: 55, usage: 0x1b },
        { idx: 1, usage: 0x04 },
        { idx: 56, usage: 0x00 },
      ],
      { layerFn: true },
    );

    expect(bytesAt(table, 220)).toEqual([0x02, 0x00, 0x1b, 0x00]);
    expect(bytesAt(table, 4)).toEqual([0x00, 0x00, 0x00, 0x00]);
    expect(bytesAt(table, 224)).toEqual([0x00, 0x00, 0x00, 0x00]);
    expect(nonZeroPayload(table)).toBe(2);
  });
});

describe('buildTable with consumer records', () => {
  it('writes media records on either layer', () => {
    expect(bytesAt(buildOne(0xe2, true), 220)).toEqual([0x03, 0xe2, 0x00, 0x00]);
    expect(bytesAt(buildOne(0xe9, true), 220)).toEqual([0x03, 0xe9, 0x00, 0x00]);
    expect(bytesAt(buildOne(0xcd, true), 220)).toEqual([0x03, 0xcd, 0x00, 0x00]);
    expect(bytesAt(buildOne(0x0224, true), 220)).toEqual([0x03, 0x24, 0x02, 0x00]);
    expect(bytesAt(buildOne(0xb5, true, true), 220)).toEqual([0x03, 0xb5, 0x00, 0x00]);
    expect(bytesAt(buildOne(0xe2, true, true), 220)).toEqual([0x03, 0xe2, 0x00, 0x00]);
  });

  it('keeps keyboard Left Alt when media is not set', () => {
    expect(bytesAt(buildOne(0xe2), 220)).toEqual([0x02, 0x04, 0x00, 0x00]);
  });
});
