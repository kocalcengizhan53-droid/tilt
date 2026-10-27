import { create } from 'zustand';

import { readJson, writeJson } from '@/lib/storage';

/**
 * The daily towers played, by day: one attempt each, the first result stands. On the device,
 * like every other score here.
 */
type Daily = {
  history: Record<string, number>;
  /** Records today's run; false if the day was already played. */
  record(day: string, score: number): boolean;
  reset(): void;
};

const KEY = 'tilt.daily';

export const useDaily = create<Daily>((set, get) => ({
  history: readJson<Record<string, number>>(KEY, {}),
  record: (day, score) => {
    if (day in get().history) return false;
    const history = { ...get().history, [day]: score };
    set({ history });
    writeJson(KEY, history);
    return true;
  },
  reset: () => {
    set({ history: {} });
    writeJson(KEY, {});
  },
}));
