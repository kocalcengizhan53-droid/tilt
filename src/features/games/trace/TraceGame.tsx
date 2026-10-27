import { Canvas, Circle, DashPathEffect, LinearGradient, Path, Rect, RoundedRect, Skia, vec, type SkPath, type SkPathBuilder } from '@shopify/react-native-skia';
import { useMemo, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Easing, runOnJS, useDerivedValue, useSharedValue, withTiming } from 'react-native-reanimated';

import type { GameProps } from '@/features/arcade/catalogue';
import { play } from '@/lib/audio';
import { haptic } from '@/lib/haptics';

/**
 * Trace.
 *
 * Draw a road from the pad to the goal with one finger. Let go, and the ball rides the ink.
 * The road has to miss the walls and fit the ink budget, which tightens with every level.
 *
 * The drawing is a Skia path that grows under the finger — a lineTo per move, on the JS
 * thread, which is what a drawing needs: each stroke is a commit anyway. The ride is the
 * opposite: the path is sampled once into a few hundred points, and a single shared value
 * eased from 0 to 1 picks the ball's place among them on the UI thread.
 */

const SAMPLES = 240;
const BALL = 9;

type Wall = { x: number; y: number; w: number; h: number };
type Level = { start: { x: number; y: number }; goal: { x: number; y: number }; walls: Wall[]; ink: number };

function makeLevel(n: number, width: number, height: number): Level {
  let s = n * 2654435761 + 97;
  const rand = () => ((s = (s * 48271) % 2147483647) / 2147483647);
  const start = { x: 40 + rand() * (width * 0.3), y: height - 70 };
  const goal = { x: width - 40 - rand() * (width * 0.3), y: 70 + rand() * 40 };
  const walls: Wall[] = [];
  const count = Math.min(5, 1 + Math.floor(n / 2));
  for (let i = 0; i < count; i++) {
    const w = 60 + rand() * width * 0.35;
    const h = 16 + rand() * 24;
    walls.push({ x: rand() * (width - w), y: 150 + (i + rand()) * ((height - 300) / count), w, h });
  }
  const straight = Math.hypot(goal.x - start.x, goal.y - start.y);
  return { start, goal, walls, ink: straight * Math.max(1.35, 2.4 - n * 0.12) };
}

const inWall = (x: number, y: number, walls: Wall[]) => walls.some((w) => x >= w.x && x <= w.x + w.w && y >= w.y && y <= w.y + w.h);

/** The path, as evenly spaced points along its length. */
function sample(path: SkPath, count: number): { xs: number[]; ys: number[]; length: number } {
  const it = Skia.ContourMeasureIter(path, false, 1);
  const contour = it.next();
  const xs: number[] = [];
  const ys: number[] = [];
  if (!contour) return { xs, ys, length: 0 };
  const length = contour.length();
  for (let i = 0; i < count; i++) {
    const [pos] = contour.getPosTan((i / (count - 1)) * length);
    xs.push(pos.x);
    ys.push(pos.y);
  }
  return { xs, ys, length };
}

export default function TraceGame({ width, height, onScore, onEnd, juice }: GameProps) {
  const [levelNo, setLevelNo] = useState(1);
  const level = useMemo(() => makeLevel(levelNo, width, height), [levelNo, width, height]);
  const [phase, setPhase] = useState<'draw' | 'ride' | 'won' | 'lost'>('draw');
  // Skia 2 builds paths through a builder; the built path is state, so each stroke is a commit.
  const builder = useRef<SkPathBuilder>(Skia.PathBuilder.Make());
  const [path, setPath] = useState<SkPath>(() => builder.current.build());
  const inkUsed = useRef(0);
  const last = useRef<{ x: number; y: number } | null>(null);
  const crashed = useRef(false);
  const score = useRef(0);

  const t = useSharedValue(0);
  const xs = useSharedValue<number[]>([]);
  const ys = useSharedValue<number[]>([]);

  const reset = () => {
    builder.current = Skia.PathBuilder.Make();
    setPath(builder.current.build());
    inkUsed.current = 0;
    last.current = null;
    crashed.current = false;
    t.value = 0;
    setPhase('draw');
  };

  const begin = (x: number, y: number) => {
    if (phase !== 'draw') return;
    // The road starts on the pad, wherever the finger landed.
    builder.current = Skia.PathBuilder.Make();
    builder.current.moveTo(level.start.x, level.start.y);
    last.current = { x: level.start.x, y: level.start.y };
    inkUsed.current = 0;
    crashed.current = false;
    extend(x, y);
  };

  const extend = (x: number, y: number) => {
    if (phase !== 'draw' || !last.current || crashed.current) return;
    const d = Math.hypot(x - last.current.x, y - last.current.y);
    if (d < 3) return;
    if (inkUsed.current + d > level.ink) return; // out of ink: the road stops here
    builder.current.lineTo(x, y);
    inkUsed.current += d;
    last.current = { x, y };
    if (inWall(x, y, level.walls)) {
      crashed.current = true;
      haptic.error();
      play('hit');
      juice.shake(6);
      juice.burst(x, y, '#ff5c7a', 8);
    }
    setPath(builder.current.build());
  };

  const finish = () => {
    if (phase !== 'draw' || !last.current) return;
    const nearGoal = Math.hypot(last.current.x - level.goal.x, last.current.y - level.goal.y) < 28;
    const s = sample(path, SAMPLES);
    if (s.length < 10) return;
    xs.value = s.xs;
    ys.value = s.ys;
    setPhase('ride');
    play('tap');
    const duration = Math.max(500, Math.min(2600, s.length * 2.4));
    const outcome = crashed.current ? 'lost' : nearGoal ? 'won' : 'lost';
    t.value = 0;
    t.value = withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }, (done) => {
      if (done) runOnJS(arrive)(outcome);
    });
  };

  const arrive = (outcome: 'won' | 'lost') => {
    if (outcome === 'won') {
      score.current += 1;
      onScore(score.current);
      haptic.success();
      play('win');
      juice.burst(level.goal.x, level.goal.y, '#9dff4f', 22);
      juice.text('CLEAR!', { x: level.goal.x, y: level.goal.y + 50, colour: '#9dff4f' });
      setPhase('won');
      setTimeout(() => {
        setLevelNo((n) => n + 1);
        reset();
      }, 700);
    } else {
      haptic.heavy();
      play('lose');
      juice.shake(12);
      juice.flash('#ff5c7a');
      setPhase('lost');
      setTimeout(() => onEnd(score.current), 700);
    }
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .runOnJS(true)
    .onBegin((e) => begin(e.x, e.y))
    .onChange((e) => extend(e.x, e.y))
    .onEnd(() => finish());

  const ballX = useDerivedValue(() => {
    const a = xs.value;
    if (a.length === 0) return level.start.x;
    const i = Math.min(a.length - 1, Math.floor(t.value * (a.length - 1)));
    return a[i];
  });
  const ballY = useDerivedValue(() => {
    const a = ys.value;
    if (a.length === 0) return level.start.y;
    const i = Math.min(a.length - 1, Math.floor(t.value * (a.length - 1)));
    return a[i];
  });

  const inkLeft = Math.max(0, 1 - inkUsed.current / level.ink);

  return (
    <GestureDetector gesture={pan}>
      <Canvas style={{ width, height }} accessibilityLabel="Trace: draw a road from the pad to the goal">
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['#0b0414', '#0d2214']} />
        </Rect>
        {/* Ink left, as a bar along the top. */}
        <RoundedRect x={16} y={10} width={width - 32} height={4} r={2} color="#1d2033" />
        <RoundedRect x={16} y={10} width={(width - 32) * inkLeft} height={4} r={2} color="#b9f26b" />

        {level.walls.map((w, i) => (
          <RoundedRect key={i} x={w.x} y={w.y} width={w.w} height={w.h} r={4} color="#ff7a6b" opacity={0.85} />
        ))}

        <Circle cx={level.goal.x} cy={level.goal.y} r={22} style="stroke" strokeWidth={2} color="#b9f26b">
          <DashPathEffect intervals={[5, 5]} />
        </Circle>
        <Circle cx={level.goal.x} cy={level.goal.y} r={6} color="#b9f26b" />
        <Circle cx={level.start.x} cy={level.start.y} r={16} color="#1d2033" />
        <Circle cx={level.start.x} cy={level.start.y} r={16} style="stroke" strokeWidth={1.5} color="#5ee7f0" />

        <Path path={path} style="stroke" strokeWidth={5} strokeCap="round" strokeJoin="round" color={crashed.current || phase === 'lost' ? '#ff7a6b' : '#e8eaf6'} opacity={0.9} />

        <Circle cx={ballX} cy={ballY} r={BALL} color={phase === 'lost' ? '#ff7a6b' : '#5ee7f0'} />
      </Canvas>
    </GestureDetector>
  );
}
