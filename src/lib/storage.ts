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
  // eslint-disable-next-line @typescript-eslint/no-require-imports
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

/*
 * The web build is exported as static HTML rendered with nothing saved, so a browser that has
 * scores must first render exactly that and only then read them, or React rejects the page it
 * was handed (hydration error #418). A device has no exported HTML and reads at startup.
 */
export const readAfterHydration = Platform.OS === 'web';

/** What a store starts with: the saved value on a device, the default in a browser until hydrated. */
export function initialJson<T>(key: string, fallback: T): T {
  return readAfterHydration ? fallback : readJson(key, fallback);
}

/** Whether anything is saved under a key: a store with nothing saved need not re-render to say so. */
export const isSaved = (key: string) => storage.get(key) !== null;
