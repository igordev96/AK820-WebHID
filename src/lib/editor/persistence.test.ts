import { describe, expect, it } from 'vitest';
import {
  FN_STORE,
  TOP_STORE,
  loadFnOverrides,
  loadTopLayer,
  saveFnOverrides,
  saveTopLayer,
  type StorageLike,
} from './persistence';
import { createInitialState, editorReducer } from './state';

class FakeStorage implements StorageLike {
  private readonly data = new Map<string, string>();

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

describe('loadFnOverrides', () => {
  it('returns an empty map when nothing is stored', () => {
    expect(loadFnOverrides(new FakeStorage()).size).toBe(0);
  });

  it('reads keyboard and media rows', () => {
    const storage = new FakeStorage();
    storage.setItem(
      FN_STORE,
      JSON.stringify([
        [2, 27],
        [55, 0xe2, 1],
      ]),
    );

    const overrides = loadFnOverrides(storage);

    expect(overrides.get(2)).toEqual({ usage: 27, media: false });
    expect(overrides.get(55)).toEqual({ usage: 0xe2, media: true });
  });

  it('migrates old values above 0xE7 and keeps 0xAF as Fn', () => {
    const storage = new FakeStorage();
    storage.setItem(
      FN_STORE,
      JSON.stringify([
        [4, 0xe9],
        [5, 0xaf],
        [6, 0xe2],
      ]),
    );

    const overrides = loadFnOverrides(storage);

    expect(overrides.get(4)).toEqual({ usage: 0xe9, media: true });
    expect(overrides.get(5)).toEqual({ usage: 0xaf, media: false });
    expect(overrides.get(6)).toEqual({ usage: 0xe2, media: false });
  });

  it('ignores invalid rows', () => {
    const storage = new FakeStorage();
    storage.setItem(
      FN_STORE,
      JSON.stringify([
        [0, 0],
        [8, 0x10000, 1],
        [9, 0x10000],
        [10, 0x10000],
        ['x', 4],
      ]),
    );

    expect(loadFnOverrides(storage).size).toBe(0);
  });

  it('returns an empty map for corrupt JSON', () => {
    const storage = new FakeStorage();
    storage.setItem(FN_STORE, '{not json');

    expect(loadFnOverrides(storage).size).toBe(0);
  });

  it('returns an empty map for a non-array JSON value', () => {
    const storage = new FakeStorage();
    storage.setItem(FN_STORE, JSON.stringify({ a: 1 }));

    expect(loadFnOverrides(storage).size).toBe(0);
  });
});

describe('saveFnOverrides', () => {
  it('writes keyboard rows as pairs and media rows with a flag', () => {
    const storage = new FakeStorage();
    const state = createInitialState(
      new Map([
        [2, { usage: 0xe2, media: true }],
        [55, { usage: 0x1b, media: false }],
      ]),
    );

    saveFnOverrides(storage, state.fn);

    expect(JSON.parse(storage.getItem(FN_STORE) ?? 'null')).toEqual([
      [2, 226, 1],
      [55, 27],
    ]);
  });

  it('removes the key when there are no overrides', () => {
    const storage = new FakeStorage();
    storage.setItem(FN_STORE, '[[2,27]]');

    saveFnOverrides(storage, createInitialState().fn);

    expect(storage.getItem(FN_STORE)).toBeNull();
  });

  it('round-trips through load and createInitialState', () => {
    const storage = new FakeStorage();
    const source = createInitialState(new Map([[55, { usage: 0xe2, media: true }]]));
    saveFnOverrides(storage, source.fn);

    const state = createInitialState(loadFnOverrides(storage));
    const caps = state.fn.find((row) => row.idx === 55);

    expect(caps).toMatchObject({
      usage: 0xe2,
      media: true,
      applied: 0xe2,
      appliedMedia: true,
    });
  });
});

describe('loadTopLayer', () => {
  it('returns empty maps when nothing is stored', () => {
    const layer = loadTopLayer(new FakeStorage());

    expect(layer.draft.size).toBe(0);
    expect(layer.applied.size).toBe(0);
  });

  it('reads the draft and the applied table apart', () => {
    const storage = new FakeStorage();
    storage.setItem(TOP_STORE, JSON.stringify({ draft: [[55, 4]], applied: [[55, 5, 1]] }));

    const layer = loadTopLayer(storage);

    expect(layer.draft.get(55)).toEqual({ usage: 4, media: false });
    expect(layer.applied.get(55)).toEqual({ usage: 5, media: true });
  });

  it('drops rows for keys this board does not have', () => {
    const storage = new FakeStorage();
    storage.setItem(
      TOP_STORE,
      JSON.stringify({
        draft: [
          [0, 4],
          [9999, 4],
        ],
      }),
    );

    expect(loadTopLayer(storage).draft.size).toBe(0);
  });

  it('survives corrupt or unexpected stored text', () => {
    const storage = new FakeStorage();
    storage.setItem(TOP_STORE, '{oops');

    expect(loadTopLayer(storage).draft.size).toBe(0);

    storage.setItem(TOP_STORE, JSON.stringify([1, 2, 3]));

    expect(loadTopLayer(storage).applied.size).toBe(0);
  });
});

describe('saveTopLayer', () => {
  const selectRow = (state: ReturnType<typeof createInitialState>) =>
    editorReducer(state, { type: 'select', idx: 55 });

  it('keeps a pending edit and remembers it was not applied', () => {
    const storage = new FakeStorage();
    const edited = editorReducer(selectRow(createInitialState()), {
      type: 'usage',
      usage: 0x04,
      media: false,
    });

    saveTopLayer(storage, edited.top);

    expect(JSON.parse(storage.getItem(TOP_STORE) ?? 'null')).toEqual({
      draft: [[55, 4]],
      applied: [],
    });
  });

  it('records an applied key only after the upload', () => {
    const storage = new FakeStorage();
    const edited = editorReducer(selectRow(createInitialState()), {
      type: 'usage',
      usage: 0x04,
      media: false,
    });
    const uploaded = editorReducer(edited, { type: 'uploaded' });

    saveTopLayer(storage, uploaded.top);

    expect(JSON.parse(storage.getItem(TOP_STORE) ?? 'null')).toEqual({
      draft: [[55, 4]],
      applied: [[55, 4]],
    });
  });

  it('clears the key when the board matches the factory again', () => {
    const storage = new FakeStorage();
    storage.setItem(TOP_STORE, JSON.stringify({ draft: [[55, 4]], applied: [[55, 4]] }));

    saveTopLayer(storage, createInitialState().top);

    expect(storage.getItem(TOP_STORE)).toBeNull();
  });

  it('round-trips a pending change through the initial state', () => {
    const storage = new FakeStorage();
    const edited = editorReducer(selectRow(createInitialState()), {
      type: 'usage',
      usage: 0x04,
      media: false,
    });
    saveTopLayer(storage, editorReducer(edited, { type: 'uploaded' }).top);

    const restored = createInitialState(new Map(), loadTopLayer(storage));
    const caps = restored.top.find((row) => row.idx === 55);

    expect(caps).toMatchObject({ usage: 0x04, applied: 0x04, factory: 0x39 });
  });
});
