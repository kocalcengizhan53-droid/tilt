import BreakoutGame from '@/features/games/breakout/BreakoutGame';
import OrbitGame from '@/features/games/orbit/OrbitGame';
import SimonGame from '@/features/games/simon/SimonGame';
import SlideGame from '@/features/games/slide/SlideGame';
import StackGame from '@/features/games/stack/StackGame';
import TraceGame from '@/features/games/trace/TraceGame';

/**
 * All six machines in one module, loaded on demand as one chunk. Split six ways, each chunk
 * shared Skia, and the bundler hoisted the shared Skia code into the common chunk that ships
 * with the cabinet — a megabyte and a half the cabinet never runs. Together, Skia stays here.
 */
export const games = {
  stack: StackGame,
  orbit: OrbitGame,
  breakout: BreakoutGame,
  slide: SlideGame,
  trace: TraceGame,
  simon: SimonGame,
};
