import { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { FadeOut, LinearTransition, ZoomIn } from 'react-native-reanimated';

import type { GameProps } from '@/features/arcade/catalogue';
import { play } from '@/lib/audio';
import { haptic } from '@/lib/haptics';
import { canMove, emptyBoard, highest, move, spawn, SIZE, type Board, type Dir, type Tile } from './logic';

/**
 * Slide.
 *
 * Tiles are views, absolutely positioned from their row and column, and a layout transition
 * carries each one from where it was to where it went: because every tile keeps its identity
 * through a move, the screen never has to guess what travelled where. A merge's two sources
 * are kept on screen for one transition, slid to the meeting point, then dropped — the new
 * tile pops in over them.
 */

const GAP = 8;
const COLOURS: Record<number, string> = {
  2: '#3b3f55',
  4: '#4a4f6a',
  8: '#f6c453',
  16: '#f4a43a',
  32: '#ef7d2e',
  64: '#ea5a2a',
  128: '#ffd166',
  256: '#ffc43a',
  512: '#ffb703',
  1024: '#fb8500',
  2048: '#ff6ec7',
};

export default function SlideGame({ width, height, onScore, onEnd }: GameProps) {
  const size = Math.min(width, height) - 32;
  const cell = (size - GAP * (SIZE + 1)) / SIZE;
  const [board, setBoard] = useState<Board>(() => spawn(spawn(emptyBoard())));
  const [ghosts, setGhosts] = useState<Tile[]>([]);
  const [born, setBorn] = useState<Set<number>>(new Set());
  const score = useRef(0);
  const over = useRef(false);
  const ghostTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const swipe = (dir: Dir) => {
    if (over.current) return;
    const m = move(board, dir);
    if (!m.moved) return;
    score.current += m.gained;
    onScore(score.current);
    if (m.gained) {
      haptic.light();
      play('merge');
    } else {
      play('tick');
    }
    const next = spawn(m.board);
    setBoard(next);
    setBorn(new Set(m.born));
    setGhosts(m.ghosts);
    if (ghostTimer.current) clearTimeout(ghostTimer.current);
    ghostTimer.current = setTimeout(() => setGhosts([]), 140);

    if (highest(next) === 2048) {
      haptic.success();
      play('win');
    }
    if (!canMove(next)) {
      over.current = true;
      setTimeout(() => onEnd(score.current), 500);
    }
  };

  const pan = Gesture.Pan()
    .minDistance(12)
    .onEnd((e) => {
      const ax = Math.abs(e.translationX);
      const ay = Math.abs(e.translationY);
      if (Math.max(ax, ay) < 12) return;
      const dir: Dir = ax > ay ? (e.translationX > 0 ? 'right' : 'left') : e.translationY > 0 ? 'down' : 'up';
      swipe(dir);
    })
    .runOnJS(true);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const keys: Record<string, Dir> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
    const onKey = (e: KeyboardEvent) => {
      const dir = keys[e.key];
      if (dir) {
        e.preventDefault();
        swipe(dir);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const pos = (t: Tile) => ({ left: GAP + t.c * (cell + GAP), top: GAP + t.r * (cell + GAP) });

  return (
    <GestureDetector gesture={pan}>
      <View className="flex-1 items-center justify-center" accessibilityLabel="Slide: swipe to merge tiles">
        <View style={{ width: size, height: size }} className="rounded-2xl bg-card">
          {Array.from({ length: SIZE * SIZE }, (_, i) => (
            <View
              key={i}
              style={{
                position: 'absolute',
                width: cell,
                height: cell,
                left: GAP + (i % SIZE) * (cell + GAP),
                top: GAP + Math.floor(i / SIZE) * (cell + GAP),
                borderRadius: 10,
                backgroundColor: '#1d2033',
              }}
            />
          ))}
          {ghosts.map((t) => (
            <Animated.View
              key={`g${t.id}`}
              layout={LinearTransition.duration(120)}
              exiting={FadeOut.duration(80)}
              style={[tileStyle(t, cell), pos(t)]}
            >
              <Text style={labelStyle(t.v, cell)}>{t.v}</Text>
            </Animated.View>
          ))}
          {board.tiles.map((t) => (
            <Animated.View
              key={t.id}
              layout={LinearTransition.duration(120)}
              entering={born.has(t.id) ? ZoomIn.duration(160).delay(100) : ZoomIn.duration(160)}
              style={[tileStyle(t, cell), pos(t), born.has(t.id) ? { zIndex: 2 } : null]}
            >
              <Text style={labelStyle(t.v, cell)}>{t.v}</Text>
            </Animated.View>
          ))}
        </View>
      </View>
    </GestureDetector>
  );
}

const tileStyle = (t: Tile, cell: number) => ({
  position: 'absolute' as const,
  width: cell,
  height: cell,
  borderRadius: 10,
  alignItems: 'center' as const,
  justifyContent: 'center' as const,
  backgroundColor: COLOURS[t.v] ?? '#ff6ec7',
});

const labelStyle = (v: number, cell: number) => ({
  fontFamily: 'monospace',
  fontWeight: '800' as const,
  fontSize: v >= 1024 ? cell * 0.3 : v >= 128 ? cell * 0.36 : cell * 0.42,
  color: v <= 4 ? '#e8eaf6' : '#141729',
});
