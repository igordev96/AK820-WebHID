import { describe, expect, it } from 'vitest';
import { encodeRecord, modBit } from './encode';

describe('modBit', () => {
  it('maps the eight modifier usages to their bits', () => {
    expect([0xe0, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7].map(modBit)).toEqual([
      1, 2, 4, 8, 16, 32, 64, 128,
    ]);
  });

  it('returns zero for ordinary keys', () => {
    expect(modBit(0x04)).toBe(0);
    expect(modBit(0x29)).toBe(0);
    expect(modBit(0xaf)).toBe(0);
  });
});

describe('encodeRecord', () => {
  it('encodes a keyboard usage', () => {
    expect(encodeRecord(0x04)).toEqual([0x02, 0x00, 0x04, 0x00]);
    expect(encodeRecord(0x29)).toEqual([0x02, 0x00, 0x29, 0x00]);
  });

  it('encodes a modifier as a bit without duplicating the usage', () => {
    expect(encodeRecord(0xe1)).toEqual([0x02, 0x02, 0x00, 0x00]);
    expect(encodeRecord(0xe0)).toEqual([0x02, 0x01, 0x00, 0x00]);
    expect(encodeRecord(0xe7)).toEqual([0x02, 0x80, 0x00, 0x00]);
  });

  it('encodes a consumer usage with record type 03', () => {
    expect(encodeRecord(0xe2, true)).toEqual([0x03, 0xe2, 0x00, 0x00]);
    expect(encodeRecord(0xe9, true)).toEqual([0x03, 0xe9, 0x00, 0x00]);
    expect(encodeRecord(0xcd, true)).toEqual([0x03, 0xcd, 0x00, 0x00]);
  });

  it('splits a 16-bit consumer usage little-endian', () => {
    expect(encodeRecord(0x0224, true)).toEqual([0x03, 0x24, 0x02, 0x00]);
  });

  it('keeps 0xE2 as Left Alt unless the page is media', () => {
    expect(encodeRecord(0xe2)).toEqual([0x02, 0x04, 0x00, 0x00]);
    expect(encodeRecord(0xe2, false)).toEqual([0x02, 0x04, 0x00, 0x00]);
  });
});
