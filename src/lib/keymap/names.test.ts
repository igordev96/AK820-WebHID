import { describe, expect, it } from 'vitest';
import { MEDIA_NAMES, parseUsageToken, usageLabel, usageName } from './names';

describe('usage names', () => {
  it('names keyboard and media usages', () => {
    expect(usageName(0x04)).toBe('A');
    expect(usageName(0x39)).toBe('CapsLock');
    expect(usageName(0xaf)).toBe('Fn');
    expect(usageLabel(0xe2, false)).toBe('Left Alt');
    expect(usageLabel(0xe2, true)).toBe('Media: Mute');
    expect(usageLabel(0xcd, true)).toBe('Media: Play/Pause');
    expect(MEDIA_NAMES.get(0x0224)).toBe('Browser back');
  });

  it('falls back to a hex label', () => {
    expect(usageName(0x99)).toBe('0x99');
    expect(usageLabel(0x1234, true)).toBe('Media: 0x1234');
  });
});

describe('parseUsageToken', () => {
  it('parses keyboard and media tokens', () => {
    expect(parseUsageToken('0x04')).toEqual({ usage: 0x04, media: false });
    expect(parseUsageToken('0xE2')).toEqual({ usage: 0xe2, media: false });
    expect(parseUsageToken('c:0xE2')).toEqual({ usage: 0xe2, media: true });
    expect(parseUsageToken('c:0x0224')).toEqual({ usage: 0x0224, media: true });
  });

  it('rejects malformed and out-of-range tokens', () => {
    expect(parseUsageToken('')).toBeNull();
    expect(parseUsageToken('nope')).toBeNull();
    expect(parseUsageToken('0x100')).toBeNull();
    expect(parseUsageToken('c:0x0')).toBeNull();
    expect(parseUsageToken('c:0x10000')).toBeNull();
  });
});
