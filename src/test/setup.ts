import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

Object.defineProperty(navigator, 'hid', {
  value: undefined,
  configurable: true,
});

afterEach(() => {
  cleanup();
  Object.defineProperty(navigator, 'hid', {
    value: undefined,
    configurable: true,
  });
  try {
    localStorage.clear();
  } catch {
    // Storage can be unavailable in a locked-down context.
  }
});
