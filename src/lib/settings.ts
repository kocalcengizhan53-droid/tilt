import { create } from 'zustand';

import { readJson, writeJson } from '@/lib/storage';

/** What the player has switched on. Persisted, read once at startup. */
type Saved = { sound: boolean; haptics: boolean; reduceMotion: boolean };
type Settings = Saved & {
  setSound(on: boolean): void;
  setHaptics(on: boolean): void;
  setReduceMotion(on: boolean): void;
};

const KEY = 'tilt.settings';
const saved: Saved = { sound: true, haptics: true, reduceMotion: false, ...readJson<Partial<Saved>>(KEY, {}) };

export const useSettings = create<Settings>((set, get) => {
  const save = (patch: Partial<Saved>) => {
    set(patch);
    const { sound, haptics, reduceMotion } = get();
    writeJson(KEY, { sound, haptics, reduceMotion });
  };
  return {
    ...saved,
    setSound: (sound) => save({ sound }),
    setHaptics: (haptics) => save({ haptics }),
    setReduceMotion: (reduceMotion) => save({ reduceMotion }),
  };
});
