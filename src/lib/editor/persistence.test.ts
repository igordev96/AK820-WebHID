import { describe, expect, it } from 'vitest';
import {
  FN_STORE,
  LAYERS_STORE,
  TOP_STORE,
  loadLayers,
  saveLayers,
  type StorageLike,
} from './persistence';
import { createInitialState, editorReducer } from './state';
import type { EditorState } from './types';

class FakeStorage implements StorageLike {
  readonly data = new Map<string, string>();

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

const edit = (state: EditorState, idx: number, usage: number, media = false) =>
  editorReducer(editorReducer(state, { type: 'select', idx }), {
    type: 'usage',
    usage,
    media,
  });

const onFn = (state: EditorState) => editorReducer(state, { type: 'layer', layer: 'fn' });

describe('loadLayers', () => {
  it('returns two empty layers when nothing is stored', () => {
    const layers = loadLayers(new FakeStorage());

    expect(layers.top.draft.size).toBe(0);
    expect(layers.top.applied.size).toBe(0);
    expect(layers.fn.draft.size).toBe(0);
    expect(layers.fn.applied.size).toBe(0);
  });

  it('reads both layers, with the draft and the applied table apart', () => {
    const storage = new FakeStorage();
    storage.setItem(
      LAYERS_STORE,
      JSON.stringify({
        version: 1,
        top: { draft: [[55, 4]], applied: [[55, 5, 1]] },
        fn: { draft: [[2, 0xe2, 1]], applied: [] },
      }),
    );

    const layers = loadLayers(storage);

    expect(layers.top.draft.get(55)).toEqual({ usage: 4, media: false });
    expect(layers.top.applied.get(55)).toEqual({ usage: 5, media: true });
    expect(layers.fn.draft.get(2)).toEqual({ usage: 0xe2, media: true });
    expect(layers.fn.applied.size).toBe(0);
  });

  it('drops rows for keys this board does not have', () => {
    const storage = new FakeStorage();
    storage.setItem(
      LAYERS_STORE,
      JSON.stringify({
        top: {
          draft: [
            [0, 4],
            [9999, 4],
          ],
        },
        fn: { draft: [] },
      }),
    );

    expect(loadLayers(storage).top.draft.size).toBe(0);
  });

  it('moves the old two keys into one object', () => {
    const storage = new FakeStorage();
    storage.setItem(
      FN_STORE,
      JSON.stringify([
        [2, 27],
        [55, 0xe2, 1],
      ]),
    );
    storage.setItem(TOP_STORE, JSON.stringify({ draft: [[55, 4]], applied: [[55, 4]] }));

    const layers = loadLayers(storage);

    expect(layers.fn.draft.get(2)).toEqual({ usage: 27, media: false });
    expect(layers.fn.applied.get(55)).toEqual({ usage: 0xe2, media: true });
    expect(layers.top.draft.get(55)).toEqual({ usage: 4, media: false });
    expect(layers.top.applied.get(55)).toEqual({ usage: 4, media: false });
  });

  it('falls back to the old keys when the new object is unreadable', () => {
    const storage = new FakeStorage();
    storage.setItem(LAYERS_STORE, '{oops');
    storage.setItem(FN_STORE, '[[2,27]]');

    expect(loadLayers(storage).fn.draft.get(2)).toEqual({ usage: 27, media: false });
  });

  it('ignores junk rows inside a layer', () => {
    const storage = new FakeStorage();
    storage.setItem(
      LAYERS_STORE,
      JSON.stringify({
        fn: {
          draft: [
            [3, 0],
            [4, 0x10000, 1],
            ['x', 4],
          ],
        },
      }),
    );

    expect(loadLayers(storage).fn.draft.size).toBe(0);
  });
});

describe('saveLayers', () => {
  it('writes both layers in one object, with a version', () => {
    const storage = new FakeStorage();
    const fn = edit(onFn(createInitialState()), 2, 0xe2, true);
    const onTop = editorReducer(fn, { type: 'layer', layer: 'top' });
    const withTop = edit(onTop, 55, 0x04);

    saveLayers(storage, withTop);

    expect(JSON.parse(storage.getItem(LAYERS_STORE) ?? 'null')).toEqual({
      version: 1,
      top: { draft: [[55, 4]], applied: [] },
      fn: { draft: [[2, 226, 1]], applied: [] },
    });
  });

  it('records the applied table only after an upload', () => {
    const storage = new FakeStorage();
    const edited = edit(createInitialState(), 55, 0x04);

    saveLayers(storage, edited);
    expect(JSON.parse(storage.getItem(LAYERS_STORE) ?? 'null').top.applied).toEqual([]);

    saveLayers(storage, editorReducer(edited, { type: 'uploaded' }));
    expect(JSON.parse(storage.getItem(LAYERS_STORE) ?? 'null').top.applied).toEqual([[55, 4]]);
  });

  it('keeps an Fn edit pending when it was never uploaded', () => {
    const storage = new FakeStorage();
    const edited = edit(onFn(createInitialState()), 2, 0xe2, true);

    saveLayers(storage, edited);
    const layers = loadLayers(storage);

    expect(layers.fn.draft.get(2)).toEqual({ usage: 0xe2, media: true });
    expect(layers.fn.applied.size).toBe(0);
  });

  it('clears the object when both layers match the keyboard again', () => {
    const storage = new FakeStorage();
    storage.setItem(LAYERS_STORE, JSON.stringify({ top: { draft: [[55, 4]] } }));

    saveLayers(storage, createInitialState());

    expect(storage.getItem(LAYERS_STORE)).toBeNull();
  });

  it('drops the two old keys once the new object is written', () => {
    const storage = new FakeStorage();
    storage.setItem(FN_STORE, '[[2,27]]');
    storage.setItem(TOP_STORE, '{"draft":[[55,4]]}');

    saveLayers(storage, createInitialState());

    expect(storage.getItem(FN_STORE)).toBeNull();
    expect(storage.getItem(TOP_STORE)).toBeNull();
  });

  it('round-trips both layers through the initial state', () => {
    const storage = new FakeStorage();
    const top = editorReducer(edit(createInitialState(), 55, 0x04), { type: 'uploaded' });
    const fn = edit(onFn(top), 2, 0xe2, true);

    saveLayers(storage, fn);
    const restored = createInitialState(loadLayers(storage));

    expect(restored.top.find((row) => row.idx === 55)).toMatchObject({
      usage: 0x04,
      applied: 0x04,
      factory: 0x39,
    });
    expect(restored.fn.find((row) => row.idx === 2)).toMatchObject({
      usage: 0xe2,
      media: true,
      applied: 0,
    });
  });
});
