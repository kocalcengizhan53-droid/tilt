import { Canvas, Circle, Group, LinearGradient, Rect, RoundedRect, vec } from '@shopify/react-native-skia';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS, useDerivedValue, useFrameCallback, useSharedValue } from 'react-native-reanimated';

import type { GameProps } from '@/features/arcade/catalogue';
import { play } from '@/lib/audio';
import { haptic } from '@/lib/haptics';
import { hitSide, paddleBounce, pointsFor, speedFor, wall, type Brick } from './logic';

/**
 * Breakout.
 *
 * The paddle is a pan gesture writing straight to a shared value; the ball is integrated in a
 * frame callback; both are read by the canvas without a render in between. Bricks are the one
 * thing React owns, because they change rarely and the wall has to re-draw when one goes —
 * the worklet marks a brick dead in its own copy the instant the ball touches it, so it can
 * never score twice, and tells React afterwards.
 */

const ROW_COLOURS = ['#ff6ec7', '#ff7a6b', '#f6c453', '#b9f26b', '#5ee7f0', '#b58cff'];
const PARTICLES = 28;
const LIVES = 3;

/** Spark colours by brick row, matching the wall's bands. */
const BRICK_SPARK = ['#ff4fd8', '#ff5c7a', '#ffd23f', '#9dff4f', '#22e3ff'];

export default function BreakoutGame({ width, height, onScore, onEnd, juice }: GameProps) {
  const r = 7;
  const paddleW = Math.round(width * 0.26);
  const paddleY = height - 48;
  const initial = useMemo(() => wall(width, 72), [width]);
  const [bricks, setBricks] = useState<Brick[]>(initial);
  const [lives, setLives] = useState(LIVES);
  const [level, setLevel] = useState(1);
  const score = useRef(0);
  const ended = useRef(false);

  // UI-thread state.
  const paddleX = useSharedValue((width - paddleW) / 2);
  const bx = useSharedValue(width / 2);
  const by = useSharedValue(paddleY - r - 2);
  const vx = useSharedValue(0);
  const vy = useSharedValue(0);
  const served = useSharedValue(false);
  const alive = useSharedValue(initial.map(() => 1));
  const bricksRef = useSharedValue(initial);
  const levelSv = useSharedValue(1);
  const gone = useSharedValue(0);
  const shake = useSharedValue(0);
  // Particles: x, y, vx, vy, life — five numbers each, one flat array.
  const particles = useSharedValue(new Array(PARTICLES * 5).fill(0));

  const onBrick = (index: number, x: number, y: number) => {
    const brick = bricks[index];
    if (!brick) return;
    score.current += pointsFor(brick.row);
    onScore(score.current);
    haptic.light();
    play('hit');
    const left = bricks.filter((_, i) => i !== index);
    setBricks(left);
    juice.burst(x, y, BRICK_SPARK[brick.row % BRICK_SPARK.length], 10);
    juice.shake(2.5);
    if (left.length === 0) nextLevel();
  };

  const nextLevel = () => {
    const next = level + 1;
    setLevel(next);
    levelSv.value = next;
    const fresh = wall(width, 72);
    setBricks(fresh);
    bricksRef.value = fresh;
    alive.value = fresh.map(() => 1);
    gone.value = 0;
    served.value = false;
    bx.value = width / 2;
    by.value = paddleY - r - 2;
    haptic.success();
    play('win');
    juice.text('WALL CLEARED', { big: true, colour: '#ffd23f' });
    juice.flash('#ffd23f');
  };

  const loseLife = () => {
    const left = lives - 1;
    setLives(left);
    haptic.heavy();
    play('lose');
    juice.shake(14);
    juice.flash('#ff5c7a');
    if (left > 0) juice.text(left === 1 ? 'LAST BALL' : `${left} BALLS LEFT`, { colour: '#ff5c7a' });
    if (left <= 0) {
      ended.current = true;
      onEnd(score.current);
      return;
    }
    served.value = false;
    bx.value = width / 2;
    by.value = paddleY - r - 2;
    vx.value = 0;
    vy.value = 0;
  };

  useFrameCallback((info) => {
    const dt = Math.min(0.04, (info.timeSincePreviousFrame ?? 16) / 1000);
    shake.value *= 0.82;

    // Particles drift and fade whatever the ball is doing.
    particles.modify((p) => {
      for (let i = 0; i < PARTICLES; i++) {
        const o = i * 5;
        if (p[o + 4] <= 0) continue;
        p[o] += p[o + 2] * dt;
        p[o + 1] += p[o + 3] * dt;
        p[o + 3] += 900 * dt;
        p[o + 4] -= dt * 1.6;
      }
      return p;
    });

    if (!served.value) {
      bx.value = paddleX.value + paddleW / 2;
      return;
    }

    let x = bx.value + vx.value * dt;
    let y = by.value + vy.value * dt;

    if (x < r) {
      x = r;
      vx.value = Math.abs(vx.value);
    } else if (x > width - r) {
      x = width - r;
      vx.value = -Math.abs(vx.value);
    }
    if (y < r) {
      y = r;
      vy.value = Math.abs(vy.value);
    }

    // The paddle.
    if (vy.value > 0 && y + r >= paddleY && y - r <= paddleY + 10 && x >= paddleX.value - r && x <= paddleX.value + paddleW + r) {
      const speed = speedFor(levelSv.value, gone.value, height);
      const v = paddleBounce(x, paddleX.value, paddleW, speed);
      vx.value = v.vx;
      vy.value = v.vy;
      y = paddleY - r;
      runOnJS(play)('bounce');
    }

    // The wall.
    const list = bricksRef.value;
    for (let i = 0; i < list.length; i++) {
      if (alive.value[i] !== 1) continue;
      const side = hitSide(x, y, r, list[i]);
      if (side === 'none') continue;
      alive.modify((a) => {
        a[i] = 0;
        return a;
      });
      gone.value += 1;
      if (side === 'top' || side === 'bottom') vy.value = side === 'top' ? -Math.abs(vy.value) : Math.abs(vy.value);
      else vx.value = side === 'left' ? -Math.abs(vx.value) : Math.abs(vx.value);
      shake.value = 5;
      // A burst from the brick.
      const b = list[i];
      particles.modify((p) => {
        let spawned = 0;
        for (let k = 0; k < PARTICLES && spawned < 8; k++) {
          const o = k * 5;
          if (p[o + 4] > 0) continue;
          const a = Math.random() * Math.PI * 2;
          const s = 120 + Math.random() * 220;
          p[o] = b.x + b.w / 2;
          p[o + 1] = b.y + b.h / 2;
          p[o + 2] = Math.cos(a) * s;
          p[o + 3] = Math.sin(a) * s - 120;
          p[o + 4] = 1;
          spawned += 1;
        }
        return p;
      });
      runOnJS(onBrick)(i, x, y);
      break;
    }

    if (y > height + r * 2) {
      runOnJS(loseLife)();
      return;
    }
    bx.value = x;
    by.value = y;
  });

  const serve = () => {
    if (served.value || ended.current) return;
    const speed = speedFor(levelSv.value, gone.value, height);
    const v = paddleBounce(bx.value, paddleX.value, paddleW, speed);
    vx.value = v.vx * 0.6;
    vy.value = v.vy;
    served.value = true;
    play('tap');
  };

  const pan = Gesture.Pan()
    .minDistance(0)
    .onBegin((e) => {
      paddleX.value = Math.max(0, Math.min(width - paddleW, e.x - paddleW / 2));
    })
    .onChange((e) => {
      paddleX.value = Math.max(0, Math.min(width - paddleW, e.x - paddleW / 2));
    })
    .onEnd(() => {
      runOnJS(serve)();
    });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') paddleX.value = Math.max(0, paddleX.value - 28);
      if (e.key === 'ArrowRight') paddleX.value = Math.min(width - paddleW, paddleX.value + 28);
      if (e.code === 'Space') serve();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // Keep the worklet's brick list in step with React's whenever a level re-spawns the wall.
  useEffect(() => {
    bricksRef.value = bricks.length === initial.length ? bricks : bricksRef.value;
  }, [bricks, initial.length, bricksRef]);

  const shakeTransform = useDerivedValue(() => [
    { translateX: (Math.random() - 0.5) * shake.value },
    { translateY: (Math.random() - 0.5) * shake.value },
  ]);
  const paddleXD = useDerivedValue(() => paddleX.value);
  const ballX = useDerivedValue(() => bx.value);
  const ballY = useDerivedValue(() => by.value);
  const liveIndex = useMemo(() => bricks.map((b) => initial.findIndex((o) => o.row === b.row && o.col === b.col)), [bricks, initial]);

  return (
    <GestureDetector gesture={pan}>
      <Canvas style={{ width, height }} accessibilityLabel="Breakout: drag to move the paddle">
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient start={vec(0, 0)} end={vec(0, height)} colors={['#0b0414', '#2a0a2e']} />
        </Rect>
        <Group transform={shakeTransform}>
          {bricks.map((b, i) => (
            <RoundedRect key={`${level}-${liveIndex[i]}`} x={b.x} y={b.y} width={b.w} height={b.h} r={3} color={ROW_COLOURS[b.row % ROW_COLOURS.length]} />
          ))}
          {Array.from({ length: PARTICLES }, (_, i) => (
            <Particle key={i} index={i} particles={particles} />
          ))}
          <RoundedRect x={paddleXD} y={paddleY} width={paddleW} height={10} r={5} color="#ff7a6b" />
          <Circle cx={ballX} cy={ballY} r={r} color="#f4f6fa" />
          {Array.from({ length: lives }, (_, i) => (
            <Circle key={i} cx={16 + i * 16} cy={height - 14} r={4} color="#ff7a6b" />
          ))}
        </Group>
      </Canvas>
    </GestureDetector>
  );
}

function Particle({ index, particles }: { index: number; particles: { value: number[] } }) {
  const cx = useDerivedValue(() => particles.value[index * 5]);
  const cy = useDerivedValue(() => particles.value[index * 5 + 1]);
  const opacity = useDerivedValue(() => Math.max(0, particles.value[index * 5 + 4]));
  const rad = useDerivedValue(() => 2 + Math.max(0, particles.value[index * 5 + 4]) * 2);
  return <Circle cx={cx} cy={cy} r={rad} color="#ffd166" opacity={opacity} />;
}
