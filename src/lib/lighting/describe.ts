import { LIGHT_MODES, LIGHT_MODE_OFF } from './record';

export type LightSettings = {
  readonly mode: number;
  readonly color: string;
  readonly brightness: number;
  readonly speed: number;
  readonly colorful: boolean;
  readonly direction: number;
};

export type LightDescription = {
  /** The sentence the panel shows after a confirmed commit. */
  readonly message: string;
  /** The log line, with every field the mode actually uses. */
  readonly log: string;
};

const DIRECTIONS: Record<number, string> = { 0: 'right', 1: 'left', 2: 'up', 3: 'down' };

const direction = (value: number) => DIRECTIONS[value] ?? String(value);

/**
 * Describes a light the keyboard has accepted. Only the fields the mode offers
 * appear: a mode without a speed control never reports one, and a mode that
 * cycles through colours never promises the picker's hex.
 */
export function describeLight(values: LightSettings): LightDescription {
  const mode = LIGHT_MODES.find((item) => item.id === values.mode);
  const name = mode?.name ?? `mode ${values.mode}`;

  if (values.mode === LIGHT_MODE_OFF) {
    return { message: 'Sent. The light is off.', log: 'Light sent: off.' };
  }

  const brightness = `brightness ${values.brightness}`;
  const hex = values.color.toUpperCase();
  const logParts = [name];

  if (mode?.color) logParts.push(hex);
  if (mode?.colorful) logParts.push(values.colorful ? 'colourful on' : 'colourful off');

  logParts.push(brightness);
  if (mode?.speed) logParts.push(`speed ${values.speed}`);
  if (mode?.direction && mode.direction !== 'none') {
    logParts.push(`${direction(values.direction)}`);
  }

  if (!mode?.color) {
    return {
      message: `Sent. ${name}, ${brightness}.`,
      log: `Light sent: ${logParts.join(', ')}.`,
    };
  }

  if (values.colorful) {
    return {
      message: `Sent. ${name}, cycling through colours, ${brightness}.`,
      log: `Light sent: ${logParts.join(', ')}.`,
    };
  }

  return {
    message: `Sent. ${name} at ${hex}, ${brightness}.`,
    log: `Light sent: ${logParts.join(', ')}.`,
  };
}
