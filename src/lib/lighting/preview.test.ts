import { describe, expect, it } from 'vitest';
import { lightMotion, lightPhase } from './preview';

const top = { x: 200, y: 0, w: 28, h: 28, idx: 2 };
const bottom = { x: 200, y: 222, w: 28, h: 28, idx: 90 };
const left = { x: 0, y: 120, w: 28, h: 28, idx: 60 };
const right = { x: 596, y: 120, w: 28, h: 28, idx: 40 };

describe('lightMotion', () => {
  it('maps the modes to their preview motion', () => {
    expect(lightMotion(1)).toBe('none');
    expect(lightMotion(10)).toBe('row');
    expect(lightMotion(11)).toBe('column');
    expect(lightMotion(12)).toBe('rotate');
    expect(lightMotion(15)).toBe('radial');
    expect(lightMotion(4)).toBe('twinkle');
    expect(lightMotion(6)).toBe('hue');
    expect(lightMotion(20)).toBe('none');
  });
});

describe('lightPhase', () => {
  it('travels down when the direction is down', () => {
    const topPhase = lightPhase('row', 10, 3, top);
    const bottomPhase = lightPhase('row', 10, 3, bottom);

    expect(bottomPhase).toBeLessThan(topPhase);
  });

  it('travels up when the direction is up', () => {
    const topPhase = lightPhase('row', 10, 2, top);
    const bottomPhase = lightPhase('row', 10, 2, bottom);

    expect(topPhase).toBeLessThan(bottomPhase);
  });

  it('keeps the fixed direction of Falling and Launch', () => {
    expect(lightPhase('row', 5, 2, top)).toBeGreaterThan(lightPhase('row', 5, 2, bottom));
    expect(lightPhase('row', 14, 3, top)).toBeLessThan(lightPhase('row', 14, 3, bottom));
  });

  it('travels right and left for the column modes', () => {
    expect(lightPhase('column', 11, 0, left)).toBeGreaterThan(lightPhase('column', 11, 0, right));
    expect(lightPhase('column', 11, 1, left)).toBeLessThan(lightPhase('column', 11, 1, right));
  });

  it('reverses the rotation with the direction', () => {
    const rightPhase = lightPhase('rotate', 12, 0, top);
    const leftPhase = lightPhase('rotate', 12, 1, top);

    expect(leftPhase).toBeCloseTo(1 - rightPhase, 6);
  });

  it('grows outward for the radial modes', () => {
    const center = { x: 298, y: 111, w: 28, h: 28, idx: 50 };
    const corner = { x: 0, y: 0, w: 28, h: 28, idx: 1 };

    expect(lightPhase('radial', 15, 0, corner)).toBeGreaterThan(
      lightPhase('radial', 15, 0, center),
    );
  });
});
