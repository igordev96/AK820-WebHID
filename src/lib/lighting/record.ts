export const LIGHT_RECORD_SIZE = 64;
export const LIGHT_CATEGORY_SOLID = 0x01;
export const LIGHT_EFFECT_SOLID = 0x03;
export const LIGHT_MIN_BRIGHTNESS = 1;
export const LIGHT_MAX_BRIGHTNESS = 5;

export type SolidLight = {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  /** 1 to 5, the range the vendor app exposes. */
  readonly brightness: number;
};

const clampByte = (value: number, name: string): number => {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new Error(`${name} must be a whole number from 0 to 255`);
  }
  return value;
};

/**
 * The 64-byte record the vendor app sends for a solid colour:
 *
 *   01 R G B 00 00 00 00 00 <brightness> 03 00 00 00 AA 55
 *   ^  ^^^^^                  ^          ^  ^  ^     trailer
 *   |  colour                 |          |  |  direction
 *   |                         |          |  speed
 *   |                         |          effect id (03 = solid)
 *   |                         brightness 1-5
 *   category (01 = single colour)
 */
export function buildSolidLight({ r, g, b, brightness }: SolidLight): Uint8Array {
  if (!Number.isInteger(brightness) || brightness < 1 || brightness > 5) {
    throw new Error(
      `brightness must be a whole number from ${LIGHT_MIN_BRIGHTNESS} to ${LIGHT_MAX_BRIGHTNESS}`,
    );
  }

  const record = new Uint8Array(LIGHT_RECORD_SIZE);
  record[0] = LIGHT_CATEGORY_SOLID;
  record[1] = clampByte(r, 'red');
  record[2] = clampByte(g, 'green');
  record[3] = clampByte(b, 'blue');
  record[9] = brightness;
  record[10] = LIGHT_EFFECT_SOLID;
  record[11] = 0;
  record[12] = 0;
  record[14] = 0xaa;
  record[15] = 0x55;
  return record;
}
