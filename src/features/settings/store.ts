import {
  DEFAULT_SETTINGS,
  SETTINGS_STORE,
  readSettings,
  writeSettings,
  type Settings,
} from '@/lib/settings';
import type { StorageLike } from '@/lib/editor';

/** How long a change waits before it reaches localStorage. */
const SAVE_DELAY_MS = 200;

export type SettingsStore = {
  get(): Settings;
  set(patch: Partial<Settings>): void;
  reset(): void;
  subscribe(listener: () => void): () => void;
  flush(): void;
};

/**
 * Holds the settings in memory and mirrors them into localStorage after a
 * short pause, so dragging a slider does not write on every frame. The store
 * is deliberately framework-free: React reads it through useSettings.
 */
export function createSettingsStore(storage: StorageLike | null): SettingsStore {
  const read = (): string | null => {
    try {
      return storage?.getItem(SETTINGS_STORE) ?? null;
    } catch {
      return null;
    }
  };

  let current = readSettings(read());
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let dirty = false;

  const write = () => {
    timer = null;
    dirty = false;
    if (!storage) return;
    try {
      storage.setItem(SETTINGS_STORE, writeSettings(current));
    } catch {
      // Private mode or a full quota: the app still works for this visit.
    }
  };

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(write, SAVE_DELAY_MS);
  };

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    get: () => current,
    set: (patch) => {
      current = { ...current, ...patch };
      dirty = true;
      notify();
      schedule();
    },
    reset: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      current = DEFAULT_SETTINGS;
      dirty = false;
      try {
        storage?.removeItem(SETTINGS_STORE);
      } catch {
        // Nothing to remove.
      }
      notify();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    flush: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (dirty) write();
    },
  };
}
