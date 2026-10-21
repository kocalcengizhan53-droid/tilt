import { Platform } from 'react-native';

/**
 * A tiny key-value store the whole app shares.
 *
 * SQLite's kv-store on a device; localStorage in a browser, where expo-sqlite would need its
 * own worker and WebAssembly for a handful of strings. Both sides are synchronous, which is
 * what a high-score table read at startup wants.
 */
type Store = {
  get(key: string): string | null;
  set(key: string, value: string): void;
};

function nativeStore(): Store {
  // Required lazily so the web bundle never evaluates expo-sqlite.
  const Storage = require('expo-sqlite/kv-store').default as {
    getItemSync(key: string): string | null;
    setItemSync(key: string, value: string): void;
  };
  return {
    get: (key) => Storage.getItemSync(key),
    set: (key, value) => Storage.setItemSync(key, value),
  };
}

function webStore(): Store {
  return {
    get: (key) => {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    set: (key, value) => {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        /* private mode, quota: the game still plays */
      }
    },
  };
}

export const storage: Store = Platform.OS === 'web' ? webStore() : nativeStore();

export function readJson<T>(key: string, fallback: T): T {
  const raw = storage.get(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  storage.set(key, JSON.stringify(value));
}
