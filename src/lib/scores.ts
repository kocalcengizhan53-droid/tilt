import { create } from 'zustand';

import { readJson, writeJson } from '@/lib/storage';

/**
 * High scores. One best per game and the last few runs, kept on the device: there is no
 * account and no server, which is the point of an arcade in your pocket.
 */
export type Run = { game: string; score: number; at: number };

type Scores = {
  best: Record<string, number>;
  recent: Run[];
  /** Records a finished run and says whether it is a new best. */
  record(game: string, score: number): { best: number; isNew: boolean };
  reset(): void;
};

const KEY = 'tilt.scores';
const saved = readJson<{ best: Record<string, number>; recent: Run[] }>(KEY, { best: {}, recent: [] });

export const useScores = create<Scores>((set, get) => ({
  ...saved,
  record: (game, score) => {
    const previous = get().best[game] ?? 0;
    const isNew = score > previous;
    const best = { ...get().best, [game]: Math.max(previous, score) };
    const recent = [{ game, score, at: Date.now() }, ...get().recent].slice(0, 30);
    set({ best, recent });
    writeJson(KEY, { best, recent });
    return { best: best[game], isNew };
  },
  reset: () => {
    set({ best: {}, recent: [] });
    writeJson(KEY, { best: {}, recent: [] });
  },
}));
