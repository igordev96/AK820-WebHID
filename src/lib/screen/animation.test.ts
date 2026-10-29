import { describe, expect, it } from 'vitest';
import {
  SCREEN_BLOCK_SIZE,
  SCREEN_FRAME_BYTES,
  SCREEN_FRAMES_OFFSET,
  buildAnimationPayload,
  encodeRgb565,
} from './animation';

const solid = (byte: number) => new Uint8Array(SCREEN_FRAME_BYTES).fill(byte);

const rgba = (r: number, g: number, b: number) => Uint8ClampedArray.from([r, g, b, 255]);

describe('encodeRgb565', () => {
  it('writes little-endian RGB565', () => {
    expect(Array.from(encodeRgb565(rgba(255, 0, 0), 1, 1))).toEqual([0x00, 0xf8]);
    expect(Array.from(encodeRgb565(rgba(0, 255, 0), 1, 1))).toEqual([0xe0, 0x07]);
    expect(Array.from(encodeRgb565(rgba(0, 0, 255), 1, 1))).toEqual([0x1f, 0x00]);
  });

  it('converts every pixel', () => {
    const pixels = encodeRgb565(rgba(255, 0, 0), 1, 1);
    expect(pixels).toHaveLength(2);

    const image = new Uint8ClampedArray(4 * 4 * 4).fill(255);
    expect(encodeRgb565(image, 4, 4)).toHaveLength(4 * 4 * 2);
  });

  it('rejects a buffer that does not match the size', () => {
    expect(() => encodeRgb565(new Uint8ClampedArray(3), 1, 1)).toThrow(/RGBA/);
    expect(() => encodeRgb565(new Uint8ClampedArray(0), 0, 1)).toThrow(/size/);
  });
});

describe('buildAnimationPayload', () => {
  it('matches the captured two-frame layout', () => {
    const payload = buildAnimationPayload({
      frames: [solid(0x11), solid(0x22)],
      delaysMs: [100, 100],
    });

    expect(payload).toHaveLength((2 * 8 + 1) * SCREEN_BLOCK_SIZE);
    expect(payload[0]).toBe(2);
    expect(payload[1]).toBe(50);
    expect(payload[2]).toBe(50);
    expect(payload.subarray(3, 256)).toEqual(new Uint8Array(253).fill(0xff));
    expect(payload.subarray(SCREEN_FRAMES_OFFSET, SCREEN_FRAMES_OFFSET + 8)).toEqual(
      new Uint8Array(8).fill(0x11),
    );
    expect(
      payload.subarray(
        SCREEN_FRAMES_OFFSET + SCREEN_FRAME_BYTES - 4,
        SCREEN_FRAMES_OFFSET + SCREEN_FRAME_BYTES,
      ),
    ).toEqual(new Uint8Array(4).fill(0x11));
    expect(payload.subarray(payload.length - 8)).toEqual(new Uint8Array(8).fill(0xff));
  });

  it('encodes delays in 2 ms units', () => {
    const payload = buildAnimationPayload({
      frames: [solid(0), solid(0), solid(0)],
      delaysMs: [50, 200, 500],
    });

    expect(Array.from(payload.subarray(0, 4))).toEqual([3, 25, 100, 250]);
  });

  it('grows one block of header plus eight blocks per frame', () => {
    expect(buildAnimationPayload({ frames: [solid(0)], delaysMs: [100] })).toHaveLength(
      9 * SCREEN_BLOCK_SIZE,
    );
    expect(
      buildAnimationPayload({
        frames: Array.from({ length: 140 }, () => solid(0)),
        delaysMs: Array.from({ length: 140 }, () => 100),
      }),
    ).toHaveLength((140 * 8 + 1) * SCREEN_BLOCK_SIZE);
  });

  it('pads the header with FF and leaves the tail FF', () => {
    const payload = buildAnimationPayload({ frames: [solid(0)], delaysMs: [100] });

    expect(payload.subarray(2, 256).every((byte) => byte === 0xff)).toBe(true);
    expect(payload.subarray(payload.length - 8).every((byte) => byte === 0xff)).toBe(true);
  });

  it('refuses bad input', () => {
    expect(() => buildAnimationPayload({ frames: [], delaysMs: [] })).toThrow(/at least one/);
    expect(() =>
      buildAnimationPayload({
        frames: Array.from({ length: 141 }, () => solid(0)),
        delaysMs: Array.from({ length: 141 }, () => 100),
      }),
    ).toThrow(/140/);
    expect(() => buildAnimationPayload({ frames: [solid(0)], delaysMs: [] })).toThrow(/delay/);
    expect(() => buildAnimationPayload({ frames: [new Uint8Array(10)], delaysMs: [100] })).toThrow(
      /32768/,
    );
    expect(() => buildAnimationPayload({ frames: [solid(0)], delaysMs: [600] })).toThrow(/510/);
  });
});
