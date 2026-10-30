export const LIGHT_RECORD_SIZE = 64;
export const LIGHT_MIN_BRIGHTNESS = 1;
export const LIGHT_MAX_BRIGHTNESS = 5;
export const LIGHT_MIN_SPEED = 1;
export const LIGHT_MAX_SPEED = 5;
export const LIGHT_MODE_OFF = 20;

export type LightDirection = 'none' | 'horizontal' | 'vertical';

export type LightMode = {
  readonly id: number;
  readonly name: string;
  /** The vendor database's config_func, which says which controls the mode has. */
  readonly config: number;
  readonly color: boolean;
  readonly colorful: boolean;
  readonly speed: boolean;
  readonly direction: LightDirection;
};

/**
 * The 20 lighting modes in the order the vendor app lists them. The flags come
 * from `config_func` in the vendor database:
 *   0x01 brightness, 0x02 speed, 0x04 horizontal, 0x08 vertical, 0x10 colour,
 *   0x20 colourful.
 */
export const LIGHT_MODES: readonly LightMode[] = [
  {
    id: 1,
    name: 'Static',
    config: 0x31,
    color: true,
    colorful: true,
    speed: false,
    direction: 'none',
  },
  {
    id: 2,
    name: 'Single on',
    config: 0x33,
    color: true,
    colorful: true,
    speed: true,
    direction: 'none',
  },
  {
    id: 3,
    name: 'Single off',
    config: 0x33,
    color: true,
    colorful: true,
    speed: true,
    direction: 'none',
  },
  {
    id: 4,
    name: 'Glittering',
    config: 0x33,
    color: true,
    colorful: true,
    speed: true,
    direction: 'none',
  },
  {
    id: 5,
    name: 'Falling',
    config: 0x33,
    color: true,
    colorful: true,
    speed: true,
    direction: 'none',
  },
  {
    id: 6,
    name: 'Colourful',
    config: 0x03,
    color: false,
    colorful: false,
    speed: true,
    direction: 'none',
  },
  {
    id: 7,
    name: 'Breath',
    config: 0x33,
    color: true,
    colorful: true,
    speed: true,
    direction: 'none',
  },
  {
    id: 8,
    name: 'Spectrum',
    config: 0x03,
    color: false,
    colorful: false,
    speed: true,
    direction: 'none',
  },
  {
    id: 9,
    name: 'Outward',
    config: 0x33,
    color: true,
    colorful: true,
    speed: true,
    direction: 'none',
  },
  {
    id: 10,
    name: 'Scrolling',
    config: 0x3b,
    color: true,
    colorful: true,
    speed: true,
    direction: 'vertical',
  },
  {
    id: 11,
    name: 'Rolling',
    config: 0x37,
    color: true,
    colorful: true,
    speed: true,
    direction: 'horizontal',
  },
  {
    id: 12,
    name: 'Rotating',
    config: 0x37,
    color: true,
    colorful: true,
    speed: true,
    direction: 'horizontal',
  },
  {
    id: 13,
    name: 'Explode',
    config: 0x33,
    color: true,
    colorful: true,
    speed: true,
    direction: 'none',
  },
  {
    id: 14,
    name: 'Launch',
    config: 0x33,
    color: true,
    colorful: true,
    speed: true,
    direction: 'none',
  },
  {
    id: 15,
    name: 'Ripples',
    config: 0x33,
    color: true,
    colorful: true,
    speed: true,
    direction: 'none',
  },
  {
    id: 16,
    name: 'Flowing',
    config: 0x37,
    color: true,
    colorful: true,
    speed: true,
    direction: 'horizontal',
  },
  {
    id: 17,
    name: 'Pulsating',
    config: 0x33,
    color: true,
    colorful: true,
    speed: true,
    direction: 'none',
  },
  {
    id: 18,
    name: 'Tilt',
    config: 0x37,
    color: true,
    colorful: true,
    speed: true,
    direction: 'horizontal',
  },
  {
    id: 19,
    name: 'Shuttle',
    config: 0x33,
    color: true,
    colorful: true,
    speed: true,
    direction: 'none',
  },
  {
    id: 20,
    name: 'LED off',
    config: 0x00,
    color: false,
    colorful: false,
    speed: false,
    direction: 'none',
  },
];

export type LightRecord = {
  readonly mode: number;
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly brightness: number;
  readonly speed: number;
  readonly colorful: boolean;
  /** 0-1 for horizontal (right 0, left 1), 2-3 for vertical (up 2, down 3). */
  readonly direction: number;
};

const clampByte = (value: number, name: string): number => {
  if (!Number.isInteger(value) || value < 0 || value > 255) {
    throw new Error(`${name} must be a whole number from 0 to 255`);
  }
  return value;
};

/**
 * The 64-byte record the vendor app sends:
 *
 *   <mode> R G B 00 00 00 00 <colourful> <brightness> <speed> <direction> 00 00 AA 55
 *
 * The direction byte is 0 right, 1 left, 2 up, 3 down. Unused axes stay zero.
 */
export function buildLightRecord(record: LightRecord): Uint8Array {
  const mode = LIGHT_MODES.find((item) => item.id === record.mode);
  if (!mode) throw new Error(`unknown light mode ${record.mode}`);

  const payload = new Uint8Array(LIGHT_RECORD_SIZE);
  payload[14] = 0xaa;
  payload[15] = 0x55;

  if (record.mode === LIGHT_MODE_OFF) return payload;

  if (!Number.isInteger(record.brightness) || record.brightness < 1 || record.brightness > 5) {
    throw new Error(`brightness must be a whole number from 1 to ${LIGHT_MAX_BRIGHTNESS}`);
  }
  if (!Number.isInteger(record.speed) || record.speed < 1 || record.speed > 5) {
    throw new Error(`speed must be a whole number from 1 to ${LIGHT_MAX_SPEED}`);
  }

  payload[0] = mode.id;
  payload[1] = clampByte(record.r, 'red');
  payload[2] = clampByte(record.g, 'green');
  payload[3] = clampByte(record.b, 'blue');
  payload[8] = record.colorful ? 1 : 0;
  payload[9] = record.brightness;
  payload[10] = record.speed;

  if (mode.direction === 'vertical') {
    if (!Number.isInteger(record.direction) || record.direction < 2 || record.direction > 3) {
      throw new Error('vertical direction must be 2 (up) or 3 (down)');
    }
    payload[11] = record.direction;
  } else if (mode.direction === 'horizontal') {
    if (!Number.isInteger(record.direction) || record.direction < 0 || record.direction > 1) {
      throw new Error('horizontal direction must be 0 (right) or 1 (left)');
    }
    payload[11] = record.direction;
  }

  return payload;
}
