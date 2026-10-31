import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, readSettings, writeSettings } from './settings';

const stored = (value: unknown) => JSON.stringify(value);

describe('settings', () => {
  it('falls back to the defaults without stored text', () => {
    expect(readSettings(null)).toEqual(DEFAULT_SETTINGS);
    expect(readSettings('')).toEqual(DEFAULT_SETTINGS);
  });

  it('round-trips every field', () => {
    const settings = {
      lighting: {
        mode: 10,
        color: '#00ff00',
        brightness: 2,
        speed: 4,
        colorful: true,
        direction: 3,
      },
      clock: { mode: 'custom' as const },
      view: 'light' as const,
    };

    expect(readSettings(writeSettings(settings))).toEqual(settings);
  });

  it('ignores unreadable text', () => {
    expect(readSettings('{ not json')).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(stored([]))).toEqual(DEFAULT_SETTINGS);
    expect(readSettings(stored('nonsense'))).toEqual(DEFAULT_SETTINGS);
  });

  it('keeps the good fields beside a bad one', () => {
    const settings = readSettings(
      stored({ lighting: { mode: 10, color: 'orange', brightness: 9, speed: 4 } }),
    );

    expect(settings.lighting.mode).toBe(10);
    expect(settings.lighting.color).toBe(DEFAULT_SETTINGS.lighting.color);
    expect(settings.lighting.brightness).toBe(DEFAULT_SETTINGS.lighting.brightness);
    expect(settings.lighting.speed).toBe(4);
  });

  it('drops an effect that no longer exists', () => {
    const settings = readSettings(stored({ lighting: { mode: 99 } }));

    expect(settings.lighting.mode).toBe(DEFAULT_SETTINGS.lighting.mode);
  });

  it('only accepts the known views and clock modes', () => {
    expect(readSettings(stored({ view: 'nowhere' })).view).toBe('keys');
    expect(readSettings(stored({ view: 'screen' })).view).toBe('screen');
    expect(readSettings(stored({ clock: { mode: 'later' } })).clock.mode).toBe('now');
    expect(readSettings(stored({ clock: { mode: 'custom' } })).clock.mode).toBe('custom');
  });

  it('writes a version with the values', () => {
    expect(JSON.parse(writeSettings(DEFAULT_SETTINGS))).toMatchObject({
      version: 1,
      view: 'keys',
      clock: { mode: 'now' },
    });
  });
});
