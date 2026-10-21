import type { ComponentType } from 'react';

/**
 * The machines on the wall.
 *
 * Each game is a small, complete thing with one idea and one technique, and the catalogue is
 * the only place that knows all of them: the cabinet draws its cards from here, the play
 * route loads a game from here, the score table names them from here.
 */
export type GameId = 'stack' | 'orbit' | 'breakout' | 'slide' | 'trace' | 'simon';

/** What every game gets from the shell, and the one thing it has to give back. */
export type GameProps = {
  /** Report the running score; the HUD shows it. */
  onScore: (score: number) => void;
  /** The run is over. The shell records it and offers another. */
  onEnd: (score: number) => void;
  /** A new run was requested: reset and go. Changes on every "play again". */
  run: number;
  /** Width and height the game may draw in, in points. */
  width: number;
  height: number;
};

export type GameMeta = {
  id: GameId;
  title: string;
  tagline: string;
  /** How it is played, in one line, shown before the first run. */
  howTo: string;
  /** The technique it exists to show. */
  technique: string;
  /** A Uniwind colour class fragment: `neon-cyan` → `bg-neon-cyan`, `text-neon-cyan`. */
  colour: 'neon-cyan' | 'neon-magenta' | 'neon-lime' | 'neon-amber' | 'neon-violet' | 'neon-coral';
  /** The same colour as a hex, for canvases that cannot read a class. */
  hex: string;
  load: () => Promise<{ default: ComponentType<GameProps> }>;
};

export const GAMES: readonly GameMeta[] = [
  {
    id: 'stack',
    title: 'Stack',
    tagline: 'Drop the block. Keep what lands.',
    howTo: 'Tap when the sliding block lines up. Overhang is cut away; a perfect drop grows it back.',
    technique: 'Skia canvas · camera that climbs · colour that drifts with height',
    colour: 'neon-cyan',
    hex: '#5ee7f0',
    load: () => import('@/features/games/stack/StackGame'),
  },
  {
    id: 'orbit',
    title: 'Orbit',
    tagline: 'Let go at the right moment.',
    howTo: 'Hold to orbit the planet, release to fly straight. Catch the next one. Miss, and you drift.',
    technique: 'UI-thread physics in a worklet · particle trail · shader starfield',
    colour: 'neon-violet',
    hex: '#b58cff',
    load: () => import('@/features/games/orbit/OrbitGame'),
  },
  {
    id: 'breakout',
    title: 'Breakout',
    tagline: 'The oldest idea, drawn properly.',
    howTo: 'Drag to move the paddle. Clear the wall. The ball gets quicker the longer it lives.',
    technique: 'Pan gesture → shared value → Skia · collision bursts · screen shake',
    colour: 'neon-coral',
    hex: '#ff7a6b',
    load: () => import('@/features/games/breakout/BreakoutGame'),
  },
  {
    id: 'slide',
    title: 'Slide',
    tagline: 'Two and two make four.',
    howTo: 'Swipe in any direction. Equal tiles merge. Reach 2048 — or just beat your best.',
    technique: 'Fling gestures · layout animation · tiles that travel, not teleport',
    colour: 'neon-amber',
    hex: '#f6c453',
    load: () => import('@/features/games/slide/SlideGame'),
  },
  {
    id: 'trace',
    title: 'Trace',
    tagline: 'Draw the road, ride it.',
    howTo: 'Draw a path with your finger. Release and the ball rides it. Reach the goal without falling off.',
    technique: 'Skia path from touch · path measure · the ball follows the ink',
    colour: 'neon-lime',
    hex: '#b9f26b',
    load: () => import('@/features/games/trace/TraceGame'),
  },
  {
    id: 'simon',
    title: 'Simon',
    tagline: 'Watch. Listen. Repeat.',
    howTo: 'Four pads light up in a sequence. Play it back. Each round adds one.',
    technique: 'Synthesised tones · haptics on every pad · a sequence that grows',
    colour: 'neon-magenta',
    hex: '#ff6ec7',
    load: () => import('@/features/games/simon/SimonGame'),
  },
];

export const gameById = (id: string) => GAMES.find((g) => g.id === id);
