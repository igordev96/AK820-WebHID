export const LIGHT_BOARD_WIDTH = 624;
export const LIGHT_BOARD_HEIGHT = 250;

export type LightMotion =
  | 'none'
  | 'pulse'
  | 'row'
  | 'column'
  | 'radial'
  | 'rotate'
  | 'twinkle'
  | 'hue';

export type LightKey = {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  readonly idx: number;
};

/** The preview motion for a mode. It approximates the firmware effect. */
export function lightMotion(mode: number): LightMotion {
  if (mode === 20 || mode === 1) return 'none';
  if (mode === 4) return 'twinkle';
  if (mode === 6 || mode === 8) return 'hue';
  if (mode === 5) return 'row';
  if (mode === 9 || mode === 13 || mode === 15) return 'radial';
  if (mode === 12) return 'rotate';
  if (mode === 11 || mode === 16 || mode === 18 || mode === 19) return 'column';
  if (mode === 10 || mode === 14) return 'row';
  return 'pulse';
}

const fixedUp = (mode: number) => mode === 14;
const fixedDown = (mode: number) => mode === 5;

/**
 * The position of a key in the wave, 0 to 1. The bright band moves toward
 * lower phases, so a downward wave needs the phase to grow toward the bottom.
 */
export function lightPhase(
  motion: LightMotion,
  mode: number,
  direction: number,
  key: LightKey,
): number {
  if (motion === 'row') {
    const up = fixedUp(mode) || (!fixedDown(mode) && direction === 2);
    return up ? key.y / LIGHT_BOARD_HEIGHT : 1 - key.y / LIGHT_BOARD_HEIGHT;
  }

  if (motion === 'column') {
    return direction === 0 ? 1 - key.x / LIGHT_BOARD_WIDTH : key.x / LIGHT_BOARD_WIDTH;
  }

  if (motion === 'radial') {
    const dx = key.x + key.w / 2 - LIGHT_BOARD_WIDTH / 2;
    const dy = key.y + key.h / 2 - LIGHT_BOARD_HEIGHT / 2;
    return Math.min(1, Math.hypot(dx, dy) / 340);
  }

  if (motion === 'rotate') {
    const angle = Math.atan2(
      key.y + key.h / 2 - LIGHT_BOARD_HEIGHT / 2,
      key.x + key.w / 2 - LIGHT_BOARD_WIDTH / 2,
    );
    const norm = (angle + Math.PI) / (Math.PI * 2);
    return direction === 1 ? 1 - norm : norm;
  }

  if (motion === 'twinkle') return ((key.idx * 37) % 100) / 100;

  return 0;
}
