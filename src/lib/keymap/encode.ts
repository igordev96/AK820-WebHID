import type { KeyRecord } from './types';

export function modBit(usage: number): number {
  if (usage >= 0xe0 && usage <= 0xe7) return 1 << (usage - 0xe0);
  return 0;
}

export function encodeRecord(usage: number, media = false): KeyRecord {
  // Consumer/media record: [03][lo][hi][00]. The page has to be explicit because Mute (0xE2)
  // is the same number as keyboard Left Alt; only the record type selects the HID usage page.
  if (media) return [0x03, usage & 0xff, (usage >> 8) & 0xff, 0x00];

  // Keyboard record: [02][modifier][usage][00]. A modifier is [02][bit][00][00]; the bit must
  // not also go into the usage byte or the firmware sees usage 1/2/4/8 instead of Shift/Ctrl/Alt/Win.
  const bit = modBit(usage);
  if (bit) return [0x02, bit, 0x00, 0x00];
  return [0x02, 0x00, usage, 0x00];
}
