import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { resetSettings } from '@/features/settings/useSettings';

// jsdom has no ResizeObserver; Radix Select and Slider measure their content.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: ResizeObserverStub,
  configurable: true,
});

// jsdom has no pointer capture or scrolling; Radix Select uses both.
Object.defineProperties(Element.prototype, {
  hasPointerCapture: { value: () => false, configurable: true },
  setPointerCapture: { value: () => {}, configurable: true },
  releasePointerCapture: { value: () => {}, configurable: true },
  scrollIntoView: { value: () => {}, configurable: true },
});

Object.defineProperty(navigator, 'hid', {
  value: undefined,
  configurable: true,
});

afterEach(() => {
  cleanup();
  // The settings store is a module singleton; one test must not colour the next.
  resetSettings();
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
