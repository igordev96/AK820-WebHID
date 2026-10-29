import { TIME_SLOT, TIME_TAG, TIME_YEAR_MAX, TIME_YEAR_MIN } from './protocol';

/**
 * Builds the 64-byte body of a screen clock update.
 *
 * Captured from the vendor app on 29 Oct 2026, which synced the clock about
 * 1.4 s after opening with the keyboard connected:
 *
 *   00 01 5A 1A 0A 1D 14 28 1A 00 04 ... AA 55
 *   ^  ^  ^  ^  ^  ^  ^  ^  ^  ^  ^      ^^^^^
 *   |  |  |  |  |  |  |  |  |  |  |      trailer
 *   |  |  |  |  |  |  |  |  |  |  weekday, 0 = Sunday
 *   |  |  |  |  |  |  |  |  |  fixed zero
 *   |  |  |  |  |  |  |  |  seconds
 *   |  |  |  |  |  |  |  minutes
 *   |  |  |  |  |  |  hours
 *   |  |  |  |  |  day
 *   |  |  |  |  month
 *   |  |  |  year - 2000
 *   |  |  time tag
 *   |  screen slot
 *   fixed zero
 *
 * The command frame is `04 28` with byte 8 = 1 (one chunk), then this body,
 * then `04 02`. The vendor sends no `04 F0` after the commit.
 */
export function buildTimePacket(at: Date, slot: number = TIME_SLOT): Uint8Array {
  if (!Number.isFinite(at.getTime())) throw new Error('invalid date');

  const year = at.getFullYear();
  if (year < TIME_YEAR_MIN || year > TIME_YEAR_MAX) {
    throw new Error(`the keyboard clock covers ${TIME_YEAR_MIN} to ${TIME_YEAR_MAX}`);
  }

  if (!Number.isInteger(slot) || slot < 0 || slot > 0xff) {
    throw new Error('slot must be one byte');
  }

  const frame = new Uint8Array(64);
  frame[0] = 0x00;
  frame[1] = slot;
  frame[2] = TIME_TAG;
  frame[3] = year - 2000;
  frame[4] = at.getMonth() + 1;
  frame[5] = at.getDate();
  frame[6] = at.getHours();
  frame[7] = at.getMinutes();
  frame[8] = at.getSeconds();
  frame[9] = 0x00;
  frame[10] = at.getDay();
  frame[62] = 0xaa;
  frame[63] = 0x55;
  return frame;
}

const pad2 = (value: number): string => String(value).padStart(2, '0');

/** `YYYY-MM-DD HH:MM:SS` in local time, the format the custom field accepts. */
export function formatTimeInput(at: Date): string {
  return `${at.getFullYear()}-${pad2(at.getMonth() + 1)}-${pad2(at.getDate())} ${pad2(
    at.getHours(),
  )}:${pad2(at.getMinutes())}:${pad2(at.getSeconds())}`;
}

/** `HH:MM:SS` in local time, for status lines and the preview. */
export function formatClock(at: Date): string {
  return `${pad2(at.getHours())}:${pad2(at.getMinutes())}:${pad2(at.getSeconds())}`;
}

/**
 * Reads `YYYY-MM-DD HH:MM[:SS]` as local time. Returns null when the text is
 * malformed or when the fields do not exist, so 2026-02-31 is rejected instead
 * of rolling over into March.
 */
export function parseTimeInput(text: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(text.trim());
  if (!match) return null;

  const [, rawYear, rawMonth, rawDay, rawHour, rawMinute, rawSecond] = match;
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);
  const hours = Number(rawHour);
  const minutes = Number(rawMinute);
  const seconds = rawSecond === undefined ? 0 : Number(rawSecond);

  if (year < TIME_YEAR_MIN || year > TIME_YEAR_MAX) return null;

  const at = new Date(year, month - 1, day, hours, minutes, seconds, 0);
  const roundTrip =
    at.getFullYear() === year &&
    at.getMonth() === month - 1 &&
    at.getDate() === day &&
    at.getHours() === hours &&
    at.getMinutes() === minutes &&
    at.getSeconds() === seconds;

  return roundTrip ? at : null;
}
