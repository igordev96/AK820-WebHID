import { describe, expect, it } from 'vitest';
import { CHUNK_COUNT, COMMANDS, PRODUCT_IDS, REPORT_SIZE, padFrame } from './protocol';

describe('protocol constants', () => {
  it('uses 64-byte reports and nine chunks', () => {
    expect(REPORT_SIZE).toBe(64);
    expect(CHUNK_COUNT).toBe(9);
  });

  it('keeps the supported device ids', () => {
    expect(PRODUCT_IDS).toEqual([0x8009, 0x800a, 0xfdfd]);
  });

  it('keeps the command bytes', () => {
    expect(COMMANDS.begin).toEqual([0x04, 0x18]);
    expect(COMMANDS.top).toEqual([0x04, 0x11]);
    expect(COMMANDS.fn).toEqual([0x04, 0x27]);
    expect(COMMANDS.commit).toEqual([0x04, 0x02]);
    expect(COMMANDS.end).toEqual([0x04, 0xf0]);
  });
});

describe('padFrame', () => {
  it('pads a short payload to 64 bytes', () => {
    const frame = padFrame(Uint8Array.from([0x04, 0x18]));
    expect(frame).toHaveLength(64);
    expect(Array.from(frame.subarray(0, 4))).toEqual([0x04, 0x18, 0x00, 0x00]);
  });

  it('truncates a payload longer than one frame', () => {
    const frame = padFrame(new Uint8Array(80).fill(0xaa));
    expect(frame).toHaveLength(64);
    expect(frame.every((byte) => byte === 0xaa)).toBe(true);
  });

  it('returns a new buffer', () => {
    const source = Uint8Array.from([0x04, 0x18]);
    const frame = padFrame(source);
    frame[0] = 0xff;
    expect(source[0]).toBe(0x04);
  });
});
