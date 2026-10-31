import { describe, expect, it } from 'vitest';
import { describeLight } from './describe';

const base = {
  color: '#00FF00',
  brightness: 3,
  speed: 2,
  colorful: false,
  direction: 0,
};

describe('describeLight', () => {
  it('says the light is off', () => {
    const result = describeLight({ ...base, mode: 20 });

    expect(result.message).toBe('Sent. The light is off.');
    expect(result.log).toBe('Light sent: off.');
  });

  it('leaves the picker colour out when the mode has none', () => {
    const result = describeLight({ ...base, mode: 8 });

    expect(result.message).toBe('Sent. Spectrum, brightness 3.');
    expect(result.log).toBe('Light sent: Spectrum, brightness 3, speed 2.');
    expect(result.message).not.toContain('#00FF00');
    expect(result.log).not.toContain('#00FF00');
  });

  it('describes a cycling mode by what it does', () => {
    const result = describeLight({ ...base, mode: 7, colorful: true });

    expect(result.message).toBe('Sent. Breath, cycling through colours, brightness 3.');
    expect(result.log).toBe('Light sent: Breath, #00FF00, colourful on, brightness 3, speed 2.');
  });

  it('names the colour when the keyboard uses it', () => {
    const result = describeLight({ ...base, mode: 7 });

    expect(result.message).toBe('Sent. Breath at #00FF00, brightness 3.');
    expect(result.log).toBe('Light sent: Breath, #00FF00, colourful off, brightness 3, speed 2.');
  });

  it('omits the controls a mode does not have', () => {
    const staticMode = describeLight({ ...base, mode: 1, colorful: false });

    expect(staticMode.message).toBe('Sent. Static at #00FF00, brightness 3.');
    expect(staticMode.log).toBe('Light sent: Static, #00FF00, colourful off, brightness 3.');
  });

  it('reports the direction a wave travels', () => {
    const result = describeLight({ ...base, mode: 10, colorful: true, direction: 3 });

    expect(result.log).toBe(
      'Light sent: Scrolling, #00FF00, colourful on, brightness 3, speed 2, down.',
    );
  });

  it('falls back to the mode number when it is unknown', () => {
    const result = describeLight({ ...base, mode: 99 });

    expect(result.message).toBe('Sent. mode 99, brightness 3.');
    expect(result.log).toBe('Light sent: mode 99, brightness 3.');
  });
});
