export const SCREEN_WIDTH = 128;
export const SCREEN_HEIGHT = 128;
export const SCREEN_FRAME_BYTES = SCREEN_WIDTH * SCREEN_HEIGHT * 2;
export const SCREEN_BLOCK_SIZE = 4096;
export const SCREEN_BLOCKS_PER_FRAME = SCREEN_FRAME_BYTES / SCREEN_BLOCK_SIZE;
export const SCREEN_FRAMES_OFFSET = 256;
export const SCREEN_MAX_FRAMES = 140;
export const SCREEN_MIN_DELAY_MS = 30;
export const SCREEN_MAX_DELAY_MS = 500;
export const SCREEN_DELAY_UNIT_MS = 2;

/** Clamps a frame delay to the vendor range and snaps it to the 2 ms unit. */
export function normalizeDelayMs(ms: number): number {
  const safe = Number.isFinite(ms) ? ms : 100;
  const clamped = Math.min(SCREEN_MAX_DELAY_MS, Math.max(SCREEN_MIN_DELAY_MS, Math.round(safe)));
  return Math.round(clamped / SCREEN_DELAY_UNIT_MS) * SCREEN_DELAY_UNIT_MS;
}

/**
 * Converts RGBA pixels to little-endian RGB565, the order the screen wants:
 * red is `00 F8`, green `E0 07`, blue `1F 00`.
 */
export function encodeRgb565(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number = SCREEN_WIDTH,
  height: number = SCREEN_HEIGHT,
): Uint8Array {
  if (width <= 0 || height <= 0) throw new Error('the image needs a size');
  if (rgba.length !== width * height * 4) {
    throw new Error(`expected ${width * height * 4} bytes of RGBA, got ${rgba.length}`);
  }

  const out = new Uint8Array(width * height * 2);

  for (let source = 0, target = 0; source < rgba.length; source += 4, target += 2) {
    const value =
      (((rgba[source] ?? 0) & 0xf8) << 8) |
      (((rgba[source + 1] ?? 0) & 0xfc) << 3) |
      ((rgba[source + 2] ?? 0) >> 3);
    out[target] = value & 0xff;
    out[target + 1] = value >> 8;
  }

  return out;
}

export type AnimationInput = {
  readonly frames: readonly Uint8Array[];
  readonly delaysMs: readonly number[];
};

/**
 * Builds the buffer the vendor app streams to the screen:
 *
 *   header   count, then one delay byte per frame (2 ms units)
 *   padding  0xFF up to offset 256
 *   frames   32768 bytes each, RGB565
 *   tail     0xFF to (frames * 8 + 1) blocks of 4096
 */
export function buildAnimationPayload({ frames, delaysMs }: AnimationInput): Uint8Array {
  if (frames.length < 1) throw new Error('an animation needs at least one frame');
  if (frames.length > SCREEN_MAX_FRAMES) {
    throw new Error(`the screen holds at most ${SCREEN_MAX_FRAMES} frames`);
  }
  if (delaysMs.length !== frames.length) {
    throw new Error('every frame needs a delay');
  }

  const blocks = frames.length * SCREEN_BLOCKS_PER_FRAME + 1;
  const payload = new Uint8Array(blocks * SCREEN_BLOCK_SIZE).fill(0xff);
  payload[0] = frames.length;

  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index];
    if (!frame || frame.length !== SCREEN_FRAME_BYTES) {
      throw new Error(`frame ${index + 1} must be ${SCREEN_FRAME_BYTES} bytes`);
    }

    const delay = delaysMs[index] ?? 0;
    if (!Number.isFinite(delay) || delay < 0 || delay > SCREEN_MAX_DELAY_MS) {
      throw new Error(`frame ${index + 1} delay must be 0 to ${SCREEN_MAX_DELAY_MS} ms`);
    }
    payload[1 + index] = Math.round(delay / SCREEN_DELAY_UNIT_MS);
    payload.set(frame, SCREEN_FRAMES_OFFSET + index * SCREEN_FRAME_BYTES);
  }

  return payload;
}
