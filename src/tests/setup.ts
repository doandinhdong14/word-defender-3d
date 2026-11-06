import '@testing-library/jest-dom';

// Polyfill fake IndexedDB for Dexie in JSDOM environment if needed
import 'fake-indexeddb/auto';

// Ensure localStorage & sessionStorage are available in test environment
function createStorageMock() {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] || null,
  };
}

if (typeof window !== 'undefined') {
  if (!window.localStorage || typeof window.localStorage.clear !== 'function') {
    Object.defineProperty(window, 'localStorage', { value: createStorageMock(), writable: true });
  }
  if (!window.sessionStorage || typeof window.sessionStorage.clear !== 'function') {
    Object.defineProperty(window, 'sessionStorage', { value: createStorageMock(), writable: true });
  }
}

