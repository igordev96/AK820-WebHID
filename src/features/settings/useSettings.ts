import { useSyncExternalStore } from 'react';
import type { Settings } from '@/lib/settings';
import type { StorageLike } from '@/lib/editor';
import { createSettingsStore } from './store';

const browserStorage = (): StorageLike | null => {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
};

const store = createSettingsStore(browserStorage());

if (typeof window !== 'undefined') {
  // A tab can be closed before the save timer fires.
  window.addEventListener('pagehide', () => store.flush());
}

/**
 * Reads one slice of the settings. Select a stored value, not a new object:
 * useSyncExternalStore compares the result by reference.
 */
export function useSettings<T>(select: (settings: Settings) => T): T {
  return useSyncExternalStore(store.subscribe, () => select(store.get()));
}

export function updateSettings(patch: Partial<Settings>) {
  store.set(patch);
}

/** Drops the stored settings. Tests call it between cases. */
export function resetSettings() {
  store.reset();
}
