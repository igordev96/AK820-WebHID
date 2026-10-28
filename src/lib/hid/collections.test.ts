import { describe, expect, it } from 'vitest';
import { findConfigCollection, flattenCollections } from './collections';

const config = { usagePage: 0xff13, usage: 0x0001 };
const keyboard = { usagePage: 0x0001, usage: 0x0006 };
const consumer = { usagePage: 0x000c, usage: 0x0001 };

describe('HID collections', () => {
  it('finds the config collection at any depth', () => {
    const child = { ...config };
    const nested = { ...keyboard, children: [{ ...consumer }, child] };
    const device = { collections: [nested, { ...consumer }] };

    expect(findConfigCollection(device)).toBe(child);
  });

  it('returns null when the config collection is absent', () => {
    expect(findConfigCollection({ collections: [keyboard, consumer] })).toBeNull();
  });

  it('flattens with depth', () => {
    const device = {
      collections: [{ ...keyboard, children: [{ ...consumer }] }, { ...config }],
    };

    expect(flattenCollections(device.collections).map(({ depth }) => depth)).toEqual([0, 1, 0]);
  });
});
