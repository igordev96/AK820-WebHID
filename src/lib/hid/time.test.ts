import { describe, expect, it } from 'vitest';
import { buildTimePacket, formatClock, formatTimeInput, parseTimeInput } from './time';

const sample = new Date(2026, 9, 29, 20, 40, 26);

const bytes = (value: Uint8Array) => Array.from(value);

describe('buildTimePacket', () => {
  it('matches the packet captured from the vendor app', () => {
    const packet = buildTimePacket(sample);

    expect(packet).toHaveLength(64);
    expect(bytes(packet.subarray(0, 11))).toEqual([
      0x00, 0x01, 0x5a, 0x1a, 0x0a, 0x1d, 0x14, 0x28, 0x1a, 0x00, 0x04,
    ]);
    expect(bytes(packet.subarray(11, 62))).toEqual(Array.from({ length: 51 }, () => 0));
    expect(bytes(packet.subarray(62, 64))).toEqual([0xaa, 0x55]);
  });

  it('encodes the year as an offset from 2000', () => {
    expect(buildTimePacket(new Date(2000, 0, 1, 0, 0, 0))[3]).toBe(0);
    expect(buildTimePacket(new Date(2099, 11, 31, 23, 59, 59))[3]).toBe(99);
  });

  it('carries the weekday with Sunday at zero', () => {
    expect(buildTimePacket(new Date(2026, 9, 25))[10]).toBe(0);
    expect(buildTimePacket(new Date(2026, 9, 29))[10]).toBe(4);
  });

  it('writes the screen slot byte', () => {
    expect(buildTimePacket(sample, 3)[1]).toBe(3);
  });

  it('refuses a year the keyboard cannot hold', () => {
    expect(() => buildTimePacket(new Date(1999, 11, 31))).toThrow(/2000 to 2099/);
    expect(() => buildTimePacket(new Date(2100, 0, 1))).toThrow(/2000 to 2099/);
    expect(() => buildTimePacket(new Date(Number.NaN))).toThrow(/invalid date/);
    expect(() => buildTimePacket(sample, 256)).toThrow(/one byte/);
  });
});

describe('parseTimeInput', () => {
  it('reads local time with and without seconds', () => {
    expect(parseTimeInput('2026-10-29 20:40:26')).toEqual(sample);
    expect(parseTimeInput('2026-10-29T20:40:26')).toEqual(sample);
    expect(parseTimeInput('2026-10-29 20:40')?.getSeconds()).toBe(0);
  });

  it('rejects text that is not a real date', () => {
    expect(parseTimeInput('2026-02-31 10:00:00')).toBeNull();
    expect(parseTimeInput('2026-13-01 10:00:00')).toBeNull();
    expect(parseTimeInput('2100-01-01 00:00:00')).toBeNull();
    expect(parseTimeInput('tomorrow')).toBeNull();
  });
});

describe('formatting', () => {
  it('round trips the custom field format', () => {
    expect(formatTimeInput(sample)).toBe('2026-10-29 20:40:26');
    expect(parseTimeInput(formatTimeInput(sample))).toEqual(sample);
  });

  it('formats the clock without the date', () => {
    expect(formatClock(sample)).toBe('20:40:26');
  });
});
