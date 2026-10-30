import { describe, expect, it } from 'vitest';
import { LIGHT_RECORD_SIZE, buildSolidLight } from './record';

const bytes = (value: Uint8Array) => Array.from(value);

describe('buildSolidLight', () => {
  it('matches the record captured from the vendor app', () => {
    const record = buildSolidLight({ r: 255, g: 128, b: 0, brightness: 3 });

    expect(record).toHaveLength(LIGHT_RECORD_SIZE);
    expect(bytes(record.subarray(0, 16))).toEqual([
      0x01, 0xff, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x03, 0x03, 0x00, 0x00, 0x00, 0xaa,
      0x55,
    ]);
    expect(record.subarray(16).every((byte) => byte === 0)).toBe(true);
  });

  it('writes the colour channels in order', () => {
    expect(bytes(buildSolidLight({ r: 0, g: 0, b: 255, brightness: 5 }).subarray(1, 4))).toEqual([
      0x00, 0x00, 0xff,
    ]);
    expect(
      bytes(buildSolidLight({ r: 255, g: 255, b: 255, brightness: 1 }).subarray(1, 4)),
    ).toEqual([0xff, 0xff, 0xff]);
  });

  it('refuses colours and brightness outside the range', () => {
    expect(() => buildSolidLight({ r: 256, g: 0, b: 0, brightness: 3 })).toThrow(/red/);
    expect(() => buildSolidLight({ r: 0, g: -1, b: 0, brightness: 3 })).toThrow(/green/);
    expect(() => buildSolidLight({ r: 0, g: 0, b: 1.5, brightness: 3 })).toThrow(/blue/);
    expect(() => buildSolidLight({ r: 0, g: 0, b: 0, brightness: 0 })).toThrow(/brightness/);
    expect(() => buildSolidLight({ r: 0, g: 0, b: 0, brightness: 6 })).toThrow(/brightness/);
  });
});
