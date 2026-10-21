import { create } from 'zustand';

import { readJson, writeJson } from '@/lib/storage';

/** What the player has switched on. Persisted, read once at startup. */
type Settings = {
  sound: boolean;
  haptics: boolean;
  setSound(on: boolean): void;
  setHaptics(on: boolean): void;
};

const KEY = 'tilt.settings';
const saved = readJson<{ sound: boolean; haptics: boolean }>(KEY, { sound: true, haptics: true });

export const useSettings = create<Settings>((set, get) => ({
  ...saved,
  setSound: (sound) => {
    set({ sound });
    writeJson(KEY, { sound, haptics: get().haptics });
  },
  setHaptics: (haptics) => {
    set({ haptics });
    writeJson(KEY, { sound: get().sound, haptics });
  },
}));
