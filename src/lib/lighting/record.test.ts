import { describe, expect, it } from 'vitest';
import { LIGHT_MODES, LIGHT_MODE_OFF, LIGHT_RECORD_SIZE, buildLightRecord } from './record';

const bytes = (value: Uint8Array) => Array.from(value);

describe('LIGHT_MODES', () => {
  it('lists the 20 modes in the vendor order', () => {
    expect(LIGHT_MODES).toHaveLength(20);
    expect(LIGHT_MODES.map((mode) => mode.id)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(LIGHT_MODES[0]?.name).toBe('Static');
    expect(LIGHT_MODES[19]?.name).toBe('LED off');
  });

  it('carries the controls the vendor database gives each mode', () => {
    const staticMode = LIGHT_MODES.find((mode) => mode.id === 1);
    const colourful = LIGHT_MODES.find((mode) => mode.id === 6);
    const scrolling = LIGHT_MODES.find((mode) => mode.id === 10);
    const rolling = LIGHT_MODES.find((mode) => mode.id === 11);

    expect(staticMode).toMatchObject({ color: true, speed: false, direction: 'none' });
    expect(colourful).toMatchObject({ color: false, speed: true, direction: 'none' });
    expect(scrolling?.direction).toBe('vertical');
    expect(rolling?.direction).toBe('horizontal');
  });
});

describe('buildLightRecord', () => {
  it('matches the captured static record', () => {
    const record = buildLightRecord({
      mode: 1,
      r: 255,
      g: 128,
      b: 0,
      brightness: 5,
      speed: 3,
      colorful: false,
      direction: 0,
    });

    expect(record).toHaveLength(LIGHT_RECORD_SIZE);
    expect(bytes(record.subarray(0, 16))).toEqual([
      0x01, 0xff, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x05, 0x03, 0x00, 0x00, 0x00, 0xaa,
      0x55,
    ]);
    expect(record.subarray(16).every((byte) => byte === 0)).toBe(true);
  });

  it('writes colourful, speed and a vertical direction', () => {
    const record = buildLightRecord({
      mode: 10,
      r: 255,
      g: 0,
      b: 0,
      brightness: 5,
      speed: 2,
      colorful: true,
      direction: 2,
    });

    expect(record[0]).toBe(10);
    expect(record[8]).toBe(1);
    expect(record[9]).toBe(5);
    expect(record[10]).toBe(2);
    expect(record[11]).toBe(2);
    expect(record[12]).toBe(0);
  });

  it('writes a horizontal direction in the same byte', () => {
    const record = buildLightRecord({
      mode: 11,
      r: 255,
      g: 0,
      b: 0,
      brightness: 5,
      speed: 3,
      colorful: false,
      direction: 1,
    });

    expect(record[11]).toBe(1);
    expect(record[12]).toBe(0);
  });

  it('sends the off mode as a zeroed record with the trailer', () => {
    const record = buildLightRecord({
      mode: LIGHT_MODE_OFF,
      r: 255,
      g: 0,
      b: 0,
      brightness: 5,
      speed: 3,
      colorful: true,
      direction: 0,
    });

    expect(record.subarray(0, 14).every((byte) => byte === 0)).toBe(true);
    expect(bytes(record.subarray(14))).toEqual([
      0xaa,
      0x55,
      ...Array.from({ length: 48 }, () => 0),
    ]);
  });

  it('refuses values outside the range', () => {
    const base = {
      mode: 10,
      r: 0,
      g: 0,
      b: 0,
      brightness: 5,
      speed: 3,
      colorful: false,
      direction: 2,
    };

    expect(() => buildLightRecord({ ...base, mode: 21 })).toThrow(/mode/);
    expect(() => buildLightRecord({ ...base, r: 256 })).toThrow(/red/);
    expect(() => buildLightRecord({ ...base, brightness: 0 })).toThrow(/brightness/);
    expect(() => buildLightRecord({ ...base, speed: 0 })).toThrow(/speed/);
    expect(() => buildLightRecord({ ...base, direction: 0 })).toThrow(/vertical/);
    expect(() => buildLightRecord({ ...base, mode: 11, direction: 2 })).toThrow(/horizontal/);
  });
});
