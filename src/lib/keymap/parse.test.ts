import { describe, expect, it } from 'vitest';
import { FACTORY_KEYS } from './factoryKeys';
import { parseMapText } from './parse';

describe('parseMapText', () => {
  it('parses a keyboard usage', () => {
    expect(parseMapText('55 0xE2 Left Alt')).toEqual([
      { idx: 55, usage: 0xe2, media: false, name: 'Left Alt' },
    ]);
  });

  it('requires the c: prefix for a consumer usage below 0xE7', () => {
    expect(parseMapText('55 c:0xE2 Mute')[0]).toEqual({
      idx: 55,
      usage: 0xe2,
      media: true,
      name: 'Mute',
    });
    expect(parseMapText('55 0xCD Play')[0]).toMatchObject({ usage: 0xcd, media: false });
    expect(parseMapText('55 c:0xCD Play')[0]).toMatchObject({ usage: 0xcd, media: true });
  });

  it('parses 16-bit consumer usages', () => {
    expect(parseMapText('55 c:0x0224 Browser back')[0]).toEqual({
      idx: 55,
      usage: 0x0224,
      media: true,
      name: 'Browser back',
    });
  });

  it('skips comments and blank lines', () => {
    expect(parseMapText('# note\n\n55 0x04 A\n')).toHaveLength(1);
  });

  it('accepts index 0 and rejects index 143', () => {
    expect(parseMapText('0 0x29 Esc')).toHaveLength(1);
    expect(parseMapText('143 0x29 Esc')).toHaveLength(0);
  });

  it('rejects zero and out-of-range media usages', () => {
    expect(parseMapText('55 c:0x0 Mute')).toHaveLength(0);
    expect(parseMapText('55 c:0x10000 Mute')).toHaveLength(0);
  });

  it('round-trips every factory key', () => {
    const text = FACTORY_KEYS.map(
      (key) => `${key.idx} 0x${key.usage.toString(16).toUpperCase().padStart(2, '0')} ${key.name}`,
    ).join('\n');

    expect(parseMapText(text)).toHaveLength(81);
  });
});
