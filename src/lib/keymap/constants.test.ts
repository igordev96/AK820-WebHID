import { describe, expect, it } from 'vitest';
import { FN_LOCKED, MAX_KEY_INDEX, SLOT_MAGIC_AT, TABLE_SIZE } from './constants';
import { FACTORY_KEYS } from './factoryKeys';

describe('keymap constants', () => {
  it('uses the 576-byte table and the AA 55 trailer', () => {
    expect(TABLE_SIZE).toBe(576);
    expect(SLOT_MAGIC_AT).toBe(574);
    expect(MAX_KEY_INDEX).toBe(142);
  });

  it('locks exactly the six fnlayer_disable keys', () => {
    expect([...FN_LOCKED].toSorted((a, b) => a - b)).toEqual([1, 67, 92, 96, 103, 117]);
  });

  it('has 81 factory keys with unique indices', () => {
    expect(FACTORY_KEYS).toHaveLength(81);
    expect(new Set(FACTORY_KEYS.map((key) => key.idx)).size).toBe(81);
  });
});
