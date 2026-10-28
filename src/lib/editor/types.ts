import type { FactoryKey } from '@/lib/keymap';

export type Layer = 'top' | 'fn';

export type FnOverride = {
  readonly usage: number;
  readonly media: boolean;
};

export type EditorRow = Omit<FactoryKey, 'usage'> & {
  readonly usage: number;
  readonly media: boolean;
  readonly factory: number;
  readonly factoryMedia: boolean;
  readonly applied: number;
  readonly appliedMedia: boolean;
};

export type EditorState = {
  readonly top: readonly EditorRow[];
  readonly fn: readonly EditorRow[];
  readonly layer: Layer;
  readonly selected: number | null;
};

export type EditorStats = {
  used: number;
  ignored: number;
  invalid: number;
  zeroed: number;
  blocked: number;
};

export type UsageErrorCode =
  | 'no-selection'
  | 'locked'
  | 'not-integer'
  | 'range'
  | 'keyboard-high'
  | 'top-zero';

export type UsageValidation =
  | { readonly ok: true }
  | { readonly ok: false; readonly code: UsageErrorCode; readonly message: string };
