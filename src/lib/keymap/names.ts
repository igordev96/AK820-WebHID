const hxu = (usage: number) =>
  usage
    .toString(16)
    .toUpperCase()
    .padStart(usage > 0xff ? 4 : 2, '0');

export const USAGE_NAMES = (() => {
  const names = new Map<number, string>();

  for (let index = 0; index < 26; index += 1) {
    names.set(0x04 + index, String.fromCharCode(65 + index));
  }
  '1234567890'.split('').forEach((digit, index) => names.set(0x1e + index, digit));

  (
    [
      [0x28, 'Enter'],
      [0x29, 'Esc'],
      [0x2a, 'Backspace'],
      [0x2b, 'Tab'],
      [0x2c, 'Space'],
      [0x2d, '- _'],
      [0x2e, '= +'],
      [0x2f, '[ {'],
      [0x30, '] }'],
      [0x31, '\\ |'],
      [0x33, '; :'],
      [0x34, '\' "'],
      [0x35, '` ~'],
      [0x36, ', <'],
      [0x37, '. >'],
      [0x38, '/ ?'],
      [0x39, 'CapsLock'],
      [0x46, 'PrintScreen'],
      [0x47, 'ScrollLock'],
      [0x48, 'Pause'],
      [0x49, 'Insert'],
      [0x4a, 'Home'],
      [0x4b, 'PageUp'],
      [0x4c, 'Delete'],
      [0x4d, 'End'],
      [0x4e, 'PageDown'],
      [0x4f, 'Right'],
      [0x50, 'Left'],
      [0x51, 'Down'],
      [0x52, 'Up'],
      [0x53, 'NumLock'],
      [0x54, 'KP /'],
      [0x55, 'KP *'],
      [0x56, 'KP -'],
      [0x57, 'KP +'],
      [0x58, 'KP Enter'],
      [0x64, 'Non-US \\'],
      [0x65, 'Menu'],
      [0x66, 'Power'],
      [0x67, 'Sleep'],
      [0x68, 'Wake'],
      [0xe0, 'Left Ctrl'],
      [0xe1, 'Left Shift'],
      [0xe2, 'Left Alt'],
      [0xe3, 'Left Win'],
      [0xe4, 'Right Ctrl'],
      [0xe5, 'Right Shift'],
      [0xe6, 'Right Alt'],
      [0xe7, 'Right Win'],
      [0xaf, 'Fn'],
    ] as const
  ).forEach(([usage, name]) => names.set(usage, name));

  for (let index = 0; index < 12; index += 1) names.set(0x3a + index, `F${index + 1}`);
  for (let index = 1; index <= 9; index += 1) names.set(0x58 + index, `KP ${index}`);
  names.set(0x62, 'KP 0');
  names.set(0x63, 'KP .');

  return names;
})();

export const USAGE_GROUPS = [
  ['Letters', 0x04, 0x1d],
  ['Digits', 0x1e, 0x27],
  ['Editing', 0x28, 0x2c],
  ['Symbols', 0x2d, 0x38],
  ['Caps Lock + function keys', 0x39, 0x45],
  ['Navigation', 0x46, 0x52],
  ['Keypad', 0x53, 0x63],
  ['Other keys', 0x64, 0x68],
  ['Modifiers', 0xe0, 0xe7],
] as const;

export const MEDIA_NAMES = new Map([
  [0xcd, 'Play/Pause'],
  [0xb7, 'Stop'],
  [0xb6, 'Previous track'],
  [0xb5, 'Next track'],
  [0xe9, 'Volume up'],
  [0xea, 'Volume down'],
  [0xe2, 'Mute'],
  [0xb8, 'Eject'],
  [0xb3, 'Fast forward'],
  [0xb4, 'Rewind'],
  [0xe8, 'Volume (relative)'],
  [0x6f, 'Brightness up'],
  [0x70, 'Brightness down'],
  [0x0224, 'Browser back'],
  [0x0225, 'Browser forward'],
  [0x0223, 'Browser home'],
  [0x0192, 'Calculator'],
  [0x018a, 'Email'],
]);

export function usageName(usage: number): string {
  return USAGE_NAMES.get(usage) ?? `0x${hxu(usage)}`;
}

export function usageLabel(usage: number, media: boolean): string {
  return media ? `Media: ${MEDIA_NAMES.get(usage) ?? `0x${hxu(usage)}`}` : usageName(usage);
}

export function parseUsageToken(token: string): { usage: number; media: boolean } | null {
  const text = token.trim();
  const media = /^c:/i.test(text);
  const raw = (media ? text.slice(2) : text).replace(/^0x/i, '');

  if (!/^[0-9a-f]+$/i.test(raw)) return null;

  const usage = Number.parseInt(raw, 16);
  if (!Number.isFinite(usage)) return null;
  if (media ? usage < 1 || usage > 0xffff : usage < 0 || usage > 0xff) return null;

  return { usage, media };
}
